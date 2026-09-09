# vk-h3 — h3.c Video Generation Desktop App (Tauri v2)

A native macOS GUI for [antirez/h3.c](https://github.com/antirez/h3.c) — the MiniMax-H3 local inference CLI for Apple Silicon.

Every setting in the GUI maps 1:1 to an h3 CLI argument. **The interface IS the CLI.**

## Features

- **Full CLI coverage** — all 41 h3 arguments exposed as GUI controls
- **Model picker** — select any model folder (auto-detects `model_index.json` or `FL2VA/`)
- **Output directory** — customize where videos are saved (defaults to `~/vk-h3/output/`)
- **Presets** — Balanced / Fast / Aggressive one-click parameter combos
- **Config persistence** — all parameters saved to localStorage, restored on relaunch
- **Prompt history** — last 20 prompts in a dropdown, one click to refill
- **Cancel generation** — kill the h3 process mid-run
- **Save video as** — copy last generated video to any location
- **Auto-open** — open finished video in system player automatically
- **Dark Mode** — follows system appearance
- **Live log stream** — stdout/stderr piped in real-time with auto-scroll toggle
- **CLI preview** — see the exact `h3` command being built, in real-time

## Requirements

- **macOS** on **Apple Silicon** (M1/M2/M3/M4/M5)
- **No other dependencies needed** — h3, Metal shaders, and ffmpeg are bundled inside the app

## Quick Start

1. Download the latest `vk-h3-*.dmg` from [Releases](#releases)
2. Drag to Applications, right-click → Open (first launch)
3. Download the [MiniMax-H3 model](https://huggingface.co/MiniMaxAI/MiniMax-H3) (~134 GB, BF16 safetensors)
4. In the app, click "Choose…" next to Model Directory and select the model folder
5. (Optional) Set a custom output directory
6. Type a prompt → click "Generate Video"

> If the model folder contains `model_index.json` or a `FL2VA/` subdirectory, it will be recognized automatically.

### First-launch security

macOS will warn about an unidentified developer. Either:
- Right-click the app → **Open** → **Open** in the dialog, or
- Run in Terminal: `xattr -d com.apple.quarantine /Applications/vk-h3.app`

## Build from Source

**Prerequisites:** Node.js v22+, Rust (stable), Xcode Command Line Tools

```bash
git clone https://github.com/vkbro/vk-h3.git
cd vk-h3/h3-app
npm install
npm run tauri build
```

The built app will be at:
```
src-tauri/target/release/bundle/macos/vk-h3.app
```

## GUI ↔ CLI Mapping

| GUI | CLI |
|-----|-----|
| Preset: Balanced/Fast/Aggressive | (parameter combo shortcut) |
| Model Directory | `-d` |
| Prompt | `-p` |
| Output File | `-o` |
| Width / Height | `--width` / `--height` |
| Render Width / Height | `--render-width` / `--render-height` |
| Duration (seconds) | `--seconds` |
| Frames | `--frames` |
| Steps | `--steps` |
| Reuse | `--reuse` |
| Layers | `--layers` |
| Core Reuse | `--core-reuse` |
| Token Reduction | `--token-reduction` |
| SSD Streaming | `--ssd-streaming` |
| Int8 Row FC2 | `--use-int8-row-fc2` |
| Reference RoPE | `--use-reference-rope` |
| Advanced compat switches ×10 | `--use-slower-*` |
| Seed / Random Seed | `--seed` |
| First/Last Frame | `--first-frame` / `--last-frame` |
| Ref Image Size | `--ref-image-size` |
| Reference Inputs | `--ref-image` / `--ref-video` / `--ref-silent-video` / `--ref-video-audio` / `--ref-audio` |
| Frames Directory | `--frames-dir` |
| Show | `--show` |
| Zoom | `--zoom` |
| Profile | `--profile` |
| Inspect Model/Device | `--info` |
| Save Video As | `!save` (CLI REPL) |
| Auto-open Video | `!open on` (CLI REPL) |

## Notes

- Width/Height must be multiples of 32; canvas ≤ 768×1344
- Frame count follows the 5+17n rule (5, 22, 39, 56…) — entering seconds auto-calculates
- The `h3` binary, `h3_shaders.metal`, and `ffmpeg` are bundled in the app's resources
- Rust backend spawns h3 with `CWD` set to the resource directory (h3 looks for `.metal` relative to CWD)
- Bundled ffmpeg is used first; if missing, falls back to `which ffmpeg` on PATH
- For 134 GB models: SSD streaming is on by default to avoid loading all weights into RAM

## File Structure

```
src/
  index.html + main.js + styles.css   # Frontend (flat dark minimal)
src-tauri/
  src/lib.rs                            # Backend: spawn h3 + log streaming + process management
  binaries/                             # h3 binary + Metal shader + ffmpeg (bundled)
  tauri.conf.json                       # Tauri config
```

## Bundled Components

| Component | Source | License |
|-----------|--------|---------|
| h3 | [antirez/h3.c](https://github.com/antirez/h3.c) | MIT |
| ffmpeg | FFmpeg | LGPL 2.1+ |
| h3_shaders.metal | antirez/h3.c | MIT |

## License

MIT — see [LICENSE](LICENSE)
