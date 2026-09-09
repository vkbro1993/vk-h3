# vk-h3 — h3.c 视频生成桌面 App（Tauri v2）

把 antirez 的 h3.c（MiniMax-H3 本地推理 CLI）包成 macOS 原生 App。
GUI 里的每一项设置都会原样转成 h3 CLI 参数，真正做到"界面即 CLI"。

## v1.1 更新

### 新功能
- **取消生成**：生成过程中可点"停止"按钮中止 h3 进程（kill PID）
- **预设面板**：均衡 / 快速 / 激进 三种一键参数组合
- **配置记忆**：所有参数自动存 localStorage，关闭重开恢复上次配置
- **Prompt 历史**：最近 20 条 prompt 下拉选择，一键填回
- **另存视频**：把上次生成的视频另存到任意位置（对应 CLI `!save`）
- **自动打开**：生成完成后自动用系统播放器打开视频（对应 CLI `!open on`）
- **日志自动滚动开关**：可关掉自动滚动，方便翻看历史日志
- **Dark Mode**：自动跟随系统暗色模式
- **模型目录可选**（v1.1）：不再绑定 ~/vk-h3/models/，可点击"选择…"按钮选择任意模型文件夹
- **输出目录可选**（v1.1）：可自定义输出目录，留空则默认 ~/vk-h3/output/

### 改进
- ffmpeg 回退路径不再硬编码，改为动态 `which ffmpeg` 查找
- `--ref-video-audio` 空音频路径防御性处理：Rust 端不再 push 空字符串，直接跳过
- 窗口最小宽度 760px（原 900px），适配小屏 MacBook Air
- 进度条/日志区交互优化

## 本地编译

**前置：** Node.js v22+、Rust（stable）、Xcode Command Line Tools

```bash
git clone https://github.com/vkbro/vk-h3.git
cd vk-h3/h3-app
npm install
npm run tauri build
```

产物：`src-tauri/target/release/bundle/macos/vk-h3.app`

## 使用
- 下载 DMG → 拖到 Applications → 首次右键打开
- 在 App 里点"选择…"选择模型文件夹（含 model_index.json 或 FL2VA/）
- 可选：设置输出目录
- 选预设或手动调参 → 填 prompt → 点"生成视频"
- 模型来源：[HuggingFace MiniMaxAI/MiniMax-H3](https://huggingface.co/MiniMaxAI/MiniMax-H3)（~134GB，BF16 safetensors）

## 模型要求
| 项 | 要求 |
|---|---|
| 模型 | MiniMaxAI/MiniMax-H3（HuggingFace 原始 safetensors） |
| 精度 | BF16 |
| 大小 | ~134GB |
| 识别标志 | 目录含 `model_index.json` 或 `FL2VA/` 子目录 |
| Checkpoint | FL2VA（首尾帧）/ Ref2VA（参考），h3.c 都支持 |

## 已内置的坑（不用管）
- `h3` + `h3_shaders.metal` + `ffmpeg` 已打进 app 资源目录
- Rust 端 spawn 时切 CWD 到资源目录（h3 按 CWD 找 .metal）
- ffmpeg 优先用内置版本，找不到则动态查找 PATH
- 134GB 模型：ssd-streaming 默认开（避免权重全量载入占满内存）

## GUI ↔ CLI 参数对照

| GUI | CLI |
|---|---|
| 预设：均衡/快速/激进 | 无对应（组合参数快捷方式） |
| 模型目录 | `-d` |
| 提示词 | `-p` |
| 输出文件 | `-o` |
| 宽度/高度 | `--width` / `--height` |
| 内部渲染宽/高 | `--render-width` / `--render-height` |
| 时长（秒） | `--seconds` |
| 帧数 | `--frames` |
| Steps | `--steps` |
| Reuse | `--reuse` |
| Layers | `--layers` |
| Core Reuse | `--core-reuse` |
| Token Reduction | `--token-reduction` |
| SSD 流式加载 | `--ssd-streaming` |
| Int8 Row FC2 | `--use-int8-row-fc2` |
| Reference RoPE | `--use-reference-rope` |
| 高级兼容开关 ×10 | `--use-slower-*` |
| 种子/随机种子 | `--seed` |
| 首帧/尾帧 | `--first-frame` / `--last-frame` |
| 参考图尺寸策略 | `--ref-image-size` |
| 参考输入列表 | `--ref-image` / `--ref-video` / `--ref-silent-video` / `--ref-video-audio` / `--ref-audio` |
| 帧目录 | `--frames-dir` |
| Show | `--show` |
| Zoom | `--zoom` |
| Profile | `--profile` |
| 检查模型/设备 | `--info` |
| 另存视频 | `!save`（CLI REPL 命令） |
| 自动打开 | `!open`（CLI REPL 命令） |

## 注意
- 宽高需 32 倍数；帧数须 5+17n（界面填"秒数"自动算）
- 输出视频写到指定输出目录（默认 ~/vk-h3/output/）
- 修改 Rust 代码后重新 `npm run tauri build` 即可

## 文件结构
```
src/index.html + main.js + styles.css   # 前端（扁平深色极简）
src-tauri/src/lib.rs                     # 后端：spawn h3 + 日志流式推送 + 进程管理
src-tauri/binaries/                      # h3 二进制 + shader + ffmpeg（随包分发）
```

## 许可证

MIT — 见 [LICENSE](LICENSE)
