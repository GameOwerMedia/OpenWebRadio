<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://github.com/GameOwerMedia/OpenWebRadio/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/GameOwerMedia/OpenWebRadio/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="React 18 or newer" src="https://img.shields.io/badge/react-%E2%89%A518-61dafb.svg">
  <img alt="TypeScript" src="https://img.shields.io/badge/types-TypeScript-3178c6.svg">
  <img alt="No dependencies" src="https://img.shields.io/badge/dependencies-none-brightgreen.svg">
</p>

**OpenWebRadio** is one React component that puts an audio player at the bottom of your site: audio files and Icecast or Shoutcast radio streams in one playlist, a LIVE badge instead of a seek bar for streams, and playback that keeps going while visitors move between pages.

**[Live demo](https://gameowermedia.github.io/OpenWebRadio/)** (two SomaFM stations and three local tracks)

## Why

Putting music or a radio stream on a website looks like one `<audio>` tag until a visitor clicks a link. In a single-page app the component remounts and the sound stops; on reload the track starts from zero; a live stream shows a broken progress bar with an infinite duration. OpenWebRadio handles those cases for you:

- **It keeps playing.** The audio element lives outside React, keyed by `storageKey`, so remounts and client-side navigation do not restart it.
- **It picks up where you left off.** The current track, position, play state and shuffled order are saved to `sessionStorage` every half second and restored on reload in the same tab.
- **It knows a stream from a file.** A track with `live: true`, or any source whose duration is infinite, gets a pulsing LIVE badge; the seek bar and arrow-key seeking are turned off for it.
- **It respects autoplay rules.** If the browser blocks autoplay, the player starts on the visitor's first click, key press, scroll or touch.
- **It stays out of your bundle.** No runtime dependencies; React 18 or newer is the only peer dependency. Styles are inline, so there is no CSS file to import.

## Install

The package `@gameowermedia/overplayer` is not on npm yet. Until it is, build it from this repository and install the tarball:

```bash
git clone https://github.com/GameOwerMedia/OpenWebRadio
cd OpenWebRadio
npm install
npm run build        # writes dist/ (CommonJS, ES module and type definitions)
npm pack             # writes gameowermedia-overplayer-1.2.0.tgz
```

Then, in your project:

```bash
npm install /path/to/OpenWebRadio/gameowermedia-overplayer-1.2.0.tgz
```

The import name stays `@gameowermedia/overplayer`, so nothing changes in your code once it is published.

## Quick start

```tsx
import { OverPlayer } from "@gameowermedia/overplayer";

<OverPlayer
  tracks={[
    { src: "/audio/track-01.mp3", title: "Opening Theme", artist: "Artist" },
    { src: "https://ice1.somafm.com/groovesalad-128-mp3", title: "Groove Salad", artist: "SomaFM", live: true },
  ]}
  theme="auto"
  brandLabel="OpenWebRadio"
/>
```

Put it in a layout that every page shares, so it is mounted once for the whole site.

The player needs the browser's `Audio` object and cannot be rendered on the server. In the Next.js App Router, load it from a client component with server rendering turned off:

```tsx
// app/player.tsx
"use client";
import dynamic from "next/dynamic";
const OverPlayer = dynamic(() => import("@gameowermedia/overplayer").then((m) => m.OverPlayer), { ssr: false });
export default function Player() {
  return <OverPlayer tracks={tracks} theme="auto" />;
}
```

Then render `<Player />` in `app/layout.tsx`.

## How it works

1. **One audio element per `storageKey`.** The first mount creates an `Audio` object and stores it in a module-level map. Later mounts with the same key reuse it, so the sound and its state survive remounts.
2. **Order and position.** On creation the playlist is shuffled (if `shuffle` is on) and the order is saved. A saved order and position from `sessionStorage` are restored when they still match the `tracks` you pass.
3. **Live detection.** On every track change and `loadedmetadata`, the player checks `track.live` and, if it is not set, whether `audio.duration` is finite.
4. **Interface.** A bar fixed to the bottom of the page with cover art, title, time or LIVE badge, play, previous, next, shuffle, repeat-one, volume and a playlist drawer. It can be minimized to a small floating button. `theme="auto"` follows `prefers-color-scheme` and switches live.
5. **Accessibility.** Controls have ARIA labels, track changes are announced through a polite live region, and the LIVE pulse stops under `prefers-reduced-motion`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tracks` | `Track[]` | **required** | tracks to play |
| `theme` | `"dark" \| "light" \| "auto"` | `"dark"` | color theme; `auto` follows the OS |
| `shuffle` | `boolean` | `true` | shuffle on by default |
| `autoplay` | `boolean` | `true` | try to play on load; falls back to the first interaction |
| `volume` | `number` | `0.3` | initial volume, 0 to 1 |
| `storageKey` | `string` | `"overplayer"` | key for the shared audio element and `sessionStorage`; use a different one per player |
| `accentColor` | `string` | `"#00e5ff"` | primary accent |
| `accentColorAlt` | `string` | `"#ff2d7b"` | secondary accent |
| `brandLabel` | `string` | `"OverPlayer"` | label shown in the bar |
| `subtitle` | `string` | - | text next to the track title |
| `className` | `string` | - | extra CSS class on the root |
| `footer` | `ReactNode` | - | custom element below the player |
| `keyboardShortcuts` | `boolean` | `true` | enable keyboard shortcuts |
| `onTrackChange` | `(track, index) => void` | - | a new track started |
| `onPlay` | `() => void` | - | playback started |
| `onPause` | `() => void` | - | playback paused |
| `onEnd` | `() => void` | - | a track ended |

```ts
interface Track {
  src: string;      // URL or path to the audio file or stream
  title: string;
  artist?: string;
  cover?: string;   // cover art URL
  live?: boolean;   // live stream hint; auto-detected from the duration if omitted
}
```

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | play or pause |
| `N` / `P` | next or previous track |
| `M` | mute or unmute |
| `L` | open or close the playlist |
| `Left` / `Right` | seek 5 s back or forward (not for live streams) |
| `Up` / `Down` | volume |

Shortcuts are ignored while focus is in a text field.

## Headless hook

`useOverPlayer()` gives you the same playback engine without any UI:

```tsx
import { useOverPlayer } from "@gameowermedia/overplayer";

function CustomPlayer() {
  const [state, controls] = useOverPlayer({ tracks: myTracks, shuffle: true, volume: 0.5 });
  return (
    <div>
      <p>{state.currentTrack?.title} {state.isLive && "(LIVE)"}</p>
      <button onClick={controls.toggle}>{state.playing ? "Pause" : "Play"}</button>
      <button onClick={controls.next}>Next</button>
    </div>
  );
}
```

Controls: `play()` `pause()` `toggle()` `next()` `prev()` `seek(time)` `setVolume(vol)` `toggleMute()` `toggleShuffle()` `toggleRepeat()` `jumpTo(index)`

State: `playing` `currentTrack` `trackIndex` `currentTime` `duration` `volume` `muted` `shuffleOn` `repeatOne` `isLive`

## Examples

Two independent players on one page:

```tsx
<OverPlayer tracks={podcastTracks} storageKey="podcasts" brandLabel="Podcasts" />
<OverPlayer tracks={musicTracks} storageKey="music" brandLabel="Music" />
```

Custom colors:

```tsx
<OverPlayer tracks={tracks} theme="light" accentColor="#6366f1" accentColorAlt="#ec4899" brandLabel="MyRadio" />
```

## FAQ

**Which stream formats work?** Whatever the browser's `<audio>` element can play directly: MP3 and AAC Icecast or Shoutcast streams work everywhere. HLS (`.m3u8`) plays only where the browser supports it natively, such as Safari; there is no hls.js built in.

**Does it remember the volume?** Not yet. The track, position, play state and order are restored; the volume starts at the `volume` prop.

**Does it survive a full page load?** In the same tab, yes: the track and position come back from `sessionStorage`. The browser may block the restart until the visitor interacts with the page.

**Does it work with server-side rendering?** Not directly: the audio element is created during the first render, so render the player on the client only (see the Next.js example in Quick start).

## Limitations

- Client-only: rendering it on the server fails with `Audio is not defined`.
- State is per tab (`sessionStorage`); a new tab starts fresh.
- No Media Session integration yet, so lock-screen and hardware media keys are not wired up.
- Live detection without `live: true` depends on the stream reporting an infinite duration; set the flag explicitly for reliable behaviour.

## Development

```bash
npm install
npm run dev          # tsup in watch mode
npm run build        # production build
npm run typecheck    # tsc --noEmit
```

CI type-checks and builds on Node 18, 20 and 22. Pushing a `v*` tag runs the npm publish job (no tag has been pushed yet). See [CONTRIBUTING.md](CONTRIBUTING.md) and [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE), Copyright (c) 2026 OverJK / GameOwerMedia. Free for personal and commercial use.
