# Cube Solve Console

An interactive, move-by-move Rubik's Cube tutorial built around a custom 3D CSS animation engine. It follows the classic 7-stage beginner method, with every algorithm demonstrated on a real animated cube — not just written notation.

## Features

- **Full 3D cube engine** — a from-scratch cubie/sticker model (not a pre-built library), verified against unit tests for rotation correctness.
- **Move-by-move playback** — step forward/back through each stage's algorithm, or auto-play at adjustable speed (Slow / Medium / Fast, Slow by default), with visible directional arrows for every turn. Double ("2") turns play as two separate quarter-turns with a pause between them, so they're as easy to follow as any other move.
- **Realistic starting states** — each stage opens from a plausible pre-solve position (computed as the exact inverse of that stage's algorithm), not an already-solved cube.
- **Holding-position guidance** — every stage tells you which layer should be "up" and where to hold the piece you're working on before you start.
- **Cube Basics primer** — a short anatomy/orientation section for total beginners, before the stages begin.
- **Finger-trick drills** — a practice cube and per-move hand-technique cues at the end, for building speed once the algorithms are memorized.
- **Reduced-motion support** and no external JS dependencies.

## Structure

```
index.html   — page markup
style.css    — all styling (dark "cube console" theme)
script.js    — the cube engine, stage controller, and UI wiring
```

## Running it

No build step — just open `index.html` in a browser, or serve the folder with any static file server. To host it for free on GitHub Pages: Settings → Pages → Deploy from branch → `main` / `(root)`.

## Method

Follows a standard 7-stage beginner method: white cross → white corners (first layer) → second-layer edges → yellow cross → yellow edge permutation → yellow corner permutation → yellow corner orientation.

## License

MIT — see [LICENSE](LICENSE).
