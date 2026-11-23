# Draft comment for issue #42 (not posted)

> Do not post without the author's go-ahead.

---

Hi Prof. Li, here is my submission for **Congestion - Lesson 04 (RUDY congestion estimate)**, module `module02-01-rudy-estimate`.

- **Lesson site:** https://su3037.github.io/congestion-lesson04-rudy/ (Chinese) · https://su3037.github.io/congestion-lesson04-rudy/en/ (English)
- **Source:** https://github.com/Su3037/congestion-lesson04-rudy
- **Film:** 4 min 22 s, code-drawn, silent with captions (Chinese burned in, English cut and VTT), plus a 41 s sample. Any paused frame can be sent into the live lab with its exact pins, grid, capacity and model.
- **Live lab:** drag/keyboard/numeric pin editing, net-by-net step-through with pseudocode highlighting, demand / ratio / overflow on fixed legends, per-tile breakdown, capacity control, side-by-side comparison.
- **Practice:** 7 challenges graded on the actual lab state, a 12-page slide deck (PDF), and a Python starter with an exact-fraction reference and checker.

What I checked:

- The lesson's core reproduces your classroom rule exactly: your `congestion-core.js` and `solvers.py`, run unmodified, agree on 5000 + 1000 generated cases, and the fixture values come out as exact fractions (spread: Σ = 34, C=2 total 22 / max 14/3 / 6 tiles; cluster: 5 / 5 / 1).
- An area-weighted variant, labelled separately, matches the RUDY kernels of DREAMPlace and OpenROAD (compiled from their source) on 1489 and 739 cases. On the same spread placement it raises max overflow to 5.54, so the "spread vs cluster" ranking depends on both the statistic and the RUDY variant. The lesson teaches that instead of calling the spread better.
- Input validation: empty nets, unknown pins, NaN or off-chip coordinates and capacity ≤ 0 are rejected with a message.

Limitations:

- No narration yet; I am testing voices with native listeners first and will only add one if it passes.
- RUDY's prediction quality is not measured against a global router in this lesson (no OpenROAD/ORFS run).
- Units are teaching units, not routing tracks.

Thank you!
