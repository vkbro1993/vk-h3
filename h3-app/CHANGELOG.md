# Changelog

## v1.1 (2026-09-08)

### New Features
- **Bilingual UI**: Language switcher in topbar, real-time text swap across the entire interface, persistent selection with system language detection; backend error messages and file dialogs also localized
- **Custom model directory**: No longer locked to `~/vk-h3/models/`, select any model folder via file picker
- **Custom output directory**: Set any output path, defaults to `~/vk-h3/output/` if empty

### Improvements
- `detect_model` accepts optional search path parameter
- `resolve_output` accepts optional custom output directory parameter
- Model directory input is now editable with file picker (removed readonly)
- Added "Output Directory" field with file picker
- Config persistence now includes `output_dir`
- Removed hardcoded paths from README/CHANGELOG
- Added MIT LICENSE
- Added English README (`README.md`), Chinese moved to `README.zh-CN.md`
- `.gitignore` excludes `binaries/h3`

## v1.1.0 (2026-09-08)

### New Features
- **Cancel generation button**: Abort h3 process mid-generation (Rust kill PID + frontend button toggle)
- **Preset panel**: Balanced / Fast / Aggressive one-click parameter combos
- **Config persistence**: All parameters auto-saved to localStorage, restored on reopen
- **Prompt history**: Last 20 prompts in dropdown for quick reuse (spirit of CLI `!again`)
- **Save video as**: Copy last generated video to any location (spirit of CLI `!save PATH`)
- **Auto-open video**: Automatically open video with system player after generation (spirit of CLI `!open on`)
- **Auto-scroll toggle**: Disable auto-scroll in log to review history
- **Dark Mode**: Automatically follows system dark mode (`prefers-color-scheme: dark`)

### Improvements
- ffmpeg fallback path is no longer hardcoded, uses dynamic `which ffmpeg` lookup
- `--ref-video-audio` empty audio path defensive handling: Rust no longer pushes empty string, skips directly
- Window minimum width reduced from 900px to 760px, fits small MacBook Air
- Prompt textarea default height reduced from 230px to 140px, saves space
- Log area toolbar with auto-scroll toggle

### Rust Backend Changes
- Added `AppState` global state: `h3_pid` (process PID) + `last_output` (last output path)
- Added `stop_generate` command: kill running h3 process
- Added `save_video` command: system dialog to pick save location, copy last generated video
- `generate` command adds re-entrance guard (rejects if task already running)
- `generate` command adds `auto_open` parameter, auto-opens video on completion
- `GenParams` adds `auto_open: bool` field
- ffmpeg fallback changed to `which ffmpeg` dynamic lookup

## v1.0.0 (2026-09-07)

- Initial release
- Full coverage of all 41 h3 CLI arguments
- Interface IS the CLI: every GUI setting maps 1:1 to CLI parameter
- Auto model detection (~/vk-h3/models/)
- Log streaming + progress bar
- Real-time CLI command preview
