import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  description: string;
  keywords: string[];
  scripts: { prepare?: string; test?: string };
  exports: unknown;
  files: string[];
};

function exportTargets(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") found.push(value);
  else if (value && typeof value === "object") {
    for (const child of Object.values(value)) exportTargets(child, found);
  }
  return found;
}

describe("package metadata", () => {
  it("points every export at a file the build produces", () => {
    const targets = exportTargets(pkg.exports);
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(target).not.toContain("styles.css");
      const relative = target.replace(/^\.\//, "");
      expect(existsSync(relative), relative).toBe(true);
    }
    expect(existsSync("dist/styles.css")).toBe(false);
  });

  it("does not claim podcast or HLS support", () => {
    expect(pkg.description.toLowerCase()).not.toContain("podcast");
    expect(pkg.description.toLowerCase()).not.toContain("hls");
    expect(pkg.keywords.map((keyword) => keyword.toLowerCase())).not.toContain("hls");
    expect(pkg.keywords.map((keyword) => keyword.toLowerCase())).not.toContain("podcast");
  });

  it("builds on install so a GitHub install has dist/", () => {
    expect(pkg.scripts.prepare).toContain("build");
    expect(pkg.files).toContain("dist");
  });
});

describe("built bundle", () => {
  it("keeps the use client directive at the top of both formats", () => {
    for (const file of ["dist/index.mjs", "dist/index.js"]) {
      const source = readFileSync(file, "utf8").replace(/^\uFEFF/, "").trimStart();
      expect(source.startsWith('"use client"') || source.startsWith("'use client'"), file).toBe(true);
    }
  });

  it("server-renders the built component", () => {
    expect("Audio" in globalThis).toBe(false);
    const { OverPlayer } = require("../dist/index.js") as typeof import("../src/index");
    const html = renderToString(
      createElement(OverPlayer, {
        tracks: [{ src: "/audio/track-01.mp3", title: "Opening Theme" }],
        autoplay: false,
        shuffle: false,
        storageKey: "built-ssr",
      })
    );
    expect(html).toContain("Opening Theme");
    const types = readFileSync("dist/index.d.ts", "utf8");
    expect(types).not.toContain("clearInstancesForTests");
  });
});
