# Source audit

Each source as it says it, then what this lesson does with it.

## Teacher course: yongfu-li/eda-learning @ 003bcd49e3794e6cfd2680181cdbd347d673ad07 (CC BY 4.0)

Files read (copies under `research/teacher/`, SHA-256 in `research/teacher/source-manifest.json` from the evidence pack): `common/solvers.py`, `common/congestionutil.py`, `common/tiny_cong.json`, `common/test_solvers.py`, `platform/assets/congestion-core.js`, and the module's `README.md`, `transcript.md`, `slides.md`, `outline.yaml`, `quiz.json`.

- **Rule.** `rudy_demand` / `rudyDemand`: per net, bbox, `hpwl`, `_tiles_for_bbox` (floor-and-clamp both corners, inclusive range), `dens = wl / max(1, len(tiles))`, add to each tile. Matrix `demand[i][j]` with i = x index. Reproduced exactly (oracle a: 5000 JS cases and 1000 Python cases, 0 mismatches).
- **Fixture.** 12 × 8 chip, 4 × 2 GCells of 3 × 4, capacity 2, six nets; `placement` (spread) and `congested_seed` (cluster). Values reproduced with exact fractions.
- **Defects found by running the code** (`docs/edge-cases.md`): an empty net silently contributes 0; capacity 0 gives total overflow 34 and a NaN congestion map; a NaN coordinate produces finite-looking demand; a pin at x = 40 on a 12-wide chip is silently clamped into column 3. This lesson's core rejects all four.
- **Teaching text.** The transcript's slide 7 is titled "Spread cools total pattern". Measured on the teacher's own fixture, the spread placement *raises* total overflow from 5 to 22 and lowers only max overflow (5 → 14/3). The lesson teaches the measured result and says which statistic each claim refers to.
- **Pins are points.** `tiny_cong.json` has cell widths; the RUDY functions ignore them and use the given coordinates. This lesson does the same and does not add cell-centre offsets.

## DREAMPlace @ 4adf954dfce83712c4cbee541b5208ca315fda11 (BSD-3-Clause)

`dreamplace/ops/rudy/src/rudy.cpp` (`rudyLauncher`) and `parameters.h`. For each net: bins from `int((min − xl)/bin)` to `int((max − xl)/bin) + 1` exclusive; per bin, `overlap = max(0, …) × max(0, …)`, times `netWiringDistributionMapWeight(num_pins)` (the RISA table, 1.0 up to 3 pins, 1.0828 at 4, … 2.7933 above 45) and optional net weight; horizontal map += `overlap / (h + ε)`, vertical += `overlap / (w + ε)`. A zero-area box therefore contributes 0. The header comment cites Spindler (DATE 2007) and Cheng (ICCAD 1994).

## OpenROAD @ 7b26270095b3c710bdbac50d09af1767e2265572 (BSD-3-Clause)

`src/grt/include/grt/Rudy.h` (`visitNetTiles`) and `src/grt/src/Rudy.cpp`. Supply nets skipped. `net_area == 0` returns early with `// TODO: handle nets with 0 area`. Otherwise `net_congestion = hpwl × wire_width / net_area`, and each overlapping tile gets `net_congestion × intersect_area / tile_area × 100` (percent). Tiles are square (`tile_size_`), the last row/column absorbs the remainder. `wire_width_` is 1.25 × the harmonic mean of the routing-layer pitches divided by the number of layers. `getRudy()` adds `blockage × 100`. The header cites the DATE 2007 paper (`ieeexplore 4211973`).

## Spindler & Johannes, DATE 2007

The PDF at the conference archive (`past.date-conference.com/.../08.7_1.PDF`) did not answer from the build machine (no connection), and I did not try other copies. This lesson therefore quotes no equation from the paper; it cites the paper as the origin of RUDY and relies on the two production codes above, which cite it, for the area-weighted form. The paper's figures are not reproduced. **Open item:** read the paper on a machine with access and check the degenerate-box handling and the wire-width term against model A.

## Cheng, RISA, ICCAD 1994

Not read directly; its factor table is taken from DREAMPlace's `parameters.h`, which attributes it to the paper. Stated as such in the lesson.

## GateUltra/vlsi-course-director @ dca1c25d (MIT)

Read `HTML_STUDIO_GUIDE.md`, `shared-architecture.md`, `tooling.md` and the starter. Adopted: pure domain module, shared board, explicit timeline with `stateAt(t)`, `window.ready` / `window.clock` / `window.renderAt`, frame capture at `i / fps`. Not adopted: the per-cue edge-tts narration recipe (`audio-captions.md`), which the instructor criticised in earlier feedback ("machine voice", "tts"). The narration here uses Kokoro-82M offline, a whole line per take (`docs/voice-casting.md`). No GateUltra code is copied.

## The author's earlier lessons (house style)

`Su3037/placement-lab02-hpwl` and `su3037/learning-clustering`, same author. The page structure, theme, film formats, clocks, renderer, player and slide builder of this lesson were ported from the HPWL lesson at the owner's request (`docs/decision-log.md` D14).
