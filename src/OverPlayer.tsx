"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { OverPlayerProps, Track } from "./types";
import {
  clampVolume,
  detectLive,
  loadPlayback,
  orderTracks,
  persistedTime,
  savePlayback,
  volumeFromSaved,
} from "./persist";

/* ═══ Utilities ═══ */

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ═══ Theme palettes ═══ */

interface ThemePalette {
  bg: string;
  bgSolid: string;
  fg: string;
  fgDim: string;
  fgMid: string;
  border: string;
  divider: string;
  vizOff: string;
  mutedColor: string;
  liveColor: string;
  progressBg: string;
  playlistBg: string;
  playlistHover: string;
  playlistActive: string;
}

const themes: Record<"dark" | "light", ThemePalette> = {
  dark: {
    bg: "rgba(10, 10, 14, 0.92)",
    bgSolid: "#0a0a0e",
    fg: "rgba(255, 255, 255, 0.7)",
    fgDim: "rgba(255, 255, 255, 0.3)",
    fgMid: "rgba(255, 255, 255, 0.5)",
    border: "rgba(255, 255, 255, 0.08)",
    divider: "rgba(255, 255, 255, 0.08)",
    vizOff: "rgba(255, 255, 255, 0.08)",
    mutedColor: "#ef4444",
    liveColor: "#ef4444",
    progressBg: "rgba(255, 255, 255, 0.08)",
    playlistBg: "rgba(10, 10, 14, 0.97)",
    playlistHover: "rgba(255, 255, 255, 0.05)",
    playlistActive: "rgba(255, 255, 255, 0.08)",
  },
  light: {
    bg: "rgba(252, 252, 253, 0.94)",
    bgSolid: "#fcfcfd",
    fg: "rgba(0, 0, 0, 0.75)",
    fgDim: "rgba(0, 0, 0, 0.3)",
    fgMid: "rgba(0, 0, 0, 0.5)",
    border: "rgba(0, 0, 0, 0.08)",
    divider: "rgba(0, 0, 0, 0.1)",
    vizOff: "rgba(0, 0, 0, 0.08)",
    mutedColor: "#dc2626",
    liveColor: "#dc2626",
    progressBg: "rgba(0, 0, 0, 0.08)",
    playlistBg: "rgba(252, 252, 253, 0.98)",
    playlistHover: "rgba(0, 0, 0, 0.04)",
    playlistActive: "rgba(0, 0, 0, 0.06)",
  },
};

/* ═══ Global audio state — survives React remounts ═══ */

interface PlayerInstance {
  audio: HTMLAudioElement;
  tracks: Track[];
  trackIndex: number;
  playing: boolean;
  hasInteracted: boolean;
  saveInterval: ReturnType<typeof setInterval> | null;
  volume: number;
  muted: boolean;
  prevVolume: number;
}

const instances = new Map<string, PlayerInstance>();

function writeInstanceState(key: string, instance: PlayerInstance) {
  const track = instance.tracks[instance.trackIndex];
  savePlayback(key, {
    src: track?.src || "",
    time: persistedTime(track?.live, instance.audio.duration, instance.audio.currentTime || 0),
    wasPlaying: instance.playing,
    volume: instance.volume,
    muted: instance.muted,
    prevVolume: instance.prevVolume,
  });
}

function getOrCreateInstance(
  key: string,
  tracks: Track[],
  initialVolume: number,
  shouldShuffle: boolean,
  autoplay: boolean
): PlayerInstance {
  const existing = instances.get(key);
  if (existing) return existing;

  if (typeof Audio === "undefined") {
    throw new Error("OpenWebRadio can only start playback in the browser");
  }
  if (tracks.length === 0) {
    throw new Error("OpenWebRadio needs at least one track");
  }

  const orderedTracks = orderTracks(key, tracks, shouldShuffle);
  const saved = loadPlayback(key);
  const restoredVolume = volumeFromSaved(saved, initialVolume);
  let restoredTime = 0;
  let restoredIndex = 0;
  let shouldPlay = autoplay;

  if (saved?.src) {
    const foundIdx = orderedTracks.findIndex((track) => track.src === saved.src);
    if (foundIdx >= 0) {
      restoredIndex = foundIdx;
      restoredTime = saved.time || 0;
      if (typeof saved.wasPlaying === "boolean") shouldPlay = saved.wasPlaying;
    }
  }

  const audio = new Audio(orderedTracks[restoredIndex].src);
  audio.volume = restoredVolume.muted ? 0 : restoredVolume.volume;
  audio.preload = "auto";
  if (restoredTime > 0) audio.currentTime = restoredTime;

  const instance: PlayerInstance = {
    audio,
    tracks: orderedTracks,
    trackIndex: restoredIndex,
    playing: false,
    hasInteracted: false,
    saveInterval: null,
    volume: restoredVolume.volume,
    muted: restoredVolume.muted,
    prevVolume: restoredVolume.prevVolume,
  };

  if (shouldPlay) {
    audio
      .play()
      .then(() => {
        instance.playing = true;
        instance.hasInteracted = true;
      })
      .catch(() => {
        const events = [
          "click",
          "touchstart",
          "keydown",
          "mousemove",
          "scroll",
          "pointerdown",
        ];
        const unlock = () => {
          if (!instance.playing) {
            audio
              .play()
              .then(() => {
                instance.playing = true;
                instance.hasInteracted = true;
              })
              .catch(() => {});
          }
          events.forEach((eventName) => document.removeEventListener(eventName, unlock));
        };
        events.forEach((eventName) =>
          document.addEventListener(eventName, unlock, { once: true, passive: true })
        );
      });
  }

  instance.saveInterval = setInterval(() => {
    writeInstanceState(key, instance);
  }, 500);

  instances.set(key, instance);
  return instance;
}

/** Drops cached audio elements so tests can simulate a fresh page load. */
export function clearInstancesForTests(): void {
  for (const instance of instances.values()) {
    if (instance.saveInterval) clearInterval(instance.saveInterval);
    instance.audio.pause();
  }
  instances.clear();
}

/* ═══ SVG Icons ═══ */

const PlayIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

const PrevIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
  </svg>
);

const NextIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const ShuffleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
  </svg>
);

const RepeatIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
);

const VolumeIcon = ({
  size = 14,
  muted,
  level,
}: {
  size?: number;
  muted: boolean;
  level: number;
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {muted || level === 0 ? (
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    ) : level < 0.5 ? (
      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
    ) : (
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    )}
  </svg>
);

const MinimizeIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 13H5v-2h14v2z" />
  </svg>
);

const ExpandIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 8l-6 6h12z" />
  </svg>
);

const PlaylistIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
  </svg>
);

/* ═══ Inline styles ═══ */

const baseStyles = {
  container: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  accentLine: { height: 1 },
  inner: {
    margin: "0 auto",
    maxWidth: 1400,
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    height: 48,
    gap: 8,
  },
  btn: {
    background: "none",
    border: "none",
    padding: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "opacity 0.15s",
    flexShrink: 0,
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
    fontSize: 13,
    letterSpacing: "0.06em",
  },
};

/* ═══ Keyframes injection ═══ */

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes overplayer-bar {
      0% { transform: scaleY(0.2); }
      100% { transform: scaleY(1); }
    }
    @keyframes overplayer-playlist-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes overplayer-live-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .overplayer-sr-only {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }
    @media (prefers-reduced-motion: reduce) {
      .overplayer-viz-bar,
      [style*="overplayer-live-pulse"],
      [style*="overplayer-playlist-in"] { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}

/* ═══ Auto theme hook ═══ */

function useResolvedTheme(theme: "dark" | "light" | "auto"): "dark" | "light" {
  // The same initial value on the server and the client. `auto` follows the OS after mount.
  const [resolved, setResolved] = useState<"dark" | "light">(theme === "light" ? "light" : "dark");

  useEffect(() => {
    if (theme !== "auto") {
      setResolved(theme);
      return;
    }
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => setResolved(e.matches ? "light" : "dark");
    setResolved(mq.matches ? "light" : "dark");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return resolved;
}

/* ═══ Component ═══ */

export function OverPlayer({
  tracks,
  theme = "dark",
  shuffle: initialShuffle = true,
  autoplay = true,
  volume: initialVolume = 0.3,
  storageKey = "overplayer",
  accentColor = "#00e5ff",
  accentColorAlt = "#ff2d7b",
  brandLabel = "OverPlayer",
  subtitle,
  className,
  footer,
  keyboardShortcuts = true,
  onTrackChange,
  onPlay,
  onPause,
  onEnd,
}: OverPlayerProps) {
  const resolvedTheme = useResolvedTheme(theme);
  const palette = themes[resolvedTheme];
  const callbacksRef = useRef({ onTrackChange, onPlay, onPause, onEnd });
  callbacksRef.current = { onTrackChange, onPlay, onPause, onEnd };
  const instanceRef = useRef<PlayerInstance | null>(null);
  const trackSignature = tracks
    .map((track) => `${track.src}\0${track.live === true ? "1" : track.live === false ? "0" : ""}`)
    .join("\n");

  const [playing, setPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [orderedTracks, setOrderedTracks] = useState(tracks);
  const [shuffleOn, setShuffleOn] = useState(initialShuffle);
  const [repeatOne, setRepeatOne] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [volume, setVolume] = useState(() => clampVolume(initialVolume));
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isLive, setIsLive] = useState(() => tracks[0]?.live === true);
  const [boundAudio, setBoundAudio] = useState<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Audio is created after mount so server rendering never evaluates `new Audio()`.
  useEffect(() => {
    injectStyles();
    if (tracks.length === 0 || typeof Audio === "undefined") return;

    const instance = getOrCreateInstance(
      storageKey,
      tracks,
      clampVolume(initialVolume),
      initialShuffle,
      autoplay
    );
    instanceRef.current = instance;
    setOrderedTracks(instance.tracks);
    setTrackIndex(instance.trackIndex);
    setPlaying(instance.playing);
    setHasInteracted(instance.hasInteracted);
    setVolume(instance.volume);
    setMuted(instance.muted);
    setCurrentTime(instance.audio.currentTime || 0);
    setDuration(Number.isFinite(instance.audio.duration) ? instance.audio.duration : 0);
    setBoundAudio(instance.audio);

    const track = instance.tracks[instance.trackIndex];
    setIsLive(detectLive(track?.live, instance.audio.duration));

    const audio = instance.audio;
    const checkLive = () => {
      const current = instance.tracks[instance.trackIndex];
      setIsLive(detectLive(current?.live, audio.duration));
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      checkLive();
    };
    const onLoadedMeta = () => { setDuration(audio.duration || 0); checkLive(); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMeta);

    const syncId = setInterval(() => {
      setPlaying(instance.playing);
      setHasInteracted(instance.hasInteracted);
    }, 300);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      clearInterval(syncId);
      setBoundAudio((current) => (current === audio ? null : current));
    };
    // The shared audio element is keyed by storageKey and reused across remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, trackSignature]);

  // Handle track end
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !boundAudio || instance.audio !== boundAudio) return;
    const audio = instance.audio;

    const onEnded = () => {
      callbacksRef.current.onEnd?.();
      if (repeatOne) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (instance.tracks.length === 0) return;
      let nextIndex: number;
      if (shuffleOn) {
        nextIndex = Math.floor(Math.random() * instance.tracks.length);
        if (nextIndex === instance.trackIndex && instance.tracks.length > 1)
          nextIndex = (nextIndex + 1) % instance.tracks.length;
      } else {
        nextIndex = (instance.trackIndex + 1) % instance.tracks.length;
      }
      instance.trackIndex = nextIndex;
      setTrackIndex(nextIndex);
      audio.src = instance.tracks[nextIndex].src;
      audio.play().catch(() => {});
      writeInstanceState(storageKey, instance);
      callbacksRef.current.onTrackChange?.(instance.tracks[nextIndex], nextIndex);
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [boundAudio, trackIndex, repeatOne, shuffleOn, storageKey]);

  const toggle = useCallback(() => {
    const instance = instanceRef.current;
    if (!instance) return;
    const audio = instance.audio;
    if (playing) {
      audio.pause();
      instance.playing = false;
      setPlaying(false);
      writeInstanceState(storageKey, instance);
      callbacksRef.current.onPause?.();
    } else {
      audio
        .play()
        .then(() => {
          instance.playing = true;
          instance.hasInteracted = true;
          setPlaying(true);
          setHasInteracted(true);
          writeInstanceState(storageKey, instance);
          callbacksRef.current.onPlay?.();
        })
        .catch(() => {});
    }
  }, [playing, storageKey]);

  const nextTrack = useCallback(() => {
    const instance = instanceRef.current;
    if (!instance || instance.tracks.length === 0) return;
    const audio = instance.audio;
    const nextIdx = (trackIndex + 1) % instance.tracks.length;
    instance.trackIndex = nextIdx;
    setTrackIndex(nextIdx);
    audio.src = instance.tracks[nextIdx].src;
    if (playing) audio.play().catch(() => {});
    writeInstanceState(storageKey, instance);
    callbacksRef.current.onTrackChange?.(instance.tracks[nextIdx], nextIdx);
  }, [trackIndex, playing, storageKey]);

  const prevTrack = useCallback(() => {
    const instance = instanceRef.current;
    if (!instance || instance.tracks.length === 0) return;
    const audio = instance.audio;
    const prevIdx = (trackIndex - 1 + instance.tracks.length) % instance.tracks.length;
    instance.trackIndex = prevIdx;
    setTrackIndex(prevIdx);
    audio.src = instance.tracks[prevIdx].src;
    if (playing) audio.play().catch(() => {});
    writeInstanceState(storageKey, instance);
    callbacksRef.current.onTrackChange?.(instance.tracks[prevIdx], prevIdx);
  }, [trackIndex, playing, storageKey]);

  const jumpTo = useCallback(
    (index: number) => {
      const instance = instanceRef.current;
      if (!instance || index < 0 || index >= instance.tracks.length) return;
      const audio = instance.audio;
      instance.trackIndex = index;
      setTrackIndex(index);
      audio.src = instance.tracks[index].src;
      audio.play().then(() => {
        instance.playing = true;
        instance.hasInteracted = true;
        setPlaying(true);
        setHasInteracted(true);
        writeInstanceState(storageKey, instance);
      }).catch(() => {});
      setShowPlaylist(false);
      callbacksRef.current.onTrackChange?.(instance.tracks[index], index);
    },
    [storageKey]
  );

  const changeVolume = useCallback(
    (val: number) => {
      const instance = instanceRef.current;
      if (!instance) return;
      const clamped = clampVolume(val, 0);
      instance.volume = clamped;
      instance.muted = clamped === 0;
      if (clamped > 0) instance.prevVolume = clamped;
      instance.audio.volume = clamped;
      setVolume(clamped);
      setMuted(clamped === 0);
      writeInstanceState(storageKey, instance);
    },
    [storageKey]
  );

  const toggleMute = useCallback(() => {
    const instance = instanceRef.current;
    if (!instance) return;
    if (instance.muted) {
      const restored = instance.prevVolume || 0.3;
      instance.volume = restored;
      instance.muted = false;
      instance.audio.volume = restored;
      setVolume(restored);
      setMuted(false);
    } else {
      instance.prevVolume = instance.volume || 0.3;
      instance.volume = 0;
      instance.muted = true;
      instance.audio.volume = 0;
      setVolume(0);
      setMuted(true);
    }
    writeInstanceState(storageKey, instance);
  }, [storageKey]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const instance = instanceRef.current;
      const bar = progressRef.current;
      if (!instance || !bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      instance.audio.currentTime = ratio * duration;
    },
    [duration]
  );

  const handleSliderKey = useCallback(
    (e: React.KeyboardEvent) => {
      const instance = instanceRef.current;
      if (!instance || !duration) return;
      if (e.key === "ArrowRight") { e.preventDefault(); instance.audio.currentTime = Math.min(instance.audio.currentTime + 5, duration); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); instance.audio.currentTime = Math.max(instance.audio.currentTime - 5, 0); }
    },
    [duration]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handler = (e: KeyboardEvent) => {
      const instance = instanceRef.current;
      if (!instance) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          toggle();
          break;
        case "ArrowRight":
          if (isLive) break;
          e.preventDefault();
          instance.audio.currentTime = Math.min(
            instance.audio.currentTime + 5,
            instance.audio.duration || 0
          );
          break;
        case "ArrowLeft":
          if (isLive) break;
          e.preventDefault();
          instance.audio.currentTime = Math.max(instance.audio.currentTime - 5, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(Math.min((instance.audio.volume || 0) + 0.05, 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(Math.max((instance.audio.volume || 0) - 0.05, 0));
          break;
        case "KeyN":
          nextTrack();
          break;
        case "KeyP":
          prevTrack();
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyL":
          setShowPlaylist((open) => !open);
          break;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [keyboardShortcuts, playing, trackIndex, muted, volume, isLive, toggle, nextTrack, prevTrack, changeVolume, toggleMute]);

  const currentTrack = orderedTracks[trackIndex] ?? orderedTracks[0];
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  /* ─── Minimized mode ─── */
  if (minimized) {
    return (
      <div className={className}>
        {footer}
        <div
          style={{
            position: "fixed" as const,
            bottom: 16,
            right: 16,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 2,
            backdropFilter: "blur(16px)",
            border: `1px solid ${palette.border}`,
            borderRadius: 9999,
            padding: "2px 4px",
            background: palette.bg,
          }}
        >
          {currentTrack?.cover && (
            <img
              src={currentTrack.cover}
              alt=""
              style={{ width: 20, height: 20, borderRadius: 9999, objectFit: "cover", marginLeft: 4 }}
            />
          )}
          {isLive && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: palette.liveColor, flexShrink: 0, marginLeft: 4, animation: playing ? "overplayer-live-pulse 2s ease-in-out infinite" : "none" }} />
          )}
          <button onClick={prevTrack} style={{ ...baseStyles.btn, padding: 10, color: palette.fgDim }} aria-label="Previous track">
            <PrevIcon size={12} />
          </button>
          <button onClick={toggle} style={{ ...baseStyles.btn, padding: 10, color: accentColor }} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon size={16} color={accentColor} /> : <PlayIcon size={16} color={accentColor} />}
          </button>
          <button onClick={nextTrack} style={{ ...baseStyles.btn, padding: 10, color: palette.fgDim }} aria-label="Next track">
            <NextIcon size={12} />
          </button>
          <div style={{ width: 1, height: 16, background: palette.divider, margin: "0 2px" }} />
          <button onClick={() => setMinimized(false)} style={{ ...baseStyles.btn, padding: 10, color: palette.fgDim }} aria-label="Expand player">
            <ExpandIcon />
          </button>
        </div>
      </div>
    );
  }

  /* ─── Full player ─── */
  return (
    <div style={baseStyles.container} className={className}>
      {/* Playlist drawer */}
      {showPlaylist && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            maxHeight: 280,
            overflowY: "auto",
            background: palette.playlistBg,
            backdropFilter: "blur(24px)",
            borderTop: `1px solid ${palette.border}`,
            animation: "overplayer-playlist-in 0.2s ease-out",
          }}
        >
          <div style={{ margin: "0 auto", maxWidth: 1400, padding: "8px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: palette.fgDim, fontWeight: 600 }}>
                Playlist ({orderedTracks.length})
              </span>
              <span style={{ fontSize: 10, color: palette.fgDim }}>
                Press L to toggle
              </span>
            </div>
            {orderedTracks.map((track, i) => (
              <button
                key={`${track.src}-${i}`}
                onClick={() => jumpTo(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: i === trackIndex ? palette.playlistActive : "transparent",
                  color: i === trackIndex ? accentColor : palette.fg,
                  fontSize: 13,
                  textAlign: "left" as const,
                  letterSpacing: "0.03em",
                  transition: "background 0.12s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  if (i !== trackIndex)
                    (e.currentTarget as HTMLElement).style.background = palette.playlistHover;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    i === trackIndex ? palette.playlistActive : "transparent";
                }}
              >
                {/* Track number or playing indicator */}
                <span style={{ width: 20, textAlign: "center", flexShrink: 0, fontSize: 11, color: i === trackIndex ? accentColor : palette.fgDim }}>
                  {i === trackIndex && playing ? (
                    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 1, height: 12 }}>
                      {[0, 1, 2].map((b) => (
                        <span
                          key={b}
                          className="overplayer-viz-bar"
                          style={{
                            display: "inline-block",
                            width: 2,
                            background: accentColor,
                            borderRadius: "1px 1px 0 0",
                            height: "100%",
                            animation: `overplayer-bar ${0.3 + b * 0.15}s ease-in-out infinite alternate`,
                          }}
                        />
                      ))}
                    </span>
                  ) : (
                    i + 1
                  )}
                </span>
                {/* Cover art */}
                {track.cover && (
                  <img src={track.cover} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                )}
                {/* Title + artist */}
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {track.title}
                  {track.live && (
                    <span style={{ fontSize: 8, background: palette.liveColor, color: "#fff", padding: "1px 4px", borderRadius: 2, marginLeft: 6, fontWeight: 700, verticalAlign: "middle", letterSpacing: "0.05em" }}>LIVE</span>
                  )}
                  {track.artist && (
                    <span style={{ color: palette.fgDim, marginLeft: 8, fontSize: 12 }}>{track.artist}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar (seekable) — hidden for live streams */}
      {!isLive && (
        <div
          ref={progressRef}
          onClick={handleSeek}
          onKeyDown={handleSliderKey}
          style={{
            height: 3,
            background: palette.progressBg,
            cursor: "pointer",
            position: "relative",
          }}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          tabIndex={0}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: `linear-gradient(to right, ${accentColor}, ${accentColorAlt})`,
              borderRadius: "0 1px 1px 0",
              transition: "width 0.15s linear",
              position: "relative",
            }}
          >
            {/* Thumb dot */}
            <div
              style={{
                position: "absolute",
                right: -4,
                top: -3,
                width: 9,
                height: 9,
                borderRadius: 9999,
                background: accentColor,
                boxShadow: `0 0 6px ${accentColor}60`,
              }}
            />
          </div>
        </div>
      )}

      {/* Top accent line */}
      <div
        style={{
          ...baseStyles.accentLine,
          background: `linear-gradient(to right, ${accentColor}50, ${accentColorAlt}50, ${accentColor}50)`,
        }}
      />

      <div
        style={{
          backdropFilter: "blur(24px)",
          borderTop: `1px solid ${palette.border}`,
          background: palette.bg,
        }}
      >
        <div style={baseStyles.inner}>
          {/* Cover art */}
          {currentTrack?.cover && (
            <img
              src={currentTrack.cover}
              alt=""
              style={{
                width: 34,
                height: 34,
                borderRadius: 4,
                objectFit: "cover",
                flexShrink: 0,
                border: `1px solid ${palette.border}`,
              }}
            />
          )}

          {/* Prev */}
          <button onClick={prevTrack} style={{ ...baseStyles.btn, color: palette.fgMid }} aria-label="Previous track (P)">
            <PrevIcon />
          </button>

          {/* Play / Pause */}
          <button onClick={toggle} style={{ ...baseStyles.btn, color: accentColor }} aria-label={playing ? "Pause (Space)" : "Play (Space)"}>
            {playing ? <PauseIcon color={accentColor} /> : <PlayIcon color={accentColor} />}
          </button>

          {/* Next */}
          <button onClick={nextTrack} style={{ ...baseStyles.btn, color: palette.fgMid }} aria-label="Next track (N)">
            <NextIcon />
          </button>

          {/* Shuffle */}
          <button
            onClick={() => setShuffleOn(!shuffleOn)}
            style={{ ...baseStyles.btn, color: shuffleOn ? accentColor : palette.fgDim }}
            aria-label={shuffleOn ? "Shuffle on" : "Shuffle off"}
            title={shuffleOn ? "Shuffle: ON" : "Shuffle: OFF"}
          >
            <ShuffleIcon />
          </button>

          {/* Repeat One */}
          <button
            onClick={() => setRepeatOne(!repeatOne)}
            style={{ ...baseStyles.btn, color: repeatOne ? accentColorAlt : palette.fgDim, position: "relative" }}
            aria-label={repeatOne ? "Repeat one on" : "Repeat off"}
            title={repeatOne ? "Repeat: ONE" : "Repeat: OFF"}
          >
            <RepeatIcon />
            {repeatOne && (
              <span style={{ position: "absolute", fontSize: 6, fontWeight: "bold", top: 4, right: 2, color: accentColorAlt }}>1</span>
            )}
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: palette.divider, flexShrink: 0 }} />

          {/* Mini visualizer bars */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16, flexShrink: 0 }}>
            {playing
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="overplayer-viz-bar"
                    style={{
                      width: 2,
                      borderRadius: "1px 1px 0 0",
                      background: i % 2 === 0 ? accentColor : accentColorAlt,
                      opacity: 0.8,
                      height: "100%",
                      animation: `overplayer-bar ${0.3 + i * 0.12}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))
              : Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ width: 2, height: 4, borderRadius: "1px 1px 0 0", background: palette.vizOff }} />
                ))}
          </div>

          {/* Time elapsed or LIVE badge */}
          {isLive ? (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#fff",
              background: palette.liveColor, padding: "2px 6px", borderRadius: 3, flexShrink: 0,
              textTransform: "uppercase" as const,
              animation: playing ? "overplayer-live-pulse 2s ease-in-out infinite" : "none",
            }}>
              LIVE
            </span>
          ) : (
            <span style={{ fontSize: 10, color: palette.fgDim, flexShrink: 0, fontVariantNumeric: "tabular-nums", minWidth: 32 }}>
              {formatTime(currentTime)}
            </span>
          )}

          {/* Track info */}
          <div style={{ ...baseStyles.trackInfo, color: palette.fg }}>
            {hasInteracted ? currentTrack?.title : tracks[0]?.title || ""}
            {(subtitle || currentTrack?.artist) && (
              <span style={{ color: palette.fgDim, marginLeft: 8 }}>
                {subtitle || currentTrack?.artist}
              </span>
            )}
          </div>

          {/* Time remaining — hidden for live */}
          {!isLive && (
            <span style={{ fontSize: 10, color: palette.fgDim, flexShrink: 0, fontVariantNumeric: "tabular-nums", minWidth: 38 }}>
              -{formatTime(Math.max(0, duration - currentTime))}
            </span>
          )}

          {/* Volume */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              onClick={toggleMute}
              style={{ ...baseStyles.btn, padding: 6, color: muted ? palette.mutedColor : palette.fgDim }}
              aria-label={muted ? "Unmute (M)" : "Mute (M)"}
            >
              <VolumeIcon muted={muted} level={volume} />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              style={{ width: 56, height: 4, cursor: "pointer", accentColor: accentColor }}
              aria-label="Volume"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: palette.divider, flexShrink: 0 }} />

          {/* Playlist toggle */}
          <button
            onClick={() => setShowPlaylist(!showPlaylist)}
            style={{ ...baseStyles.btn, color: showPlaylist ? accentColor : palette.fgDim }}
            aria-label="Toggle playlist (L)"
            title="Playlist"
          >
            <PlaylistIcon />
          </button>

          {/* Minimize */}
          <button
            onClick={() => { setMinimized(true); setShowPlaylist(false); }}
            style={{ ...baseStyles.btn, color: palette.fgDim }}
            aria-label="Minimize player"
          >
            <MinimizeIcon />
          </button>

          {/* Brand label */}
          {brandLabel && (
            <span style={{ fontSize: 11, letterSpacing: "0.08em", color: palette.fgDim, marginLeft: 4, flexShrink: 0 }}>
              {brandLabel}
            </span>
          )}
        </div>
      </div>

      {footer}

      {/* Screen reader track announcements */}
      <div className="overplayer-sr-only" aria-live="polite" aria-atomic="true">
        {hasInteracted && currentTrack ? `Now playing: ${currentTrack.title}${currentTrack.artist ? ` by ${currentTrack.artist}` : ""}${isLive ? " (live)" : ""}` : ""}
      </div>
    </div>
  );
}
