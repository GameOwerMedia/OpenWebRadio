"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { OverPlayerProps, Track } from "./types";

/* ═══ Utilities ═══ */

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ═══ Global audio state — survives React remounts ═══ */

const instances = new Map<
  string,
  {
    audio: HTMLAudioElement;
    tracks: Track[];
    trackIndex: number;
    playing: boolean;
    hasInteracted: boolean;
    saveInterval: ReturnType<typeof setInterval> | null;
  }
>();

function getOrCreateInstance(
  key: string,
  tracks: Track[],
  initialVolume: number,
  shouldShuffle: boolean,
  autoplay: boolean
) {
  if (instances.has(key)) return instances.get(key)!;

  let orderedTracks: Track[];
  let restoredTime = 0;
  let restoredIndex = 0;
  let shouldPlay = autoplay;

  // Try to restore saved track order
  if (typeof window !== "undefined") {
    try {
      const savedOrder = sessionStorage.getItem(`${key}-order`);
      if (savedOrder) {
        const order: string[] = JSON.parse(savedOrder);
        const restored = order
          .map((src) => tracks.find((t) => t.src === src))
          .filter(Boolean) as Track[];
        if (restored.length === tracks.length) {
          orderedTracks = restored;
        } else {
          orderedTracks = shouldShuffle ? shuffleArray(tracks) : [...tracks];
        }
      } else {
        orderedTracks = shouldShuffle ? shuffleArray(tracks) : [...tracks];
      }
    } catch {
      orderedTracks = shouldShuffle ? shuffleArray(tracks) : [...tracks];
    }

    // Restore playback position
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const { src, time, wasPlaying } = JSON.parse(saved);
        const foundIdx = orderedTracks.findIndex((t) => t.src === src);
        if (foundIdx >= 0) {
          restoredIndex = foundIdx;
          restoredTime = time || 0;
          shouldPlay = wasPlaying;
        }
      }
    } catch {}

    // Save track order
    try {
      sessionStorage.setItem(
        `${key}-order`,
        JSON.stringify(orderedTracks.map((t) => t.src))
      );
    } catch {}
  } else {
    orderedTracks = shouldShuffle ? shuffleArray(tracks) : [...tracks];
  }

  const audio = new Audio(orderedTracks[restoredIndex].src);
  audio.volume = initialVolume;
  audio.preload = "auto";

  if (restoredTime > 0) {
    audio.currentTime = restoredTime;
  }

  const instance = {
    audio,
    tracks: orderedTracks,
    trackIndex: restoredIndex,
    playing: false,
    hasInteracted: false,
    saveInterval: null as ReturnType<typeof setInterval> | null,
  };

  // Attempt autoplay
  if (shouldPlay) {
    audio
      .play()
      .then(() => {
        instance.playing = true;
        instance.hasInteracted = true;
      })
      .catch(() => {
        // Unlock on user interaction
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
          events.forEach((e) => document.removeEventListener(e, unlock));
        };
        events.forEach((e) =>
          document.addEventListener(e, unlock, { once: true, passive: true })
        );
      });
  }

  // Persist state periodically
  instance.saveInterval = setInterval(() => {
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          src: instance.tracks[instance.trackIndex]?.src || "",
          time: instance.audio.currentTime || 0,
          wasPlaying: instance.playing,
        })
      );
    } catch {}
  }, 500);

  instances.set(key, instance);
  return instance;
}

/* ═══ SVG Icons ═══ */

const PlayIcon = ({ size = 20, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    aria-hidden="true"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ size = 20, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    aria-hidden="true"
  >
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

const PrevIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
  </svg>
);

const NextIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const ShuffleIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
  </svg>
);

const RepeatIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
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
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
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
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19 13H5v-2h14v2z" />
  </svg>
);

const ExpandIcon = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 8l-6 6h12z" />
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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  accentLine: {
    height: 1,
  },
  bar: {
    backdropFilter: "blur(24px)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
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
  divider: {
    width: 1,
    height: 20,
    background: "rgba(255,255,255,0.08)",
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
  volumeSlider: {
    width: 56,
    height: 4,
    cursor: "pointer",
    accentColor: "var(--overplayer-accent, #00e5ff)",
  },
  miniContainer: {
    position: "fixed" as const,
    bottom: 16,
    right: 16,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: 2,
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 9999,
    padding: "2px 4px",
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
    @media (prefers-reduced-motion: reduce) {
      .overplayer-viz-bar {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ═══ Component ═══ */

export function OverPlayer({
  tracks,
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
}: OverPlayerProps) {
  const instance = getOrCreateInstance(
    storageKey,
    tracks,
    initialVolume,
    initialShuffle,
    autoplay
  );

  const [playing, setPlaying] = useState(instance.playing);
  const [hasInteracted, setHasInteracted] = useState(instance.hasInteracted);
  const [trackIndex, setTrackIndex] = useState(instance.trackIndex);
  const [shuffleOn, setShuffleOn] = useState(initialShuffle);
  const [repeatOne, setRepeatOne] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [muted, setMuted] = useState(false);
  const prevVolumeRef = useRef(initialVolume);

  useEffect(() => {
    injectStyles();
  }, []);

  // Sync state from global instance
  useEffect(() => {
    setPlaying(instance.playing);
    setHasInteracted(instance.hasInteracted);
    setTrackIndex(instance.trackIndex);

    const syncId = setInterval(() => {
      if (instance.playing !== playing) setPlaying(instance.playing);
      if (instance.hasInteracted !== hasInteracted)
        setHasInteracted(instance.hasInteracted);
    }, 300);

    return () => clearInterval(syncId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle track end
  useEffect(() => {
    const audio = instance.audio;

    const onEnded = () => {
      if (repeatOne) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      let nextIndex: number;
      if (shuffleOn) {
        nextIndex = Math.floor(Math.random() * instance.tracks.length);
        if (
          nextIndex === instance.trackIndex &&
          instance.tracks.length > 1
        ) {
          nextIndex = (nextIndex + 1) % instance.tracks.length;
        }
      } else {
        nextIndex = (instance.trackIndex + 1) % instance.tracks.length;
      }
      instance.trackIndex = nextIndex;
      setTrackIndex(nextIndex);
      audio.src = instance.tracks[nextIndex].src;
      audio.play().catch(() => {});
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex, repeatOne, shuffleOn]);

  const toggle = useCallback(() => {
    const audio = instance.audio;
    if (playing) {
      audio.pause();
      instance.playing = false;
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          instance.playing = true;
          instance.hasInteracted = true;
          setPlaying(true);
          setHasInteracted(true);
        })
        .catch(() => {});
    }
  }, [playing, instance]);

  const nextTrack = useCallback(() => {
    const audio = instance.audio;
    const nextIdx = (trackIndex + 1) % instance.tracks.length;
    instance.trackIndex = nextIdx;
    setTrackIndex(nextIdx);
    audio.src = instance.tracks[nextIdx].src;
    if (playing) audio.play().catch(() => {});
  }, [trackIndex, playing, instance]);

  const prevTrack = useCallback(() => {
    const audio = instance.audio;
    const prevIdx =
      (trackIndex - 1 + instance.tracks.length) % instance.tracks.length;
    instance.trackIndex = prevIdx;
    setTrackIndex(prevIdx);
    audio.src = instance.tracks[prevIdx].src;
    if (playing) audio.play().catch(() => {});
  }, [trackIndex, playing, instance]);

  const changeVolume = useCallback(
    (val: number) => {
      instance.audio.volume = val;
      setVolume(val);
      setMuted(val === 0);
    },
    [instance]
  );

  const toggleMute = useCallback(() => {
    if (muted) {
      const restored = prevVolumeRef.current || 0.3;
      instance.audio.volume = restored;
      setVolume(restored);
      setMuted(false);
    } else {
      prevVolumeRef.current = volume;
      instance.audio.volume = 0;
      setVolume(0);
      setMuted(true);
    }
  }, [muted, volume, instance]);

  const currentTrack = instance.tracks[trackIndex];
  const bg = "rgba(10, 10, 14, 0.92)";
  const fg = "rgba(255, 255, 255, 0.7)";
  const fgDim = "rgba(255, 255, 255, 0.3)";
  const fgMid = "rgba(255, 255, 255, 0.5)";

  if (minimized) {
    return (
      <div className={className}>
        {footer}
        <div
          style={{
            ...baseStyles.miniContainer,
            background: `${bg}`,
          }}
        >
          <button
            onClick={prevTrack}
            style={{ ...baseStyles.btn, padding: 6, color: fgDim }}
            aria-label="Previous track"
          >
            <PrevIcon size={12} />
          </button>
          <button
            onClick={toggle}
            style={{ ...baseStyles.btn, padding: 6, color: accentColor }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <PauseIcon size={16} color={accentColor} />
            ) : (
              <PlayIcon size={16} color={accentColor} />
            )}
          </button>
          <button
            onClick={nextTrack}
            style={{ ...baseStyles.btn, padding: 6, color: fgDim }}
            aria-label="Next track"
          >
            <NextIcon size={12} />
          </button>
          <div
            style={{
              width: 1,
              height: 16,
              background: "rgba(255,255,255,0.08)",
              margin: "0 2px",
            }}
          />
          <button
            onClick={() => setMinimized(false)}
            style={{ ...baseStyles.btn, padding: 6, color: fgDim }}
            aria-label="Expand player"
          >
            <ExpandIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={baseStyles.container} className={className}>
      {/* Top accent line */}
      <div
        style={{
          ...baseStyles.accentLine,
          background: `linear-gradient(to right, ${accentColor}50, ${accentColorAlt}50, ${accentColor}50)`,
        }}
      />

      <div style={{ ...baseStyles.bar, background: bg }}>
        <div style={baseStyles.inner}>
          {/* Prev */}
          <button
            onClick={prevTrack}
            style={{ ...baseStyles.btn, color: fgMid }}
            aria-label="Previous track"
          >
            <PrevIcon />
          </button>

          {/* Play / Pause */}
          <button
            onClick={toggle}
            style={{ ...baseStyles.btn, color: accentColor }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <PauseIcon color={accentColor} />
            ) : (
              <PlayIcon color={accentColor} />
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            style={{ ...baseStyles.btn, color: fgMid }}
            aria-label="Next track"
          >
            <NextIcon />
          </button>

          {/* Shuffle */}
          <button
            onClick={() => setShuffleOn(!shuffleOn)}
            style={{
              ...baseStyles.btn,
              color: shuffleOn ? accentColor : fgDim,
            }}
            aria-label={shuffleOn ? "Shuffle on" : "Shuffle off"}
            title={shuffleOn ? "Shuffle: ON" : "Shuffle: OFF"}
          >
            <ShuffleIcon />
          </button>

          {/* Repeat One */}
          <button
            onClick={() => setRepeatOne(!repeatOne)}
            style={{
              ...baseStyles.btn,
              color: repeatOne ? accentColorAlt : fgDim,
              position: "relative",
            }}
            aria-label={repeatOne ? "Repeat one on" : "Repeat off"}
            title={repeatOne ? "Repeat: ONE" : "Repeat: OFF"}
          >
            <RepeatIcon />
            {repeatOne && (
              <span
                style={{
                  position: "absolute",
                  fontSize: 6,
                  fontWeight: "bold",
                  top: 4,
                  right: 2,
                  color: accentColorAlt,
                }}
              >
                1
              </span>
            )}
          </button>

          {/* Divider */}
          <div style={baseStyles.divider} />

          {/* Mini visualizer bars */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 2,
              height: 16,
              flexShrink: 0,
            }}
          >
            {playing
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="overplayer-viz-bar"
                    style={{
                      width: 2,
                      borderRadius: "1px 1px 0 0",
                      background:
                        i % 2 === 0 ? accentColor : accentColorAlt,
                      opacity: 0.8,
                      height: "100%",
                      animation: `overplayer-bar ${0.3 + i * 0.12}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))
              : Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 2,
                      height: 4,
                      borderRadius: "1px 1px 0 0",
                      background: "rgba(255,255,255,0.08)",
                    }}
                  />
                ))}
          </div>

          {/* Track info */}
          <div style={{ ...baseStyles.trackInfo, color: fg }}>
            {hasInteracted ? currentTrack?.title : tracks[0]?.title || ""}
            {(subtitle || currentTrack?.artist) && (
              <span style={{ color: fgDim, marginLeft: 8 }}>
                {subtitle || currentTrack?.artist}
              </span>
            )}
          </div>

          {/* Volume */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
          >
            <button
              onClick={toggleMute}
              style={{
                ...baseStyles.btn,
                padding: 6,
                color: muted ? "#ef4444" : fgDim,
              }}
              aria-label={muted ? "Unmute" : "Mute"}
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
              style={baseStyles.volumeSlider}
              aria-label="Volume"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

          {/* Divider */}
          <div style={baseStyles.divider} />

          {/* Minimize */}
          <button
            onClick={() => setMinimized(true)}
            style={{ ...baseStyles.btn, color: fgDim }}
            aria-label="Minimize player"
          >
            <MinimizeIcon />
          </button>

          {/* Brand label */}
          {brandLabel && (
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                color: fgDim,
                marginLeft: 4,
                flexShrink: 0,
              }}
            >
              {brandLabel}
            </span>
          )}
        </div>
      </div>

      {footer}
    </div>
  );
}
