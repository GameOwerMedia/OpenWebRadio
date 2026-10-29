import type { Track } from "./types";

export interface SavedPlayback {
  src?: string;
  time?: number;
  wasPlaying?: boolean;
  volume?: number;
  muted?: boolean;
  prevVolume?: number;
}

export interface PlaybackSnapshot {
  src: string;
  time: number;
  wasPlaying: boolean;
  volume: number;
  muted: boolean;
  prevVolume: number;
}

export interface VolumeState {
  volume: number;
  muted: boolean;
  prevVolume: number;
}

export function clampVolume(value: unknown, fallback = 0.3): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    return Math.min(1, Math.max(0, fallback));
  }
  return 0.3;
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

export function shuffleTracks<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function loadOrder(key: string): string[] | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = sessionStorage.getItem(`${key}-order`);
    if (!raw) return null;
    const order: unknown = JSON.parse(raw);
    if (!Array.isArray(order) || !order.every((src) => typeof src === "string")) return null;
    return order;
  } catch {
    return null;
  }
}

export function saveOrder(key: string, srcs: string[]): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(`${key}-order`, JSON.stringify(srcs));
  } catch {
    /* private mode and quota failures are non-fatal */
  }
}

export function orderTracks(key: string, tracks: Track[], shouldShuffle: boolean): Track[] {
  const saved = loadOrder(key);
  let ordered: Track[];
  if (saved) {
    const restored = saved
      .map((src) => tracks.find((track) => track.src === src))
      .filter((track): track is Track => Boolean(track));
    ordered =
      restored.length === tracks.length
        ? restored
        : shouldShuffle
          ? shuffleTracks(tracks)
          : [...tracks];
  } else {
    ordered = shouldShuffle ? shuffleTracks(tracks) : [...tracks];
  }
  saveOrder(
    key,
    ordered.map((track) => track.src)
  );
  return ordered;
}

export function loadPlayback(key: string): SavedPlayback | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;
    const saved: SavedPlayback = {};
    if (typeof record.src === "string") saved.src = record.src;
    if (typeof record.time === "number" && Number.isFinite(record.time)) saved.time = record.time;
    if (typeof record.wasPlaying === "boolean") saved.wasPlaying = record.wasPlaying;
    if (typeof record.volume === "number" && Number.isFinite(record.volume)) saved.volume = record.volume;
    if (typeof record.muted === "boolean") saved.muted = record.muted;
    if (typeof record.prevVolume === "number" && Number.isFinite(record.prevVolume)) {
      saved.prevVolume = record.prevVolume;
    }
    return saved;
  } catch {
    return null;
  }
}

export function savePlayback(key: string, snapshot: PlaybackSnapshot): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    /* private mode and quota failures are non-fatal */
  }
}

/** Live streams report an infinite duration. NaN means metadata has not loaded yet. */
export function detectLive(live: boolean | undefined, duration: number): boolean {
  if (live === true) return true;
  if (live === false) return false;
  return duration === Infinity;
}

export function persistedTime(live: boolean | undefined, duration: number, currentTime: number): number {
  if (live === true || duration === Infinity) return 0;
  return currentTime || 0;
}

export function volumeFromSaved(saved: SavedPlayback | null, initialVolume: number): VolumeState {
  const fallback = clampVolume(initialVolume);
  const volume = clampVolume(saved?.volume, fallback);
  const muted = typeof saved?.muted === "boolean" ? saved.muted : false;
  const prevVolume = clampVolume(saved?.prevVolume, volume > 0 ? volume : fallback);
  return { volume, muted, prevVolume };
}
