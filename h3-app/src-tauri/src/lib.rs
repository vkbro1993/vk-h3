use std::sync::atomic::{AtomicU8, Ordering};

/// 0 = zh, 1 = en
static LANG: AtomicU8 = AtomicU8::new(0);

fn tr(zh: &str, en: &str) -> String {
    if LANG.load(Ordering::Relaxed) == 1 { en.to_string() } else { zh.to_string() }
}

use serde::Deserialize;
use std::io::Read;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};

#[derive(Deserialize)]
pub struct RefInput {
    kind: String,
    path: String,
    #[serde(default)]
    audio_path: Option<String>,
}

#[derive(Deserialize)]
pub struct GenParams {
    prompt: String,
    model_dir: String,
    output: String,
    width: u32,
    height: u32,
    #[serde(default)]
    render_width: Option<u32>,
    #[serde(default)]
    render_height: Option<u32>,
    #[serde(default)]
    seconds: Option<u32>,
    #[serde(default)]
    frames: Option<u32>,
    steps: u32,
    reuse: u32,
    layers: u32,
    core_reuse: u32,
    token_reduction: bool,
    ssd_streaming: bool,
    use_int8_row_fc2: bool,
    use_reference_rope: bool,
    use_slower_bf16_mlp: bool,
    use_slower_bf16_qkv: bool,
    use_slower_bf16_attention_output: bool,
    use_slower_row_major_attention_output: bool,
    use_slower_unfused_int8_inputs: bool,
    use_slower_unfused_qkv_rope: bool,
    use_slower_scalar_qkv_rms: bool,
    use_slower_uncached_int8_scales: bool,
    use_slower_dynamic_fc1_k: bool,
    use_slower_grouped_quantizer: bool,
    #[serde(default)]
    seed: Option<u64>,
    random_seed: bool,
    #[serde(default)]
    first_frame: Option<String>,
    #[serde(default)]
    last_frame: Option<String>,
    ref_image_size: String,
    #[serde(default)]
    references: Vec<RefInput>,
    #[serde(default)]
    frames_dir: Option<String>,
    show: bool,
    #[serde(default)]
    zoom: Option<u32>,
    profile: bool,
    #[serde(default)]
    auto_open: bool,
    #[serde(default)]
    output_dir: Option<String>,
}

/// 全局状态：h3 进程 PID + 上次输出路径
struct AppState {
    h3_pid: Arc<Mutex<Option<u32>>>,
    last_output: Arc<Mutex<Option<String>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            h3_pid: Arc::new(Mutex::new(None)),
            last_output: Arc::new(Mutex::new(None)),
        }
    }
}

fn random_u64() -> u64 {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let mut x = nanos as u64;
    if x == 0 {
        x = 0x9e37_9d97_9e37_9d97;
    }
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

fn output_dir() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 目录".to_string())?;
    let dir = std::path::Path::new(&home).join("vk-h3").join("output");
    std::fs::create_dir_all(&dir).map_err(|e| format!("{}: {e}", tr("创建输出目录失败", "failed to create output directory")))?;
    Ok(dir)
}

fn resolve_output(output: &str, custom_dir: Option<&str>) -> Result<std::path::PathBuf, String> {
    let p = std::path::Path::new(output);
    if p.is_absolute() {
        Ok(p.to_path_buf())
    } else {
        let dir = match custom_dir {
            Some(d) if !d.is_empty() => std::path::PathBuf::from(d),
            _ => output_dir()?,
        };
        std::fs::create_dir_all(&dir).map_err(|e| format!("{}: {e}", tr("创建输出目录失败", "failed to create output directory")))?;
        Ok(dir.join(output))
    }
}

fn build_args(p: &GenParams) -> Vec<String> {
    let mut a: Vec<String> = Vec::new();
    a.push("-d".into());
    a.push(p.model_dir.clone());
    a.push("-p".into());
    a.push(p.prompt.clone());
    a.push("-o".into());
    a.push(p.output.clone());
    a.push("--width".into());
    a.push(p.width.to_string());
    a.push("--height".into());
    a.push(p.height.to_string());
    if let Some(rw) = p.render_width {
        a.push("--render-width".into());
        a.push(rw.to_string());
    }
    if let Some(rh) = p.render_height {
        a.push("--render-height".into());
        a.push(rh.to_string());
    }
    if let Some(s) = p.seconds {
        a.push("--seconds".into());
        a.push(s.to_string());
    } else if let Some(f) = p.frames {
        a.push("--frames".into());
        a.push(f.to_string());
    }
    a.push("--steps".into());
    a.push(p.steps.to_string());
    a.push("--reuse".into());
    a.push(p.reuse.to_string());
    a.push("--layers".into());
    a.push(p.layers.to_string());
    a.push("--core-reuse".into());
    a.push(p.core_reuse.to_string());
    if p.token_reduction {
        a.push("--token-reduction".into());
    }
    if p.ssd_streaming {
        a.push("--ssd-streaming".into());
    }
    if p.use_int8_row_fc2 {
        a.push("--use-int8-row-fc2".into());
    }
    if p.use_reference_rope {
        a.push("--use-reference-rope".into());
    }
    if p.use_slower_bf16_mlp {
        a.push("--use-slower-bf16-mlp".into());
    }
    if p.use_slower_bf16_qkv {
        a.push("--use-slower-bf16-qkv".into());
    }
    if p.use_slower_bf16_attention_output {
        a.push("--use-slower-bf16-attention-output".into());
    }
    if p.use_slower_row_major_attention_output {
        a.push("--use-slower-row-major-attention-output".into());
    }
    if p.use_slower_unfused_int8_inputs {
        a.push("--use-slower-unfused-int8-inputs".into());
    }
    if p.use_slower_unfused_qkv_rope {
        a.push("--use-slower-unfused-qkv-rope".into());
    }
    if p.use_slower_scalar_qkv_rms {
        a.push("--use-slower-scalar-qkv-rms".into());
    }
    if p.use_slower_uncached_int8_scales {
        a.push("--use-slower-uncached-int8-scales".into());
    }
    if p.use_slower_dynamic_fc1_k {
        a.push("--use-slower-dynamic-fc1-k".into());
    }
    if p.use_slower_grouped_quantizer {
        a.push("--use-slower-grouped-quantizer".into());
    }
    if p.random_seed {
        a.push("--seed".into());
        a.push(random_u64().to_string());
    } else if let Some(seed) = p.seed {
        a.push("--seed".into());
        a.push(seed.to_string());
    }
    if let Some(f) = &p.first_frame {
        a.push("--first-frame".into());
        a.push(f.clone());
    }
    if let Some(l) = &p.last_frame {
        a.push("--last-frame".into());
        a.push(l.clone());
    }
    a.push("--ref-image-size".into());
    a.push(p.ref_image_size.clone());
    for r in &p.references {
        match r.kind.as_str() {
            "image" => {
                a.push("--ref-image".into());
                a.push(r.path.clone());
            }
            "video" => {
                a.push("--ref-video".into());
                a.push(r.path.clone());
            }
            "silent_video" => {
                a.push("--ref-silent-video".into());
                a.push(r.path.clone());
            }
            "video_audio" => {
                a.push("--ref-video-audio".into());
                a.push(r.path.clone());
                if let Some(ap) = &r.audio_path {
                    if !ap.is_empty() {
                        a.push(ap.clone());
                    }
                }
            }
            "audio" => {
                a.push("--ref-audio".into());
                a.push(r.path.clone());
            }
            _ => {}
        }
    }
    if let Some(fd) = &p.frames_dir {
        a.push("--frames-dir".into());
        a.push(fd.clone());
    }
    if p.show {
        a.push("--show".into());
    }
    if let Some(z) = p.zoom {
        a.push("--zoom".into());
        a.push(z.to_string());
    }
    if p.profile {
        a.push("--profile".into());
    }
    a
}

fn spawn_h3(app: &tauri::AppHandle, args: Vec<String>) -> Result<std::process::Child, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("{}: {e}", tr("无法定位资源目录", "failed to locate resource directory")))?;
    let h3_bin = resource_dir.join("h3");
    if !h3_bin.exists() {
        return Err(format!("{}: {}", tr("未找到 h3 引擎", "h3 engine not found"), h3_bin.display()));
    }
    let mut cmd = Command::new(&h3_bin);
    let bundled_ffmpeg = resource_dir.join("ffmpeg");
    let ffmpeg = if bundled_ffmpeg.exists() {
        bundled_ffmpeg.to_string_lossy().to_string()
    } else {
        // 动态查找 PATH 上的 ffmpeg，不硬编码路径
        match Command::new("which").arg("ffmpeg").output() {
            Ok(o) if o.status.success() => {
                String::from_utf8_lossy(&o.stdout).trim().to_string()
            }
            _ => "ffmpeg".to_string(),
        }
    };
    cmd.current_dir(&resource_dir)
        .env("H3_FFMPEG", ffmpeg)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    cmd.spawn().map_err(|e| format!("{}: {e}", tr("启动 h3 失败", "failed to start h3")))
}

/// 逐字节读取，按 \r 和 \n 都分行，实时转发进度（h3 的进度条用 \r 刷新）
fn pump_logs(app: &tauri::AppHandle, mut reader: impl Read + Send + 'static) {
    let mut buf: Vec<u8> = Vec::new();
    let mut chunk = [0u8; 8192];
    loop {
        match reader.read(&mut chunk) {
            Ok(0) => break,
            Ok(n) => {
                for &b in &chunk[..n] {
                    if b == b'\n' || b == b'\r' {
                        if !buf.is_empty() {
                            let line = String::from_utf8_lossy(&buf).trim().to_string();
                            if !line.is_empty() {
                                let _ = app.emit("h3-log", line);
                            }
                            buf.clear();
                        }
                    } else {
                        buf.push(b);
                    }
                }
            }
            Err(_) => break,
        }
    }
    if !buf.is_empty() {
        let line = String::from_utf8_lossy(&buf).trim().to_string();
        if !line.is_empty() {
            let _ = app.emit("h3-log", line);
        }
    }
}

fn stream_logs(
    app: &tauri::AppHandle,
    child: &mut std::process::Child,
) -> Result<std::process::ExitStatus, String> {
    let app2 = app.clone();
    let stdout = child.stdout.take().ok_or(tr("无法读取 stdout", "cannot read stdout"))?;
    std::thread::spawn(move || pump_logs(&app2, stdout));
    let app3 = app.clone();
    let stderr = child.stderr.take().ok_or(tr("无法读取 stderr", "cannot read stderr"))?;
    std::thread::spawn(move || pump_logs(&app3, stderr));
    child.wait().map_err(|e| format!("{}: {e}", tr("等待 h3 退出失败", "failed to wait for h3 exit")))
}

#[tauri::command]
async fn generate(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    params: GenParams,
) -> Result<String, String> {
    // 防重入：已有任务运行则拒绝
    {
        let pid = state.h3_pid.lock().map_err(|e| format!("{}: {e}", tr("锁错误", "lock error")))?;
        if pid.is_some() {
            return Err(tr("已有生成任务正在运行", "a generation task is already running").into());
        }
    }

    let h3_pid = state.h3_pid.clone();
    let last_output = state.last_output.clone();

    tauri::async_runtime::spawn_blocking(move || {
        // 校验 video_audio 参考必须有音频路径
        for r in &params.references {
            if r.kind == "video_audio" {
                match &r.audio_path {
                    Some(ap) if !ap.is_empty() => {}
                    _ => return Err(tr("视频+音频参考必须填写音频路径", "video+audio references require an audio path").into()),
                }
            }
        }

        let out_path = resolve_output(&params.output, params.output_dir.as_deref())?;
        let mut params = params;
        params.output = out_path.to_string_lossy().to_string();
        let args = build_args(&params);
        let mut child = spawn_h3(&app, args)?;

        // 存储 PID 供取消使用
        let pid = child.id();
        if let Ok(mut p) = h3_pid.lock() {
            *p = Some(pid);
        }

        let status = stream_logs(&app, &mut child)?;

        // 清除 PID
        if let Ok(mut p) = h3_pid.lock() {
            *p = None;
        }

        // 记录上次输出路径
        if let Ok(mut o) = last_output.lock() {
            *o = Some(params.output.clone());
        }

        // 自动打开视频
        if params.auto_open {
            let _ = Command::new("open").arg(&params.output).status();
        }

        if status.success() {
            Ok(format!("{}: {}", tr("生成完成", "Generation complete"), params.output))
        } else {
            match status.code() {
                None => Err(tr("h3 被中止（信号终止）", "h3 was interrupted (signal)").into()),
                Some(code) => Err(format!("{}: {}", tr("h3 退出码", "h3 exit code"), code)),
            }
        }
    })
    .await
    .map_err(|e| format!("{}: {e}", tr("后台任务异常", "background task error")))?
}

/// 取消正在运行的 h3 生成进程
#[tauri::command]
async fn stop_generate(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let pid = state
        .h3_pid
        .lock()
        .map_err(|e| format!("{}: {e}", tr("锁错误", "lock error")))?
        .take();
    if let Some(pid) = pid {
        let _ = Command::new("kill").arg(pid.to_string()).status();
        Ok(format!("{} (PID: {})", tr("已发送停止信号", "stop signal sent"), pid))
    } else {
        Ok(tr("没有正在运行的生成任务", "no generation task is running").into())
    }
}

/// 把上次生成的视频另存到用户选择的位置
#[tauri::command]
async fn save_video(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let last = state
        .last_output
        .lock()
        .map_err(|e| format!("{}: {e}", tr("锁错误", "lock error")))?
        .clone();
    let src = last.ok_or(tr("没有已生成的视频", "no generated video yet"))?;

    use tauri_plugin_dialog::DialogExt;
    let dest = app
        .dialog()
        .file()
        .add_filter(tr("MP4 视频", "MP4 video"), &["mp4"])
        .blocking_save_file();

    let dest_path = dest
        .and_then(|p| p.as_path().map(|p| p.to_string_lossy().to_string()))
        .ok_or(tr("未选择保存位置", "no save location chosen"))?;

    std::fs::copy(&src, &dest_path).map_err(|e| format!("{}: {e}", tr("复制失败", "copy failed")))?;
    Ok(format!("{}: {}", tr("已保存到", "saved to"), dest_path))
}

#[tauri::command]
async fn inspect(app: tauri::AppHandle, model_dir: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut child = spawn_h3(&app, vec!["-d".into(), model_dir, "--info".into()])?;
        let status = stream_logs(&app, &mut child)?;
        if status.success() {
            Ok(tr("检查完成", "Inspection complete").into())
        } else {
            Err(format!("{}: {:?}", tr("h3 --info 退出码", "h3 --info exit code"), status.code()))
        }
    })
    .await
    .map_err(|e| format!("{}: {e}", tr("后台任务异常", "background task error")))?
}

#[tauri::command]
async fn open_output(_app: tauri::AppHandle, output: String, custom_output_dir: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = resolve_output(&output, custom_output_dir.as_deref())?;
        let dir = if path.is_dir() {
            path.clone()
        } else {
            path.parent()
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| output_dir().unwrap_or_else(|_| std::path::PathBuf::from(".")))
        };
        std::fs::create_dir_all(&dir).map_err(|e| format!("{}: {e}", tr("创建输出目录失败", "failed to create output directory")))?;
        let status = Command::new("open")
            .arg(&dir)
            .status()
            .map_err(|e| format!("{}: {e}", tr("open 失败", "open failed")))?;
        if status.success() {
            Ok(format!("{}: {}", tr("已打开", "opened"), dir.display()))
        } else {
            Err(format!("{}: {:?}", tr("open 退出码", "open exit code"), status.code()))
        }
    })
    .await
    .map_err(|e| format!("{}: {e}", tr("后台任务异常", "background task error")))?
}

#[tauri::command]
async fn pick_file(
    app: tauri::AppHandle,
    pick_dir: bool,
    filter: Option<String>,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    tauri::async_runtime::spawn_blocking(move || {
        let dialog = app.dialog().file();
        if pick_dir {
            let picked = dialog.blocking_pick_folder();
            return Ok(picked
                .and_then(|p| p.as_path().map(|p| p.to_string_lossy().to_string()))
                .unwrap_or_default());
        }
        // 前端统一传英文 key（image/video/audio），显示名按当前语言
        let filters: [(&str, &str, &[&str]); 3] = [
            ("image", tr("图片", "Images").leak(), &["png", "jpg", "jpeg", "webp", "gif", "bmp", "heic", "tiff"]),
            ("video", tr("视频", "Videos").leak(), &["mp4", "mov", "mkv", "webm", "avi"]),
            ("audio", tr("音频", "Audio").leak(), &["mp3", "wav", "m4a", "aac", "flac", "ogg"]),
        ];
        let mut d = dialog;
        if let Some(f) = filter {
            if let Some((_, name, exts)) = filters.iter().find(|(k, _, _)| *k == f.as_str()) {
                d = d.add_filter(*name, exts);
            }
        }
        let picked = d.blocking_pick_file();
        Ok(picked
            .and_then(|p| p.as_path().map(|p| p.to_string_lossy().to_string()))
            .unwrap_or_default())
    })
    .await
    .map_err(|e| format!("选择文件失败: {e}"))?
}

fn models_dir() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 目录".to_string())?;
    let dir = std::path::Path::new(&home).join("vk-h3").join("models");
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建模型目录失败: {e}"))?;
    Ok(dir)
}

fn looks_like_model(p: &std::path::Path) -> bool {
    p.join("model_index.json").exists() || p.join("FL2VA").is_dir()
}

#[tauri::command]
fn detect_model(search_dir: Option<String>) -> String {
    // 用户指定目录优先
    if let Some(dir) = &search_dir {
        if !dir.is_empty() {
            let p = std::path::Path::new(dir);
            // 直接是模型目录
            if looks_like_model(p) {
                return p.to_string_lossy().to_string();
            }
            // 是父目录，扫描子目录
            if let Ok(rd) = std::fs::read_dir(p) {
                let mut found: Vec<String> = rd
                    .flatten()
                    .filter(|e| e.path().is_dir() && looks_like_model(&e.path()))
                    .map(|e| e.path().to_string_lossy().to_string())
                    .collect();
                if !found.is_empty() {
                    found.sort();
                    return found[0].clone();
                }
            }
            return String::new();
        }
    }
    // 回退到默认 ~/vk-h3/models/
    if let Ok(dir) = models_dir() {
        if let Ok(rd) = std::fs::read_dir(&dir) {
            let mut found: Vec<String> = rd
                .flatten()
                .filter(|e| e.path().is_dir() && looks_like_model(&e.path()))
                .map(|e| e.path().to_string_lossy().to_string())
                .collect();
            if !found.is_empty() {
                found.sort();
                return found[0].clone();
            }
        }
    }
    String::new()
}

#[tauri::command]
fn set_lang(lang: String) {
    LANG.store(if lang == "en" { 1 } else { 0 }, Ordering::Relaxed);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            generate,
            stop_generate,
            save_video,
            inspect,
            open_output,
            pick_file,
            detect_model,
            set_lang
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
