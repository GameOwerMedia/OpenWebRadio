# Contributing to OverPlayer

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/GameOwerMedia/OpenWebRadio.git
cd OpenWebRadio
npm install
npm run dev      # watch mode — rebuilds on file changes
```

## Project Structure

```
src/
  index.ts          # Public exports
  types.ts          # TypeScript interfaces
  OverPlayer.tsx    # Main player component
  useOverPlayer.ts  # Headless hook (no UI)
docs/
  index.html        # GitHub Pages demo
  audio/            # Demo tracks
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode with tsup |
| `npm run build` | Production build (CJS + ESM + types) |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run typecheck` and `npm run build` to ensure everything compiles
4. Open a PR with a clear description of what you changed and why

## Guidelines

- Keep the component **zero-dependency** (React peer dep only)
- Use **inline styles** — no CSS imports required for consumers
- All new props should be **optional** with sensible defaults
- Add **ARIA labels** to interactive elements
- Respect `prefers-reduced-motion`
- Test in both dark and light themes

## Reporting Issues

Open an issue at [github.com/GameOwerMedia/OpenWebRadio/issues](https://github.com/GameOwerMedia/OpenWebRadio/issues) with:

- What you expected vs what happened
- Browser and React version
- A minimal reproduction if possible
