// h3-app frontend v1.1: talks to the Rust backend via the Tauri global API. i18n via i18n.js (t()).
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const $ = (id) => document.getElementById(id);

const logBox = $('log');
const statusChip = $('statusChip');
const statusText = $('statusText');
const progressWrap = $('progressWrap');
const progressFill = $('progressFill');
const progressText = $('progressText');

function setStatus(text, cls) {
  statusText.textContent = text;
  statusChip.className = 'status-chip' + (cls ? ' ' + cls : '');
}

function appendLog(line, cls) {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = line;
  logBox.appendChild(div);
  // 仅在自动滚动开启时滚到底
  if ($('autoScroll').checked) {
    logBox.scrollTop = logBox.scrollHeight;
  }
}

// 把未捕获的脚本错误显示到日志区
window.addEventListener('error', (e) => {
  try { appendLog(t('err.script') + (e.message || e.error), 'err'); } catch (_) {}
});
window.addEventListener('unhandledrejection', (e) => {
  try { appendLog(t('err.script') + (e.reason && e.reason.message ? e.reason.message : String(e.reason)), 'err'); } catch (_) {}
});

// ===== 预设 =====
const PRESETS = {
  balanced: { steps: 20, reuse: 2, layers: 50, core_reuse: 1, token_reduction: true, render_width: 0, render_height: 0 },
  fast: { steps: 20, reuse: 2, layers: 45, core_reuse: 1, token_reduction: true, render_width: 0, render_height: 0 },
  aggressive: { steps: 4, reuse: 3, layers: 40, core_reuse: 1, token_reduction: true, render_width: 320, render_height: 320 },
};
document.querySelectorAll('.btn-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = PRESETS[btn.dataset.preset];
    if (!p) return;
    $('steps').value = p.steps;
    $('reuse').value = p.reuse;
    $('layers').value = p.layers;
    $('coreReuse').value = p.core_reuse;
    $('tokenReduction').checked = p.token_reduction;
    $('renderWidth').value = p.render_width;
    $('renderHeight').value = p.render_height;
    document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refreshCmdPreview();
    appendLog(t('log.presetApplied') + btn.textContent.trim().split('\n')[0]);
  });
});

// ===== localStorage 配置记忆 =====
const STORAGE_KEY = 'vk-h3-params-v1.1';
const PROMPT_HISTORY_KEY = 'vk-h3-prompts-v1.1';
const PROMPT_HISTORY_MAX = 20;

function saveParams() {
  try {
    const params = collectParams();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch (_) {}
}

function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    // 逐字段恢复，不覆盖 null
    if (p.width != null) $('width').value = p.width;
    if (p.height != null) $('height').value = p.height;
    if (p.render_width != null) $('renderWidth').value = p.render_width;
    if (p.render_height != null) $('renderHeight').value = p.render_height;
    if (p.seconds != null) $('seconds').value = p.seconds;
    if (p.frames != null) $('frames').value = p.frames;
    if (p.steps != null) $('steps').value = p.steps;
    if (p.reuse != null) $('reuse').value = p.reuse;
    if (p.layers != null) $('layers').value = p.layers;
    if (p.core_reuse != null) $('coreReuse').value = p.core_reuse;
    if (p.seed != null) $('seed').value = p.seed;
    if (p.ref_image_size != null) $('refImageSize').value = p.ref_image_size;
    if (p.zoom != null) $('zoom').value = p.zoom;
    if (p.output != null) $('output').value = p.output;
    if (p.prompt != null) $('prompt').value = p.prompt;
    if (p.token_reduction != null) $('tokenReduction').checked = p.token_reduction;
    if (p.ssd_streaming != null) $('ssdStreaming').checked = p.ssd_streaming;
    if (p.use_int8_row_fc2 != null) $('int8RowFc2').checked = p.use_int8_row_fc2;
    if (p.use_reference_rope != null) $('referenceRope').checked = p.use_reference_rope;
    if (p.use_slower_bf16_mlp != null) $('slowerBf16Mlp').checked = p.use_slower_bf16_mlp;
    if (p.use_slower_bf16_qkv != null) $('slowerBf16Qkv').checked = p.use_slower_bf16_qkv;
    if (p.use_slower_bf16_attention_output != null) $('slowerBf16AttnOut').checked = p.use_slower_bf16_attention_output;
    if (p.use_slower_row_major_attention_output != null) $('slowerRowMajorAttnOut').checked = p.use_slower_row_major_attention_output;
    if (p.use_slower_unfused_int8_inputs != null) $('slowerUnfusedInt8Inputs').checked = p.use_slower_unfused_int8_inputs;
    if (p.use_slower_unfused_qkv_rope != null) $('slowerUnfusedQkvRope').checked = p.use_slower_unfused_qkv_rope;
    if (p.use_slower_scalar_qkv_rms != null) $('slowerScalarQkvRms').checked = p.use_slower_scalar_qkv_rms;
    if (p.use_slower_uncached_int8_scales != null) $('slowerUncachedInt8Scales').checked = p.use_slower_uncached_int8_scales;
    if (p.use_slower_dynamic_fc1_k != null) $('slowerDynamicFc1K').checked = p.use_slower_dynamic_fc1_k;
    if (p.use_slower_grouped_quantizer != null) $('slowerGroupedQuantizer').checked = p.use_slower_grouped_quantizer;
    if (p.random_seed != null) $('randomSeed').checked = p.random_seed;
    if (p.show != null) $('show').checked = p.show;
    if (p.profile != null) $('profile').checked = p.profile;
    if (p.auto_open != null) $('autoOpen').checked = p.auto_open;
    if (p.first_frame) $('firstFrame').value = p.first_frame;
    if (p.last_frame) $('lastFrame').value = p.last_frame;
    if (p.frames_dir) $('framesDir').value = p.frames_dir;
    if (p.output_dir != null) $('outputDir').value = p.output_dir;
    appendLog(t('log.configRestored'));
  } catch (_) {}
}

// ===== Prompt 历史 =====
function loadPromptHistory() {
  try {
    const raw = localStorage.getItem(PROMPT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function savePromptHistory(list) {
  try { localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(list)); } catch (_) {}
}

function addPromptToHistory(prompt) {
  if (!prompt || prompt.length < 3) return;
  let list = loadPromptHistory();
  // 去重
  list = list.filter(p => p !== prompt);
  list.unshift(prompt);
  if (list.length > PROMPT_HISTORY_MAX) list = list.slice(0, PROMPT_HISTORY_MAX);
  savePromptHistory(list);
  refreshPromptHistoryDropdown();
}

function refreshPromptHistoryDropdown() {
  const sel = $('promptHistory');
  const list = loadPromptHistory();
  sel.innerHTML = `<option value="">${t('prompt.history')}</option>`;
  for (const p of list) {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p.length > 60 ? p.slice(0, 60) + '…' : p;
    sel.appendChild(opt);
  }
}

$('promptHistory').addEventListener('change', () => {
  const val = $('promptHistory').value;
  if (val) {
    $('prompt').value = val;
    refreshCmdPreview();
  }
});

$('clearPrompt').addEventListener('click', () => {
  $('prompt').value = '';
  refreshCmdPreview();
});

// ===== 显示说明开关 =====
$('showHints').addEventListener('change', () => {
  document.body.classList.toggle('show-hints', $('showHints').checked);
});

// ===== 高级兼容区折叠 =====
$('advancedHeader').addEventListener('click', () => {
  const body = $('advancedBody');
  const header = $('advancedHeader');
  const isHidden = body.hidden;
  body.hidden = !isHidden;
  header.classList.toggle('expanded', isHidden);
});

// ===== 进度解析 =====
function parseProgress(line) {
  const m = line.match(/([A-Za-z][A-Za-z0-9 _-]*?)\s+(\d+)\/(\d+)/);
  if (!m) return;
  const done = parseInt(m[2], 10);
  const total = parseInt(m[3], 10);
  if (!(total > 0)) return;
  const p = Math.min(100, Math.round((done / total) * 100));
  progressWrap.hidden = false;
  progressFill.style.width = p + '%';
  progressText.textContent = p + '%';
  const phase = m[1].trim();
  if (phase) progressText.title = phase;
}
function maybeProgress(line) { parseProgress(line); }

$('clearLog').addEventListener('click', () => {
  logBox.innerHTML = '';
  progressWrap.hidden = true;
  progressFill.style.width = '0%';
  progressText.textContent = '';
});

// ===== 时长模式切换 =====
const durationMode = $('durationMode');
function setDurationMode(mode) {
  durationMode.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('secondsField').hidden = mode !== 'seconds';
  $('framesField').hidden = mode !== 'frames';
}
durationMode.addEventListener('click', (e) => {
  if (e.target.dataset.mode) setDurationMode(e.target.dataset.mode);
});

// ===== 参考输入动态列表 =====
const refList = $('refList');
function refTypes() {
  return [
    { value: 'image', label: t('ref.image') },
    { value: 'video', label: t('ref.video') },
    { value: 'silent_video', label: t('ref.silent_video') },
    { value: 'video_audio', label: t('ref.video_audio') },
    { value: 'audio', label: t('ref.audio') },
  ];
}
function addRefRow() {
  const row = document.createElement('div');
  row.className = 'ref-row';
  row.innerHTML = `
    <select class="ref-kind">
      ${refTypes().map(x => `<option value="${x.value}">${x.label}</option>`).join('')}
    </select>
    <input type="text" class="ref-path" data-i18n-placeholder="ref.path.placeholder" spellcheck="false" />
    <input type="text" class="ref-audio" data-i18n-placeholder="ref.audio.placeholder" spellcheck="false" hidden />
    <button class="btn-ghost pick-ref" type="button" data-i18n="btn.select">选择…</button>
    <button class="btn-ghost remove-ref" type="button" data-i18n="btn.remove">移除</button>`;
  const kindSel = row.querySelector('.ref-kind');
  const audioInput = row.querySelector('.ref-audio');
  const pathInput = row.querySelector('.ref-path');
  kindSel.addEventListener('change', () => {
    audioInput.hidden = kindSel.value !== 'video_audio';
  });
  row.querySelector('.pick-ref').addEventListener('click', async () => {
    const kind = kindSel.value;
    const filter = kind === 'image' ? 'image' : (kind === 'audio' ? 'audio' : 'video');
    const p = await pickPath({ filter });
    if (p) pathInput.value = p;
  });
  row.querySelector('.remove-ref').addEventListener('click', () => row.remove());
  refList.appendChild(row);
}
$('addRefBtn').addEventListener('click', addRefRow);

function collectRefs() {
  const refs = [];
  for (const row of refList.querySelectorAll('.ref-row')) {
    const kind = row.querySelector('.ref-kind').value;
    const path = row.querySelector('.ref-path').value.trim();
    const audio = row.querySelector('.ref-audio').value.trim();
    if (!path) continue;
    const item = { kind, path };
    if (kind === 'video_audio') item.audio_path = audio || '';
    refs.push(item);
  }
  return refs;
}

// ===== 文件选择 =====
async function pickPath(opts = {}) {
  try {
    const res = await invoke('pick_file', { pickDir: !!opts.directory, filter: opts.filter || null });
    return res || '';
  } catch (e) {
    appendLog(t('err.pickFile') + String(e), 'err');
    return null;
  }
}

// ===== 校验 =====
function validateParams(p) {
  const errors = [];
  const w = p.width, h = p.height;
  if (!(w >= 32 && h >= 32 && w % 32 === 0 && h % 32 === 0)) errors.push(t('v.wh'));
  if (w * h > 768 * 1344) errors.push(t('v.canvas'));
  const rw = p.render_width, rh = p.render_height;
  if ((rw === 0) !== (rh === 0)) errors.push(t('v.renderBoth'));
  if (rw > 0) {
    if (rw % 32 !== 0 || rh % 32 !== 0 || rw > w || rh > h) errors.push(t('v.renderCanvas'));
    if (rw * h !== rh * w) errors.push(t('v.renderRatio'));
  }
  if (p.frames != null && (p.frames < 5 || p.frames > 362)) errors.push(t('v.frames'));
  if (p.steps < 2 || p.steps > 1000) errors.push(t('v.steps'));
  if (p.reuse < 1 || p.reuse > 3) errors.push(t('v.reuse'));
  if (p.layers < 35 || p.layers > 50) errors.push(t('v.layers'));
  if (p.core_reuse < 1 || p.core_reuse > 6) errors.push(t('v.coreReuse'));
  if (p.core_reuse > 1 && p.reuse > 1) errors.push(t('v.coreReuseConflict'));
  if (p.ssd_streaming && p.use_int8_row_fc2) errors.push(t('v.ssdInt8'));
  if (p.use_int8_row_fc2 && p.use_slower_bf16_mlp) errors.push(t('v.int8Bf16'));
  if (p.references.length > 12) errors.push(t('v.refMax'));
  for (const r of p.references) {
    if (r.kind === 'video_audio' && !(r.audio_path || '').trim()) errors.push(t('v.refAudio'));
  }
  return errors;
}

function collectParams() {
  const mode = durationMode.querySelector('.active')?.dataset.mode || 'seconds';
  const refs = collectRefs();
  return {
    prompt: $('prompt').value.trim(),
    model_dir: $('modelDir').value.trim(),
    output: $('output').value.trim(),
    width: parseInt($('width').value, 10) || 512,
    height: parseInt($('height').value, 10) || 512,
    render_width: parseInt($('renderWidth').value, 10) || 0,
    render_height: parseInt($('renderHeight').value, 10) || 0,
    seconds: mode === 'seconds' ? (parseInt($('seconds').value, 10) || 5) : null,
    frames: mode === 'frames' ? (parseInt($('frames').value, 10) || 56) : null,
    steps: parseInt($('steps').value, 10) || 20,
    reuse: parseInt($('reuse').value, 10) || 2,
    layers: parseInt($('layers').value, 10) || 50,
    core_reuse: parseInt($('coreReuse').value, 10) || 1,
    token_reduction: $('tokenReduction').checked,
    ssd_streaming: $('ssdStreaming').checked,
    use_int8_row_fc2: $('int8RowFc2').checked,
    use_reference_rope: $('referenceRope').checked,
    use_slower_bf16_mlp: $('slowerBf16Mlp').checked,
    use_slower_bf16_qkv: $('slowerBf16Qkv').checked,
    use_slower_bf16_attention_output: $('slowerBf16AttnOut').checked,
    use_slower_row_major_attention_output: $('slowerRowMajorAttnOut').checked,
    use_slower_unfused_int8_inputs: $('slowerUnfusedInt8Inputs').checked,
    use_slower_unfused_qkv_rope: $('slowerUnfusedQkvRope').checked,
    use_slower_scalar_qkv_rms: $('slowerScalarQkvRms').checked,
    use_slower_uncached_int8_scales: $('slowerUncachedInt8Scales').checked,
    use_slower_dynamic_fc1_k: $('slowerDynamicFc1K').checked,
    use_slower_grouped_quantizer: $('slowerGroupedQuantizer').checked,
    seed: $('randomSeed').checked ? null : (parseInt($('seed').value, 10) || 42),
    random_seed: $('randomSeed').checked,
    first_frame: $('firstFrame').value.trim() || null,
    last_frame: $('lastFrame').value.trim() || null,
    ref_image_size: $('refImageSize').value,
    references: refs,
    frames_dir: $('framesDir').value.trim() || null,
    show: $('show').checked,
    zoom: parseInt($('zoom').value, 10) || 2,
    profile: $('profile').checked,
    auto_open: $('autoOpen').checked,
    output_dir: $('outputDir').value.trim() || null,
  };
}

function renderCmd(p) {
  const a = [];
  a.push(`-d ${p.model_dir}`);
  a.push(`-p ${JSON.stringify(p.prompt)}`);
  a.push(`-o ${p.output}`);
  a.push(`--width ${p.width}`);
  a.push(`--height ${p.height}`);
  if (p.render_width > 0) a.push(`--render-width ${p.render_width}`);
  if (p.render_height > 0) a.push(`--render-height ${p.render_height}`);
  if (p.seconds != null) a.push(`--seconds ${p.seconds}`);
  else if (p.frames != null) a.push(`--frames ${p.frames}`);
  a.push(`--steps ${p.steps}`);
  a.push(`--reuse ${p.reuse}`);
  a.push(`--layers ${p.layers}`);
  a.push(`--core-reuse ${p.core_reuse}`);
  if (p.token_reduction) a.push('--token-reduction');
  if (p.ssd_streaming) a.push('--ssd-streaming');
  if (p.use_int8_row_fc2) a.push('--use-int8-row-fc2');
  if (p.use_reference_rope) a.push('--use-reference-rope');
  if (p.use_slower_bf16_mlp) a.push('--use-slower-bf16-mlp');
  if (p.use_slower_bf16_qkv) a.push('--use-slower-bf16-qkv');
  if (p.use_slower_bf16_attention_output) a.push('--use-slower-bf16-attention-output');
  if (p.use_slower_row_major_attention_output) a.push('--use-slower-row-major-attention-output');
  if (p.use_slower_unfused_int8_inputs) a.push('--use-slower-unfused-int8-inputs');
  if (p.use_slower_unfused_qkv_rope) a.push('--use-slower-unfused-qkv-rope');
  if (p.use_slower_scalar_qkv_rms) a.push('--use-slower-scalar-qkv-rms');
  if (p.use_slower_uncached_int8_scales) a.push('--use-slower-uncached-int8-scales');
  if (p.use_slower_dynamic_fc1_k) a.push('--use-slower-dynamic-fc1-k');
  if (p.use_slower_grouped_quantizer) a.push('--use-slower-grouped-quantizer');
  if (p.random_seed) a.push(`--seed ${t('cmd.randomSeed')}`);
  else a.push(`--seed ${p.seed}`);
  if (p.first_frame) a.push(`--first-frame ${p.first_frame}`);
  if (p.last_frame) a.push(`--last-frame ${p.last_frame}`);
  a.push(`--ref-image-size ${p.ref_image_size}`);
  for (const r of p.references) {
    if (r.kind === 'image') a.push(`--ref-image ${r.path}`);
    else if (r.kind === 'video') a.push(`--ref-video ${r.path}`);
    else if (r.kind === 'silent_video') a.push(`--ref-silent-video ${r.path}`);
    else if (r.kind === 'video_audio') a.push(`--ref-video-audio ${r.path} ${r.audio_path || ''}`);
    else if (r.kind === 'audio') a.push(`--ref-audio ${r.path}`);
  }
  if (p.frames_dir) a.push(`--frames-dir ${p.frames_dir}`);
  if (p.show) a.push('--show');
  if (p.zoom > 1) a.push(`--zoom ${p.zoom}`);
  if (p.profile) a.push('--profile');
  $('cmdPreview').textContent = 'h3 ' + a.join(' ');
}

function refreshCmdPreview() {
  renderCmd(collectParams());
}

// 实时刷新 CLI 命令预览 + 自动保存配置
for (const id of ['modelDir','outputDir','prompt','output','width','height','renderWidth','renderHeight','seconds','frames','steps','reuse','layers','coreReuse','tokenReduction','ssdStreaming','int8RowFc2','referenceRope','slowerBf16Mlp','slowerBf16Qkv','slowerBf16AttnOut','slowerRowMajorAttnOut','slowerUnfusedInt8Inputs','slowerUnfusedQkvRope','slowerScalarQkvRms','slowerUncachedInt8Scales','slowerDynamicFc1K','slowerGroupedQuantizer','randomSeed','seed','firstFrame','lastFrame','refImageSize','framesDir','show','zoom','profile','autoOpen']) {
  const el = $(id);
  if (el) {
    el.addEventListener('input', () => { refreshCmdPreview(); saveParams(); });
    if (el.tagName === 'SELECT' || el.type === 'checkbox') {
      el.addEventListener('change', () => { refreshCmdPreview(); saveParams(); });
    }
  }
}

// 固定字段的本地文件选择
$('pickFirstFrame').addEventListener('click', async () => {
  const p = await pickPath({ filter: 'image' });
  if (p) $('firstFrame').value = p;
});
$('pickLastFrame').addEventListener('click', async () => {
  const p = await pickPath({ filter: 'image' });
  if (p) $('lastFrame').value = p;
});
$('pickFramesDir').addEventListener('click', async () => {
  const p = await pickPath({ directory: true });
  if (p) $('framesDir').value = p;
});

durationMode.addEventListener('click', () => { refreshCmdPreview(); saveParams(); });
new MutationObserver(() => { refreshCmdPreview(); saveParams(); }).observe(refList, { childList: true, subtree: true });

// ===== 生成 / 停止 =====
$('generateBtn').addEventListener('click', async () => {
  const btn = $('generateBtn');
  const btnText = $('btnText');
  const stopBtn = $('stopBtn');
  const prompt = $('prompt').value.trim();
  if (!prompt) { appendLog(t('err.noPrompt'), 'err'); return; }

  const modelDir = await refreshModel();
  if (!modelDir) {
    appendLog(t('err.modelNotFound'), 'err');
    return;
  }
  const params = collectParams();
  const errors = validateParams(params);
  if (errors.length) {
    appendLog(t('err.failed') + ' ' + errors.join('; '), 'err');
    return;
  }

  // 保存 prompt 到历史
  addPromptToHistory(prompt);
  // 保存配置到 localStorage
  saveParams();

  btn.disabled = true;
  btnText.textContent = t('btn.generating');
  btn.hidden = true;
  stopBtn.hidden = false;
  setStatus(t('status.busy'), 'busy');
  progressWrap.hidden = true;
  progressFill.style.width = '0%';
  progressText.textContent = '';
  appendLog(t('log.startGen'));

  try {
    const result = await invoke('generate', { params });
    appendLog(result, 'ok');
    setStatus(t('status.done'));
    const out = params.output;
    if (!out.startsWith('/')) {
      const dir = $('outputDir').value.trim();
      appendLog(t('log.outputDir') + (dir || t('log.defaultOutputDir')), 'ok');
    }
  } catch (e) {
    appendLog(t('err.failed') + ' ' + String(e), 'err');
    setStatus(t('status.failed'), 'err');
  } finally {
    btn.disabled = false;
    btnText.textContent = t('btn.generate');
    btn.hidden = false;
    stopBtn.hidden = true;
  }
});

$('stopBtn').addEventListener('click', async () => {
  try {
    const result = await invoke('stop_generate');
    appendLog(result, 'ok');
  } catch (e) {
    appendLog(t('log.stopFailed') + String(e), 'err');
  }
});

$('inspectBtn').addEventListener('click', async () => {
  const btn = $('inspectBtn');
  btn.disabled = true;
  appendLog(t('log.inspect'));
  try {
    const result = await invoke('inspect', { modelDir: $('modelDir').value.trim() });
    appendLog(result, 'ok');
  } catch (e) {
    appendLog(t('err.failed') + ' ' + String(e), 'err');
  } finally {
    btn.disabled = false;
  }
});

$('openOutputBtn').addEventListener('click', async () => {
  const btn = $('openOutputBtn');
  btn.disabled = true;
  try {
    const result = await invoke('open_output', { output: $('output').value.trim(), outputDir: $('outputDir').value.trim() || null });
    appendLog(result, 'ok');
  } catch (e) {
    appendLog(t('err.failed') + ' ' + String(e), 'err');
  } finally {
    btn.disabled = false;
  }
});

$('saveVideoBtn').addEventListener('click', async () => {
  const btn = $('saveVideoBtn');
  btn.disabled = true;
  try {
    const result = await invoke('save_video');
    appendLog(result, 'ok');
  } catch (e) {
    appendLog(t('err.failed') + ' ' + String(e), 'err');
  } finally {
    btn.disabled = false;
  }
});

// ===== 模型目录选择 =====
$('pickModelDir').addEventListener('click', async () => {
  const p = await pickPath({ directory: true });
  if (!p) return;
  $('modelDir').value = p;
  // 验证是否是有效模型目录
  const detected = await invoke('detect_model', { searchDir: p });
  if (detected) {
    $('modelDir').value = detected;
    appendLog(t('log.modelSelected') + detected);
  } else {
    appendLog(t('warn.modelDir'), 'err');
  }
  refreshCmdPreview();
  saveParams();
});

// ===== 输出目录选择 =====
$('pickOutputDir').addEventListener('click', async () => {
  const p = await pickPath({ directory: true });
  if (!p) return;
  $('outputDir').value = p;
  appendLog(t('log.outputDirSet') + p);
  refreshCmdPreview();
  saveParams();
});

// ===== 模型检测 =====
async function refreshModel() {
  const currentDir = $('modelDir').value.trim();
  if (currentDir) {
    // 用户已选择目录，验证一下
    const detected = await invoke('detect_model', { searchDir: currentDir });
    if (detected) {
      $('modelDir').value = detected;
      return detected;
    }
    appendLog(t('err.noModelInDir'), 'err');
    return '';
  }
  // 自动检测默认目录
  try {
    const m = await invoke('detect_model', { searchDir: null });
    if (m) {
      $('modelDir').value = m;
    } else {
      appendLog(t('err.modelNotFound'), 'err');
    }
    return m;
  } catch (e) {
    $('modelDir').value = '';
    appendLog(t('err.modelDetect') + String(e), 'err');
    return '';
  }
}

// ===== 语言切换 =====
const LANG_KEY = 'vkbr…t';
(function initLang() {
  let lang = null;
  try { lang = localStorage.getItem(LANG_KEY); } catch (_) {}
  if (!lang) lang = (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  applyLang(lang);
  invoke('set_lang', { lang }).catch(() => {});
})();
$('langSwitch').addEventListener('click', (e) => {
  const btn = e.target.closest('.lang-btn');
  if (!btn) return;
  applyLang(btn.dataset.lang);
  try { localStorage.setItem(LANG_KEY, btn.dataset.lang); } catch (_) {}
  invoke('set_lang', { lang: btn.dataset.lang }).catch(() => {});
});
window.addEventListener('langchange', () => {
  // 刷新动态文案
  refreshPromptHistoryDropdown();
  // 状态 chip：非生成状态时跟随语言
  if (!statusChip.classList.contains('busy')) {
    setStatus(t('status.ready'));
  }
  // 参考行：更新 select 选项与 placeholder
  document.querySelectorAll('.ref-row').forEach(row => {
    const sel = row.querySelector('.ref-kind');
    const cur = sel.value;
    sel.innerHTML = refTypes().map(x => `<option value="${x.value}">${x.label}</option>`).join('');
    sel.value = cur;
    row.querySelector('.ref-path').placeholder = t('ref.path.placeholder');
    row.querySelector('.ref-audio').placeholder = t('ref.audio.placeholder');
  });
  // 生成中时按钮文案保持"生成中"
  if (!$('generateBtn').hidden) $('btnText').textContent = t('btn.generate');
  refreshCmdPreview();
});

// ===== 初始化 =====
(async () => {
  loadParams();
  refreshPromptHistoryDropdown();
  await refreshModel();
  refreshCmdPreview();
})();

// ===== 订阅 h3 日志流 =====
listen('h3-log', (event) => {
  const line = String(event.payload);
  appendLog(line);
  maybeProgress(line);
});

// 离开页面前保存配置
window.addEventListener('beforeunload', saveParams);
