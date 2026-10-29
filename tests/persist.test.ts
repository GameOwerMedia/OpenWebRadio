import { describe, expect, it } from "vitest";
import { clampVolume, detectLive, persistedTime, volumeFromSaved } from "../src/persist";

describe("playback persistence helpers", () => {
  it("clamps volume and falls back when the saved value is missing", () => {
    expect(clampVolume(1.4)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume("loud", 0.3)).toBe(0.3);
    expect(volumeFromSaved(null, 0.3)).toEqual({ volume: 0.3, muted: false, prevVolume: 0.3 });
    expect(volumeFromSaved({ volume: 0, muted: true, prevVolume: 0.45 }, 0.3)).toEqual({
      volume: 0,
      muted: true,
      prevVolume: 0.45,
    });
  });

  it("does not treat missing metadata as a live stream or wipe the saved position", () => {
    expect(detectLive(undefined, Number.NaN)).toBe(false);
    expect(detectLive(undefined, Infinity)).toBe(true);
    expect(detectLive(true, 10)).toBe(true);
    expect(detectLive(false, Infinity)).toBe(false);
    expect(persistedTime(undefined, Number.NaN, 12)).toBe(12);
    expect(persistedTime(undefined, Infinity, 12)).toBe(0);
    expect(persistedTime(true, 40, 12)).toBe(0);
  });
});