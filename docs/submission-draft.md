# Draft comment for issue #42 (not posted)

> Do not post without the author's go-ahead.

---

Hi Prof. Li, here is my submission for **Congestion - Lesson 04 (RUDY congestion estimate)**, module `module02-01-rudy-estimate`.

- **Lesson site:** https://su3037.github.io/congestion-lesson04-rudy/ (Chinese) · https://su3037.github.io/congestion-lesson04-rudy/?lang=en (English)
- **Source:** https://github.com/Su3037/congestion-lesson04-rudy
- **Films (each in Chinese and English, code-drawn, 1080p):** 科普 (3:10, cut to music), 精讲 (narrated), 进阶 (reading film), 实验演示 (narrated walkthrough of the real lab). Any paused frame can be sent into the lab with its exact pins, capacity and model.
- **Lab:** drag / keyboard / touch, model P (your classroom rule) and model A (area-weighted, with H and V maps), demand / ratio / overflow layers, capacity, nets added one by one, per-tile breakdown, undo.
- **Practice:** 7 challenges graded on the actual lab layout, a 6-question concept check, 13 slides (PDF and PPTX, with notes), and a Python pack (5 functions, 26 checks).

What I checked:

- Model P reproduces your classroom rule exactly: your `congestion-core.js` and `solvers.py`, run unmodified, agree on 5000 + 1000 generated cases, and the fixture values come out as exact fractions (spread: Σ = 34, C = 2 total 22 / max 14/3 / 6 tiles; cluster: 5 / 5 / 1).
- Model A matches the RUDY kernels of DREAMPlace and OpenROAD (compiled from their source) on 1489 and 739 cases. On the spread placement it raises max overflow to 5.54, so the "spread vs cluster" ranking depends on both the statistic and the RUDY variant; the lesson teaches that instead of calling one layout better.
- Input validation: empty nets, unknown or repeated pins, NaN or off-chip coordinates, a grid that does not tile the chip and capacity ≤ 0 are rejected with a message.

Limitations:

- The narration is synthesised (Kokoro-82M, offline) and was screened by speech recognition (character error rate 7.5 % zh, 2.7 % en, mostly letter spelling); it has not yet been rated in a listening test.
- RUDY's prediction quality is not measured against a global router in this lesson.
- Units are teaching units, not routing tracks.

Thank you!
