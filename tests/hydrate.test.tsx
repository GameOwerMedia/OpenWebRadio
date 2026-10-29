// @vitest-environment jsdom
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act, createElement, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearInstancesForTests, OverPlayer } from "../src/OverPlayer";
import type { Track } from "../src/types";
import { installFakeAudio } from "./fake-audio";

const tracks: Track[] = [
  { src: "/audio/track-01.mp3", title: "Opening Theme", artist: "Artist" },
  { src: "https://example.com/stream", title: "Groove Salad", artist: "SomaFM", live: true },
];

afterEach(() => {
  clearInstancesForTests();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("hydrate after a server render", () => {
  it("matches the server HTML, then restores the saved volume", async () => {
    sessionStorage.setItem(
      "hydrate-vol",
      JSON.stringify({
        src: "/audio/track-01.mp3",
        time: 12,
        wasPlaying: false,
        volume: 0.62,
        muted: false,
        prevVolume: 0.62,
      })
    );

    const element = createElement(OverPlayer, {
      tracks,
      theme: "auto",
      autoplay: false,
      shuffle: false,
      volume: 0.3,
      storageKey: "hydrate-vol",
    });

    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const audio = Object.getOwnPropertyDescriptor(globalThis, "Audio");
    Reflect.deleteProperty(globalThis, "Audio");
    let html = "";
    try {
      html = renderToString(element);
    } finally {
      if (audio) Object.defineProperty(globalThis, "Audio", audio);
    }
    expect(getItem).not.toHaveBeenCalled();
    getItem.mockRestore();
    expect(html).toContain("Opening Theme");
    expect(html).toContain('value="0.3"');
    expect(html).not.toContain('value="0.62"');

    installFakeAudio();
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map((arg) => (typeof arg === "string" ? arg : "")).join(" "));
      original.apply(console, args as []);
    };

    let root: Root | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, element as ReactElement);
      });
      const slider = container.querySelector('input[aria-label="Volume"]') as HTMLInputElement | null;
      expect(slider).not.toBeNull();
      expect(slider!.value).toBe("0.62");
      expect(container.textContent).toContain("0:12");
    } finally {
      await act(async () => {
        root?.unmount();
      });
      console.error = original;
    }

    const hydrationErrors = errors.filter((message) => /hydrat|did not match|Audio is not defined/i.test(message));
    expect(hydrationErrors).toEqual([]);
  });
});
