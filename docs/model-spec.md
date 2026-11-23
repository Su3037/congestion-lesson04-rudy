# Model specification

Written before the code; `site/js/rudy.js` (JS) and `python/rudy_ref.py` (Python, exact fractions) implement it independently.

## Inputs

- `chip = {W, H}`, `gcell = {nx, ny, cellW, cellH}` with `nx·cellW = W` and `ny·cellH = H` exactly.
- `nets`: a list of non-empty lists of pin ids.
- `positions`: `{id: {x, y}}`, finite numbers with `0 ≤ x ≤ W`, `0 ≤ y ≤ H`.
- `capacity C`: finite, `C > 0`.

Validation errors (both implementations reject; neither computes): missing chip/grid, non-positive or non-integer grid counts, a grid that does not tile the chip, an empty net, a net naming an unknown pin, a non-finite coordinate, a coordinate outside the chip, and `C ≤ 0` or non-finite. The lab clamps a *dragged* pin to the chip edge and says so on screen; typed or loaded off-chip coordinates are rejected with a visible message, never silently hidden.

## Matrix orientation

`demand[x][y]`: column index first. Screen drawing flips y so row 0 is at the bottom.

## Model P: the teacher's classroom proxy (core)

For each net, starting from an all-zero matrix on every call:

1. `box` = axis-aligned bounding box of the net's pins.
2. `hpwl = (x1 − x0) + (y1 − y0)`.
3. Tile index of a point: `i = clamp(floor(x / cellW), 0, nx−1)`, `j = clamp(floor(y / cellH), 0, ny−1)`. A point at `x = W` lands in the last column.
4. Selected tiles: every `(i, j)` between the lower-left corner's tile and the upper-right corner's tile, **inclusive** (the endpoint-bin rule). This is not positive-area intersection: a corner exactly on `x = 3` selects column 1.
5. `share = hpwl / |tiles|` (|tiles| ≥ 1 always); add `share` to each selected tile.

Consequences, all tested: horizontal and vertical nets are valid; coincident pins and singleton nets deposit 0; `Σ demand = Σ hpwl` (conservation); demand does not depend on net order or on capacity; duplicating a net doubles its contribution; mirror symmetry holds only when no coordinate sits on a tile edge.

Units: "teaching units". Demand and capacity are comparable with each other, not with routing tracks.

## Model A: area-weighted extension (labelled separately)

For a box with `w > 0` and `h > 0`, tile `t` receives `hpwl · overlap(t) / (w·h)`, split into horizontal `w · overlap / (w·h)` and vertical `h · overlap / (w·h)`. This matches DREAMPlace `ops/rudy` (without its RISA factor) and OpenROAD `grt::Rudy` (up to its ×100 / tile area / wire-width scaling); see `docs/oracles.md`.

Degenerate boxes are a stated teaching rule, because both production tools drop them (DREAMPlace: zero area gives 0; OpenROAD: skipped): a horizontal or vertical segment deposits its length into the tiles it runs through, in proportion to the length inside each; a segment lying exactly on a tile edge goes to the tile chosen by the floor-and-clamp index; coincident pins deposit 0. Conservation holds for model A too, and `Σ H = Σ w`, `Σ V = Σ h`.

Model A has its own goldens and its own label in every view. It is never shown under model P's name.

## Metrics

- `ratio[t] = demand[t] / C`
- `overflow[t] = max(0, demand[t] − C)` (a difference below 1e-9 counts as 0, to absorb float noise)
- `total = Σ overflow`, `max = max overflow`, `count = #{t : demand[t] − C > 1e-9}`
- `topAvgRatio`: mean ratio of the worst ⌈25%⌉ of tiles (2 of 8 here), in the spirit of the ISPD 2011 / DAC 2012 ACE(x) metric. It is labelled as this lesson's statistic, not as ACE.

## Fixed legends

Demand 0–8, ratio 0–4, overflow 0–6, one ramp, defined once in `site/js/board.js`. Values above the top use the top colour; the number is always printed.
