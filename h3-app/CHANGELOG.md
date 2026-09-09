# Changelog

## v1.1 (2026-09-08)

### 新功能
- **中英文切换**：顶栏语言开关，全界面文案实时切换，选择持久化并跟随系统语言初始化；后端错误消息、文件选择器同样本地化
- **模型目录可选**：不再绑定 `~/vk-h3/models/`，可点击"选择…"按钮选择任意模型文件夹
- **输出目录可选**：可自定义输出目录，留空则默认 `~/vk-h3/output/`

### 改进
- `detect_model` 接受可选搜索路径参数
- `resolve_output` 接受可选自定义输出目录参数
- 模型目录输入框去除 readonly，改为可编辑 + 文件选择器
- 新增"输出目录"字段 + 文件选择器
- 配置记忆新增 `output_dir` 持久化
- 清除 README/CHANGELOG 中所有硬编码路径
- 新增 MIT LICENSE
- 新增英文 README（`README.md`），中文版移至 `README.zh-CN.md`
- `.gitignore` 补排 `binaries/h3`

## v1.1.0 (2026-09-08)

### 新功能
- **取消生成按钮**：生成过程中可中止 h3 进程（Rust 端 kill PID + 前端按钮切换）
- **预设面板**：均衡 Balanced / 快速 Fast / 激进 Aggressive 三种一键参数组合
- **配置记忆**：所有参数自动存 localStorage，关闭重开恢复上次配置
- **Prompt 历史**：最近 20 条 prompt 下拉选择，一键填回（对应 CLI `!again` 精神）
- **另存视频**：把上次生成的视频另存到任意位置（对应 CLI `!save PATH`）
- **自动打开视频**：生成完成后自动用系统播放器打开视频（对应 CLI `!open on`）
- **日志自动滚动开关**：可关闭自动滚动，方便翻看历史日志
- **Dark Mode**：自动跟随系统暗色模式（`prefers-color-scheme: dark`）

### 改进
- ffmpeg 回退路径不再硬编码，改为动态 `which ffmpeg` 查找
- `--ref-video-audio` 空音频路径防御性处理：Rust 端不再 push 空字符串，直接跳过
- 窗口最小宽度从 900px 降到 760px，适配小屏 MacBook Air
- prompt textarea 默认高度从 230px 降到 140px，减少空间占用
- 日志区新增工具栏，放自动滚动开关

### Rust 后端变更
- 新增 `AppState` 全局状态：`h3_pid`（进程 PID）+ `last_output`（上次输出路径）
- 新增 `stop_generate` 命令：kill 正在运行的 h3 进程
- 新增 `save_video` 命令：通过系统对话框选择保存位置，复制上次生成的视频
- `generate` 命令增加防重入检查（已有任务运行则拒绝）
- `generate` 命令增加 `auto_open` 参数，完成后自动 `open` 视频
- `GenParams` 新增 `auto_open: bool` 字段
- ffmpeg fallback 改为 `which ffmpeg` 动态查找

## v1.0.0 (2026-09-07)

- 首版发布
- 完整覆盖 h3 CLI 全部 41 个参数
- 界面即 CLI：GUI 每项设置原样转成 CLI 参数
- 模型自动检测（~/vk-h3/models/）
- 日志流式推送 + 进度条
- CLI 命令实时预览
