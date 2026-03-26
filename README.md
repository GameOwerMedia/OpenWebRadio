# OpenWebRadio

A persistent React audio player with live stream support. Plays internet radio (Icecast/Shoutcast), local files, and podcasts. Dark & light themes, playlist drawer, progress seek, keyboard shortcuts, shuffle, repeat, volume control, session persistence, and autoplay unlock.

**[Live Demo](https://gameowermedia.github.io/OpenWebRadio/)** | **[npm](https://www.npmjs.com/package/@gameowermedia/overplayer)**

Created by **[OverJK](https://github.com/GameOwerMedia)**

---

## Features

- **Live stream support** — plays internet radio streams (Icecast/Shoutcast), auto-detects live sources, shows LIVE badge, hides seek bar
- **Dark, Light & Auto themes** — `"dark"`, `"light"`, or `"auto"` (follows OS preference)
- **Progress bar with seek** — clickable timeline with elapsed/remaining time display
- **Playlist drawer** — slide-up track list, click to jump, animated playing indicator
- **Keyboard shortcuts** — Space, arrows, N/P, M, L — full playback control without a mouse
- **Cover art** — optional thumbnail per track in the bar and playlist
- **Persistent playback** — audio survives page navigation and React remounts
- **Session restore** — remembers track, position, and playing state across reloads
- **Shuffle & Repeat** — shuffle mode and repeat-one toggle
- **Volume control** — slider + mute toggle with volume memory
- **Minimizable** — collapses to a compact floating pill
- **Autoplay unlock** — gracefully handles browser autoplay restrictions
- **Visualizer bars** — animated mini bars when playing
- **Event callbacks** — `onTrackChange`, `onPlay`, `onPause`, `onEnd`
- **Headless hook** — `useOverPlayer()` for building your own UI
- **Customizable** — accent colors, brand label, footer slot
- **Accessible** — ARIA labels, keyboard-friendly, `prefers-reduced-motion`
- **Zero dependencies** — only React as a peer dependency
- **TypeScript** — fully typed props, state, and controls

---

## Installation

```bash
npm install @gameowermedia/overplayer
```

```bash
yarn add @gameowermedia/overplayer
```

```bash
pnpm add @gameowermedia/overplayer
```

### Peer Dependencies

React 18+ is required:

```bash
npm install react react-dom
```

---

## Quick Start

```tsx
import { OverPlayer } from "@gameowermedia/overplayer";

const tracks = [
  { src: "/audio/track-01.mp3", title: "Opening Theme", artist: "Artist" },
  { src: "/audio/track-02.mp3", title: "Second Wind" },
  { src: "/audio/track-03.mp3", title: "Finale" },
];

export default function App() {
  return (
    <div>
      <h1>My App</h1>
      <OverPlayer tracks={tracks} />
    </div>
  );
}
```

The player renders as a fixed bottom bar — drop it anywhere in your component tree.

---

## Themes

### Dark (default)

```tsx
<OverPlayer tracks={tracks} theme="dark" />
```

### Light

```tsx
<OverPlayer tracks={tracks} theme="light" />
```

### Auto (follows OS)

```tsx
<OverPlayer tracks={tracks} theme="auto" />
```

Listens to `prefers-color-scheme` and switches live when the OS preference changes.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `N` | Next track |
| `P` | Previous track |
| `M` | Mute / Unmute |
| `L` | Toggle playlist |
| `Arrow Left` | Seek -5 seconds |
| `Arrow Right` | Seek +5 seconds |
| `Arrow Up` | Volume up |
| `Arrow Down` | Volume down |

Shortcuts are enabled by default. Disable with `keyboardShortcuts={false}`.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tracks` | `Track[]` | **required** | Array of tracks to play |
| `theme` | `"dark" \| "light" \| "auto"` | `"dark"` | Color theme |
| `shuffle` | `boolean` | `true` | Enable shuffle by default |
| `autoplay` | `boolean` | `true` | Attempt autoplay on load |
| `volume` | `number` | `0.3` | Initial volume (0–1) |
| `storageKey` | `string` | `"overplayer"` | Session storage key for persistence |
| `accentColor` | `string` | `"#00e5ff"` | Primary accent color |
| `accentColorAlt` | `string` | `"#ff2d7b"` | Secondary accent color |
| `brandLabel` | `string` | `"OverPlayer"` | Label on the right side |
| `subtitle` | `string` | — | Text shown next to track title |
| `className` | `string` | — | Additional CSS class |
| `footer` | `ReactNode` | — | Custom element below the player |
| `keyboardShortcuts` | `boolean` | `true` | Enable keyboard shortcuts |
| `onTrackChange` | `(track, index) => void` | — | Called when track changes |
| `onPlay` | `() => void` | — | Called on play |
| `onPause` | `() => void` | — | Called on pause |
| `onEnd` | `() => void` | — | Called when track ends naturally |

### Track

```ts
interface Track {
  src: string;      // URL or path to audio file
  title: string;    // Display title
  artist?: string;  // Optional artist name
  cover?: string;   // Optional cover art URL
  live?: boolean;   // Hint that this is a live stream (auto-detected if omitted)
}
```

---

## Headless Hook

Build your own player UI with full access to state and controls:

```tsx
import { useOverPlayer } from "@gameowermedia/overplayer";

function CustomPlayer() {
  const [state, controls, tracks] = useOverPlayer({
    tracks: myTracks,
    shuffle: true,
    volume: 0.5,
  });

  return (
    <div>
      <p>Now playing: {state.currentTrack?.title}</p>
      <p>{formatTime(state.currentTime)} / {formatTime(state.duration)}</p>
      <button onClick={controls.toggle}>
        {state.playing ? "Pause" : "Play"}
      </button>
      <button onClick={controls.next}>Next</button>
      <button onClick={controls.prev}>Prev</button>
      <input
        type="range"
        min={0}
        max={state.duration}
        value={state.currentTime}
        onChange={(e) => controls.seek(Number(e.target.value))}
      />
    </div>
  );
}
```

### Controls

| Method | Description |
|--------|-------------|
| `play()` | Start playback |
| `pause()` | Pause playback |
| `toggle()` | Toggle play/pause |
| `next()` | Next track |
| `prev()` | Previous track |
| `seek(time)` | Seek to time in seconds |
| `setVolume(vol)` | Set volume (0–1) |
| `toggleMute()` | Toggle mute |
| `toggleShuffle()` | Toggle shuffle mode |
| `toggleRepeat()` | Toggle repeat one |
| `jumpTo(index)` | Jump to track by index |

### State

| Field | Type | Description |
|-------|------|-------------|
| `playing` | `boolean` | Is audio playing |
| `currentTrack` | `Track \| null` | Current track object |
| `trackIndex` | `number` | Current track index |
| `currentTime` | `number` | Current time in seconds |
| `duration` | `number` | Track duration in seconds |
| `volume` | `number` | Current volume (0–1) |
| `muted` | `boolean` | Is muted |
| `shuffleOn` | `boolean` | Is shuffle enabled |
| `repeatOne` | `boolean` | Is repeat one enabled |
| `isLive` | `boolean` | Is current track a live stream |

---

## Examples

### Live Radio Streams

```tsx
const tracks = [
  { src: "/audio/intro.mp3", title: "Welcome", artist: "Host" },
  { src: "https://ice1.somafm.com/groovesalad-128-mp3", title: "Groove Salad", artist: "SomaFM", live: true },
  { src: "https://ice1.somafm.com/defcon-128-mp3", title: "DEF CON Radio", artist: "SomaFM", live: true },
];

<OverPlayer tracks={tracks} brandLabel="OpenWebRadio" />
```

Live streams automatically hide the seek bar and show a pulsing LIVE badge. Set `live: true` explicitly, or let the player auto-detect from the stream's infinite duration.

### With Cover Art

```tsx
const tracks = [
  {
    src: "/audio/track-01.mp3",
    title: "Opening Theme",
    artist: "Artist",
    cover: "/covers/track-01.jpg",
  },
];

<OverPlayer tracks={tracks} />
```

### Event Callbacks

```tsx
<OverPlayer
  tracks={tracks}
  onTrackChange={(track, index) => console.log(`Now playing: ${track.title}`)}
  onPlay={() => analytics.track("play")}
  onPause={() => analytics.track("pause")}
/>
```

### Custom Colors

```tsx
<OverPlayer
  tracks={tracks}
  theme="light"
  accentColor="#6366f1"
  accentColorAlt="#ec4899"
  brandLabel="MyRadio"
/>
```

### Multiple Playlists

```tsx
<OverPlayer tracks={podcastTracks} storageKey="podcast-player" brandLabel="Podcasts" />
<OverPlayer tracks={musicTracks} storageKey="music-player" brandLabel="Music" />
```

### Next.js / App Router

```tsx
// app/layout.tsx
import { OverPlayer } from "@gameowermedia/overplayer";
import { tracks } from "@/lib/tracks";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <OverPlayer tracks={tracks} theme="auto" />
      </body>
    </html>
  );
}
```

---

## How It Works

- **Global singleton audio** — one `HTMLAudioElement` per `storageKey`, persists across React remounts
- **Session storage** — track order, position, and playing state saved every 500ms
- **Autoplay unlock** — registers one-time listeners on user interaction events to resume playback
- **Progress bar** — uses `timeupdate` events for real-time progress, click-to-seek on the bar
- **Playlist drawer** — animated slide-up panel with track list and playing indicator
- **Keyboard shortcuts** — global `keydown` listener, ignored when focus is in inputs/textareas
- **Live stream detection** — auto-detects infinite duration streams, hides seek bar, shows pulsing LIVE badge

---

## Development

```bash
git clone https://github.com/GameOwerMedia/OpenWebRadio.git
cd OpenWebRadio
npm install
npm run dev        # watch mode
npm run build      # production build
npm run typecheck  # type checking
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) — Created by [OverJK](https://github.com/GameOwerMedia)
