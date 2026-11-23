# Oracles: how each claim is checked by something other than the author

Run everything with `npm test && npm run oracle:teacher && npm run oracle:crosslang && npm run oracle:upstream && node oracles/edge_cases.mjs && python3 -m pytest -q tests/`. Results land in `oracles/results/`.

| Oracle | What it checks | How to rerun | Last result (2026-11-23) |
| --- | --- | --- | --- |
| (a) Teacher's code | Model P equals the teacher's unmodified `congestion-core.js` and `solvers.py` (demand matrix and C = 0.5/1/2/3.5 metrics) | `npm run oracle:teacher` | JS 5000 cases, 0 mismatches, max diff 0; Python 1000 cases, 0 mismatching tiles |
| (b) Production code | Model A equals DREAMPlace's `rudyLauncher` (H and V maps, RISA-weighted) and OpenROAD's `visitNetTiles` (×100 / tile area), both copied verbatim and compiled with stub headers | `npm run oracle:upstream` (needs g++) | DREAMPlace 1489 cases, 0 mismatches (max rel err 1e-13); OpenROAD 739 square-tile integer cases, 0 mismatches (max rel err 2e-7, float32) |
| (c) Properties | Conservation, directional sums, capacity independence, net-order independence, linearity, mirror symmetry (P off edges; A always) | `npm test`, `python3 -m pytest tests/` | fast-check 400 runs × 5 properties, seed 20261123; Hypothesis 300 + 200 examples, seed 20261123: all pass |
| (d) JS ↔ Python | Models P and A, H and V maps, on random grids, non-integer and edge coordinates, line nets, coincident pins; malformed input rejected by both | `npm run oracle:crosslang` | 2000 cases: 1800 agree numerically (max diff 3.6e-15), 200 rejected by both, 0 disagree |
| (e) Exact fractions | Every fixture number in the lesson (37/6, 14/3, 25/6, 20/3, 22, 14/3, 28, 17/3, 7, 5, 6) | `python3 -m pytest tests/test_ref.py` | equal as `Fraction`s |
| Edge-case table | What each implementation does on boundaries, line nets, coincident pins, far edge, 4-pin net | `node oracles/edge_cases.mjs` | `docs/edge-cases.md` |
| Router correlation | Whether RUDY predicts routed congestion | not run here | **Not run.** Needs OpenROAD-flow-scripts (global route of `gcd`) or CircuitNet 2.0 maps; neither was installable on the build machine (downloading the OpenROAD toolchain binary was blocked). Script outline in `docs/handoff-state.md`. |

Why (b) counts as independent: the C++ is the upstream text, extracted by anchors in `oracles/upstream/extract.py`, not re-typed. The stubs provide only `odb::Rect` (closed rectangles, integer DBU) and an atomic-add functor. The comparison removes DREAMPlace's RISA factor per net and OpenROAD's percent scaling, and excludes zero-area boxes, where the tools disagree by design (see `docs/edge-cases.md`).
