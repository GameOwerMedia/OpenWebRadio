// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearInstancesForTests, OverPlayer } from "../src/OverPlayer";
import { useOverPlayer } from "../src/useOverPlayer";
import type { Track } from "../src/types";
import { createdAudios, installFakeAudio } from "./fake-audio";

const tracks: Track[] = [
  { src: "/audio/track-01.mp3", title: "Opening Theme", artist: "Artist" },
  { src: "/audio/track-02.mp3", title: "Second Theme", artist: "Artist" },
];

beforeEach(() => {
  sessionStorage.clear();
  installFakeAudio();
});

afterEach(() => {
  cleanup();
  clearInstancesForTests();
});

function saved(key: string): { volume: number; muted: boolean; prevVolume: number; time: number; src: string } {
  return JSON.parse(sessionStorage.getItem(key) || "null");
}

describe("OverPlayer volume", () => {
  it("saves a volume change and keeps it across a remount", async () => {
    const key = "vol-remount";
    const { unmount } = render(
      createElement(OverPlayer, { tracks, storageKey: key, autoplay: false, shuffle: false, volume: 0.3 })
    );
    await waitFor(() => expect(createdAudios.length).toBe(1));
    const slider = await screen.findByLabelText("Volume");
    fireEvent.change(slider, { target: { value: "0.55" } });
    expect(saved(key).volume).toBe(0.55);
    expect(saved(key).muted).toBe(false);
    expect(createdAudios[0].volume).toBe(0.55);

    unmount();
    render(createElement(OverPlayer, { tracks, storageKey: key, autoplay: false, shuffle: false, volume: 0.3 }));
    await waitFor(() => expect((screen.getByLabelText("Volume") as HTMLInputElement).value).toBe("0.55"));
  });

  it("restores volume, mute, and position from a previous page load", async () => {
    const key = "vol-reload";
    sessionStorage.setItem(
      key,
      JSON.stringify({
        src: "/audio/track-02.mp3",
        time: 12,
        wasPlaying: false,
        volume: 0,
        muted: true,
        prevVolume: 0.4,
        sentinel: true,
      })
    );
    clearInstancesForTests();

    render(createElement(OverPlayer, { tracks, storageKey: key, autoplay: false, shuffle: false, volume: 0.3 }));
    await waitFor(() => expect(screen.getByLabelText("Unmute (M)")).toBeTruthy());
    expect((screen.getByLabelText("Volume") as HTMLInputElement).value).toBe("0");
    expect(createdAudios[0].src).toBe("/audio/track-02.mp3");
    expect(createdAudios[0].currentTime).toBe(12);
    expect(createdAudios[0].volume).toBe(0);
    expect(screen.getByText("0:12")).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 600));
    const afterInterval = JSON.parse(sessionStorage.getItem(key) || "null");
    expect(afterInterval.time).toBe(12);
    expect(afterInterval.sentinel).toBeUndefined();

    fireEvent.click(screen.getByLabelText("Unmute (M)"));
    expect(saved(key).muted).toBe(false);
    expect(saved(key).volume).toBe(0.4);
    expect(createdAudios[0].volume).toBe(0.4);
  });

  it("marks a stream live when metadata reports an infinite duration", async () => {
    render(
      createElement(OverPlayer, {
        tracks: [{ src: "https://example.com/stream", title: "Groove Salad" }],
        storageKey: "vol-live",
        autoplay: false,
        shuffle: false,
      })
    );
    await waitFor(() => expect(createdAudios.length).toBe(1));
    expect(screen.queryByText("LIVE")).toBeNull();
    createdAudios[0].duration = Infinity;
    createdAudios[0].dispatch("loadedmetadata");
    await waitFor(() => expect(screen.getByText("LIVE")).toBeTruthy());
    expect(screen.queryByLabelText("Seek")).toBeNull();
  });
});

describe("useOverPlayer", () => {
  function Probe({ storageKey }: { storageKey: string }) {
    const [state, controls] = useOverPlayer({
      tracks,
      storageKey,
      autoplay: false,
      shuffle: false,
      volume: 0.3,
    });
    return createElement(
      "div",
      null,
      createElement("span", { "data-testid": "title" }, state.currentTrack?.title ?? "none"),
      createElement("span", { "data-testid": "vol" }, String(state.volume)),
      createElement("button", { onClick: () => controls.setVolume(0.25) }, "set"),
      createElement("button", { onClick: controls.toggleMute }, "mute")
    );
  }

  it("shows the current track and remembers volume across a remount", async () => {
    const key = "hook-vol";
    const { unmount } = render(createElement(Probe, { storageKey: key }));
    await waitFor(() => expect(screen.getByTestId("title").textContent).toBe("Opening Theme"));
    fireEvent.click(screen.getByText("set"));
    expect(screen.getByTestId("vol").textContent).toBe("0.25");
    expect(saved(key).volume).toBe(0.25);

    unmount();
    render(createElement(Probe, { storageKey: key }));
    await waitFor(() => expect(screen.getByTestId("vol").textContent).toBe("0.25"));
    expect(screen.getByTestId("title").textContent).toBe("Opening Theme");
  });
});
