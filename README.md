# OverPlayer

A sleek, persistent audio player component for React. Fixed bottom bar with shuffle, repeat, volume control, minimizable UI, session persistence, and automatic autoplay unlock.

Born from the [Warsaw Glitch Festival](https://glitch.festival) project by [GameOwerMedia](https://github.com/GameOwerMedia).

---

## Features

- **Persistent playback** — audio survives page navigation and React remounts
- **Session restore** — remembers track, position, and playing state across page reloads
- **Shuffle & Repeat** — shuffle mode and repeat-one toggle
- **Volume control** — slider + mute toggle with volume memory
- **Minimizable** — collapses to a compact floating pill
- **Autoplay unlock** — gracefully handles browser autoplay restrictions
- **Visualizer bars** — animated mini bars when playing
- **Customizable** — accent colors, brand label, footer slot
- **Accessible** — ARIA labels, keyboard-friendly controls
- **Respects `prefers-reduced-motion`** — disables animations for users who prefer it
- **Zero dependencies** — only React as a peer dependency
- **TypeScript** — fully typed props and exports

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

The player renders as a fixed bottom bar — just drop it anywhere in your component tree.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tracks` | `Track[]` | **required** | Array of tracks to play |
| `shuffle` | `boolean` | `true` | Enable shuffle by default |
| `autoplay` | `boolean` | `true` | Attempt autoplay on load |
| `volume` | `number` | `0.3` | Initial volume (0–1) |
| `storageKey` | `string` | `"overplayer"` | Session storage key for persistence |
| `accentColor` | `string` | `"#00e5ff"` | Primary accent color (play button, active shuffle) |
| `accentColorAlt` | `string` | `"#ff2d7b"` | Secondary accent (repeat toggle, visualizer bars) |
| `brandLabel` | `string` | `"OverPlayer"` | Label on the right side of expanded player |
| `subtitle` | `string` | — | Text shown next to track title |
| `className` | `string` | — | Additional CSS class for root container |
| `footer` | `ReactNode` | — | Custom element rendered below the player |

### Track

```ts
interface Track {
  src: string;     // URL or path to audio file
  title: string;   // Display title
  artist?: string; // Optional artist name (shown as subtitle)
}
```

---

## Examples

### Custom Colors

```tsx
<OverPlayer
  tracks={tracks}
  accentColor="#ffd700"
  accentColorAlt="#ff6b35"
  brandLabel="MyRadio"
/>
```

### With Footer

```tsx
<OverPlayer
  tracks={tracks}
  footer={
    <div style={{ background: "#111", padding: "4px 12px", textAlign: "center" }}>
      <small>Powered by OverPlayer</small>
    </div>
  }
/>
```

### Multiple Playlists

Use different `storageKey` values so each player maintains its own state:

```tsx
<OverPlayer tracks={podcastTracks} storageKey="podcast-player" brandLabel="Podcasts" />
<OverPlayer tracks={musicTracks} storageKey="music-player" brandLabel="Music" />
```

### No Autoplay

```tsx
<OverPlayer tracks={tracks} autoplay={false} />
```

### Next.js / App Router

Works out of the box — the component includes `"use client"` directive. Place it in your root layout:

```tsx
// app/layout.tsx
import { OverPlayer } from "@gameowermedia/overplayer";
import { tracks } from "@/lib/tracks";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <OverPlayer tracks={tracks} />
      </body>
    </html>
  );
}
```

---

## How It Works

- **Global singleton audio** — a single `HTMLAudioElement` is created per `storageKey` and persists across React remounts, so navigation doesn't interrupt playback.
- **Session storage** — track order, current track, position, and playing state are saved every 500ms and restored on page reload.
- **Autoplay unlock** — if the browser blocks autoplay, the player registers one-time listeners on `click`, `touchstart`, `keydown`, `mousemove`, `scroll`, and `pointerdown` to resume playback on the first user interaction.

---

## Development

```bash
git clone https://github.com/GameOwerMedia/OverPlayer.git
cd OverPlayer
npm install
npm run dev      # watch mode
npm run build    # production build
npm run typecheck
```

---

## License

[MIT](./LICENSE) — GameOwerMedia
