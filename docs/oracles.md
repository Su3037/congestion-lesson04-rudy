# Oracles: how each claim is checked by something other than the author

Run everything with `npm test && npm run oracle:teacher && npm run oracle:crosslang && npm run oracle:upstream && npm run oracle:edge`. Results land in `oracles/results/`.

Since the rebuild in the house style (D14), every oracle checks `site/js/domain.js`, the code the page, the films and the grader run, through `oracles/adapter.mjs` (which only converts the net format and the shape of validation results). The exact-fraction Python reference is `python-ref/rudy_ref.py`; the earlier property tests are in `tests/legacy/`.

| Oracle | What it checks | How to rerun | Last result (2026-11-23) |
| --- | --- | --- | --- |
| (a) Teacher's code | Model P equals the teacher's unmodified `congestion-core.js` and `solvers.py` (demand matrix and C = 0.5/1/2/3.5 metrics) | `npm run oracle:teacher` | JS 5000 cases, 0 mismatches, max diff 0; Python 1000 cases, 0 mismatching tiles |
| (b) Production code | Model A equals DREAMPlace's `rudyLauncher` (H and V maps, RISA-weighted) and OpenROAD's `visitNetTiles` (×100 / tile area), both copied verbatim and compiled with stub headers | `npm run oracle:upstream` (needs g++) | DREAMPlace 1489 cases, 0 mismatches (max rel err 1e-13); OpenROAD 739 square-tile integer cases, 0 mismatches (max rel err 2e-7, float32) |
| (c) Properties | Conservation, directional sums, capacity independence, net-order independence, linearity, mirror symmetry (P off edges; A always) | `npm test` (includes `tests/legacy/`) | fast-check 400 runs × 5 properties, seed 20261123; Hypothesis 300 + 200 examples, seed 20261123: all pass |
| (d) JS ↔ Python | Models P and A, H and V maps, on random grids, non-integer and edge coordinates, line nets, coincident pins; malformed input rejected by both | `npm run oracle:crosslang` | 2000 cases: 1800 agree numerically (max diff 3.6e-15), 200 rejected by both, 0 disagree. (Before D2 was widened to check every placed pin, 9 cases with an unused off-chip pin disagreed.) |
| (e) Exact fractions | Every fixture number in the lesson (37/6, 14/3, 25/6, 20/3, 22, 14/3, 28, 17/3, 7, 5, 6) | `python3 -m pytest tests/legacy/test_ref.py tests/test_python.py` | equal as `Fraction`s; the practice reference agrees with the exact reference on 300 random instances |
| Edge-case table | What each implementation does on boundaries, line nets, coincident pins, far edge, 4-pin net | `node oracles/edge_cases.mjs` | `docs/edge-cases.md` |
| Router correlation | Whether RUDY predicts routed congestion | not run here | **Not run.** Needs OpenROAD-flow-scripts (global route of `gcd`) or CircuitNet 2.0 maps; neither was installable on the build machine (downloading the OpenROAD toolchain binary was blocked). Script outline in `docs/handoff-state.md`. |

Why (b) counts as independent: the C++ is the upstream text, extracted by anchors in `oracles/upstream/extract.py`, not re-typed. The stubs provide only `odb::Rect` (closed rectangles, integer DBU) and an atomic-add functor. The comparison removes DREAMPlace's RISA factor per net and OpenROAD's percent scaling, and excludes zero-area boxes, where the tools disagree by design (see `docs/edge-cases.md`).
