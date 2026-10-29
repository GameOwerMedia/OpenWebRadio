// @vitest-environment node
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OverPlayer } from "../src/OverPlayer";
import { useOverPlayer } from "../src/useOverPlayer";
import type { Track } from "../src/types";

const tracks: Track[] = [
  { src: "/audio/track-01.mp3", title: "Opening Theme", artist: "Artist" },
  { src: "https://example.com/stream", title: "Groove Salad", artist: "SomaFM", live: true },
];

describe("server render", () => {
  it("does not require Audio and does not read session state while rendering", () => {
    expect("Audio" in globalThis).toBe(false);
    const random = vi.spyOn(Math, "random");
    const html = renderToString(
      createElement(OverPlayer, {
        tracks,
        shuffle: true,
        autoplay: true,
        storageKey: "ssr-player",
      })
    );
    expect(random).not.toHaveBeenCalled();
    expect(html).toContain("Opening Theme");
    expect(html).toContain("Play");
    random.mockRestore();
  });

  it("draws a LIVE badge for a live track without a seek bar", () => {
    const html = renderToString(
      createElement(OverPlayer, {
        tracks: [{ src: "https://example.com/stream", title: "Groove Salad", live: true }],
        autoplay: false,
        shuffle: false,
        storageKey: "ssr-live",
      })
    );
    expect(html).toContain("Groove Salad");
    expect(html).toContain("LIVE");
    expect(html).not.toContain('aria-label="Seek"');
  });

  it("renders an empty playlist without throwing", () => {
    const html = renderToString(
      createElement(OverPlayer, { tracks: [], autoplay: false, storageKey: "ssr-empty" })
    );
    expect(html).toContain("Play");
  });

  it("renders the headless hook without Audio", () => {
    function Probe() {
      const [state, controls] = useOverPlayer({
        tracks,
        autoplay: false,
        shuffle: false,
        storageKey: "ssr-hook",
      });
      return createElement("button", { onClick: controls.toggle }, state.playing ? "Pause" : "Play");
    }
    expect(renderToString(createElement(Probe))).toContain("Play");
  });

  it("keeps theme=auto stable when window is missing", () => {
    const html = renderToString(
      createElement(OverPlayer, {
        tracks,
        theme: "auto",
        autoplay: false,
        shuffle: false,
        storageKey: "ssr-auto",
      })
    );
    expect(html).toContain("Opening Theme");
  });
});
