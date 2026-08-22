# Cube Solve Console

An interactive, move-by-move Rubik's Cube tutorial built around a custom 3D CSS animation engine. It follows the classic 7-stage beginner method, with every algorithm demonstrated on a real animated cube — not just written notation.

## Features

- **Full 3D cube engine** — a from-scratch cubie/sticker model (not a pre-built library), verified against unit tests for rotation correctness.
- **Move-by-move playback** — step forward/back through each stage's algorithm, or auto-play at adjustable speed (Slow / Medium / Fast, Slow by default), with visible directional arrows for every turn. Double ("2") turns play as two separate quarter-turns with a pause between them, so they're as easy to follow as any other move.
- **Realistic starting states** — each stage opens from a plausible pre-solve position (computed as the exact inverse of that stage's algorithm), not an already-solved cube.
- **Holding-position guidance** — every stage tells you which layer should be "up" and where to hold the piece you're working on before you start.
- **Cube Basics primer** — a short anatomy/orientation section for total beginners, before the stages begin.
- **Finger-trick drills** — a practice cube and per-move hand-technique cues at the end, for building speed once the algorithms are memorized.
- **Full-screen finger-training trainer** (`finger-training.html`) — pick any of the 7 stages and step through its algorithm one quarter-turn at a time on a large cube, with the plain-language description, a suggested hand/finger technique, and a progress dial per move. A double ("2") move is shown as two separate, individually-navigable turns rather than one fast spin. Deep-linkable, e.g. `finger-training.html?stage=5`.
- **Reduced-motion support** and no external JS dependencies.

## Structure

```
index.html          — main tutorial page markup
finger-training.html — full-screen, one-stage-at-a-time practice page
style.css            — shared styling (dark "cube console" theme)
finger-training.css  — layout rules specific to the training page
cube-engine.js       — shared cube engine, stage data, and StageController (no DOM mounting)
script.js            — mounts cube-engine.js into index.html
finger-training.js   — mounts cube-engine.js into finger-training.html
```

## Running it

No build step — just open `index.html` in a browser, or serve the folder with any static file server. GitHub Pages happily serves multiple HTML files from one repo, so `finger-training.html` is reachable the same way `index.html` is. To host it for free: Settings → Pages → Deploy from branch → `main` / `(root)`, then visit:

```
https://<username>.github.io/<repo>/
https://<username>.github.io/<repo>/finger-training.html
https://<username>.github.io/<repo>/finger-training.html?stage=5
```

## Method

Follows a standard 7-stage beginner method: white cross → white corners (first layer) → second-layer edges → yellow cross → yellow edge permutation → yellow corner permutation → yellow corner orientation.

## License

MIT — see [LICENSE](LICENSE).
