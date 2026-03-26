# Changelog

All notable changes to OpenWebRadio will be documented in this file.

## [1.2.0] - 2026-03-26

### Added
- **Live stream support** — plays Icecast/Shoutcast internet radio streams directly
- **Auto-detection** — detects live streams from infinite audio duration, or use `live: true` on tracks
- **LIVE badge** — pulsing red badge replaces elapsed time for live streams
- **LIVE indicators** — badges in playlist drawer and minimized mode
- **Demo live stations** — SomaFM Groove Salad and DEF CON Radio included in demo
- **Brand label presets** — OpenWebRadio, OpenWebPlayer, OpenPlayer, GlitchPlayer, GlitchFM, WebFM, and more

### Changed
- Repository renamed from OverPlayer to **OpenWebRadio**
- Default brand label changed to "OpenWebRadio"
- Progress bar and seek hidden for live streams
- Arrow key seek disabled for live streams
- Demo page hero title updated to OpenWebRadio

## [1.1.0] - 2026-03-26

### Added
- **Progress bar with seek** — clickable timeline with elapsed/remaining time, gradient fill, and thumb dot
- **Playlist drawer** — slide-up panel showing all tracks, click to jump, animated playing indicator
- **Keyboard shortcuts** — Space (play/pause), N/P (next/prev), M (mute), L (playlist), Arrow keys (seek/volume)
- **Auto theme** — `theme="auto"` follows OS `prefers-color-scheme` and updates live
- **Cover art** — optional `cover` field on tracks, shown as thumbnail in player bar and playlist
- **Event callbacks** — `onTrackChange`, `onPlay`, `onPause`, `onEnd` props
- **Headless hook** — `useOverPlayer()` returns state + controls without any UI
- **GitHub Pages demo** — live interactive demo at the repo's GitHub Pages URL
- **GitHub Actions CI** — lint, typecheck, build on Node 18/20/22, auto-publish on tags
- **CONTRIBUTING.md** — contributor guidelines
- **This changelog**

### Changed
- Track type now supports optional `artist` and `cover` fields
- Theme prop now accepts `"auto"` in addition to `"dark"` and `"light"`

## [1.0.0] - 2026-03-26

### Added
- Initial release — persistent React audio player
- Dark and light themes
- Shuffle, repeat one, volume control with mute
- Minimizable UI (compact floating pill)
- Session persistence (track, position, playing state)
- Autoplay unlock on user interaction
- Mini visualizer bars
- Customizable accent colors, brand label, footer slot
- Full TypeScript types
- ARIA labels and `prefers-reduced-motion` support
