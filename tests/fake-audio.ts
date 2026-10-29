import { vi } from "vitest";

type Listener = () => void;

export class FakeAudio {
  src: string;
  volume = 1;
  currentTime = 0;
  /** Matches a real element before loadedmetadata. */
  duration = Number.NaN;
  paused = true;
  preload = "none";
  private listeners = new Map<string, Set<Listener>>();

  constructor(src?: string) {
    this.src = src ?? "";
    createdAudios.push(this);
  }

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  addEventListener(type: string, fn: Listener): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(fn);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, fn: Listener): void {
    this.listeners.get(type)?.delete(fn);
  }

  dispatch(type: string): void {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
}

export const createdAudios: FakeAudio[] = [];

export function installFakeAudio(): void {
  createdAudios.length = 0;
  vi.stubGlobal("Audio", FakeAudio);
}
