import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  // Rollup's treeshake pass strips the `"use client"` directive. esbuild still
  // tree-shakes the entry, and the banner below has to stay the first line.
  treeshake: false,
  banner: { js: '"use client";' },
});
