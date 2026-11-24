# Congestion Lesson 04 · RUDY 拥塞估计

**Live site:** <https://su3037.github.io/congestion-lesson04-rudy/> · English: <https://su3037.github.io/congestion-lesson04-rudy/?lang=en>

A self-contained teaching module for **RUDY (Rectangular Uniform wire DensitY)**, the routing-congestion estimate
used during placement: the course's Congestion Lesson 04 (module `module02-01-rudy-estimate` of
[yongfu-li/eda-learning](https://github.com/yongfu-li/eda-learning), issue #42), in the author's course house style.
One JavaScript domain model and one SVG board draw the website lab, every frame of all four films and every slide
figure, so what a film shows is exactly what the lab computes.

一个关于 **RUDY 拥塞估计** 的完整教学模块，沿用作者课程的统一风格：同一套 JS 领域模型和同一个 SVG 棋盘同时绘制网页实验、四部影片的每一帧和课件的每一张图。

## What is in it · 内容

| Part | Where |
|---|---|
| Lesson page (Chinese first, full English edition), ten numbered sections: goals and problem, films, lesson, slides, lab, challenges, quiz, Python, mistakes, sources | `site/index.html`, text in `site/js/content.js` |
| Four code-drawn films, each in zh and en: 科普 (cut to the author's music), 精讲 (narrated), 进阶 (reading film with the original score), 实验演示 (narrated walkthrough of the real page); captions, chapters, transcripts | `site/media/<film>.<lang>.mp4`, `site/media/*.vtt`, `media-source/transcripts/` |
| Interactive lab: drag / keyboard / touch, model P (equal shares) and model A (by area, with H and V maps), demand / ratio / overflow layers on fixed legends, capacity, nets added one by one, per-tile breakdown, undo/redo, export, “Try this frame” from the film | `site/js/lab.js`, `site/js/player.js` |
| 7 graded challenges (state challenges read the real lab layout, two-stage hints, studied vs independent progress) and a 6-question concept quiz | `site/js/grade.js`, `site/js/content.js` |
| Slides: 13 pages, PDF + editable PPTX with notes, zh and en | `site/slides/` |
| Python track: starter with TODOs, reference, checker with 26 hand-derived cases | `exercises/python/`, `site/downloads/rudy-python.zip` |
| Oracles: the teacher's unmodified code, the verbatim DREAMPlace and OpenROAD RUDY kernels, an exact-fraction Python reference | `oracles/`, `python-ref/`, `docs/oracles.md` |

Numbers taught (teacher's 12 × 8 chip, 4 × 2 tiles of 3 × 4, six nets, capacity 2): spread layout demand
**[[37/6, 37/6], [14/3, 25/6], [20/3, 37/6], [0, 0]]**, sum **34** = total HPWL; total overflow **22**, max **14/3**,
6 tiles over (C = 1: **28**, **17/3**). Centre cluster: total overflow **5**, max **5**, one tile. A on the edge x = 3:
max **29/6**. Model A on the spread layout: max overflow **5.54**.

## Quick start

```sh
npm ci && npx playwright install chromium     # once
pip install -r requirements-dev.txt           # pytest, hypothesis, python-pptx, pypdf, numpy
npm run serve                                 # http://localhost:8800/congestion-lesson04-rudy/
npm test                                      # unit tests (JS + Python)
node tests/browser.mjs                        # browser checks
npm run oracle:teacher && npm run oracle:crosslang && npm run oracle:upstream
```

Full build, voice, film rendering and verification steps: [`docs/REPRODUCIBILITY.md`](docs/REPRODUCIBILITY.md).

## Architecture

```
fixtures/rudy-fixtures.json ─┐
content/films/*.json ── build-films ─> films/<id>.clock.<lang>.json (reading / music / measured-voice clocks, VTT)
                             ▼
site/js/domain.js   RUDY models P and A, validation, metrics, moves
site/js/board.js    Board(view) -> SVG (one drawing path)
site/js/timeline.js stateAt(t) -> {board, panel, caption, metrics}   (random access)
site/js/scene.js    Scene(state) -> 1920×1080 frame      site/js/lab.js   interactive lab
site/render.html    window.renderAt(t)  ── scripts/render.mjs ── FFmpeg + mix_audio.py ──> <film>.<lang>.mp4
site/js/slides.js   slides from the same Board           site/js/grade.js challenge grading
```

## Documentation

- [Reproducibility](docs/REPRODUCIBILITY.md) · [Verification results](docs/verification.md) · [Oracles](docs/oracles.md)
- [Model specification](docs/model-spec.md) · [Edge cases](docs/edge-cases.md) · [Decision log](docs/decision-log.md) · [Storyboard](media-source/storyboard.md)
- [Voice casting and listening test](docs/voice-casting.md) · [Source audit](docs/source-audit.md) · [Reference adaptation](docs/reference-adaptation.md)
- [Handoff state](docs/handoff-state.md) · [Submission draft](docs/submission-draft.md)

## Licence and credits

Code: MIT (`LICENSE`). Lesson content and media: CC BY 4.0 (`LICENSE-CONTENT.md`), except the music of the 科普
film (“We Never (Remix)”, Hi Noise / 秋成), which is credited and not part of that licence. Narration is synthesised
with Kokoro-82M (Apache-2.0). Fonts: SIL OFL 1.1. The example data and the classroom rule are adapted from
yongfu-li/eda-learning and credited. The render contract idea is adapted from GateUltra/vlsi-course-director
(MIT, `NOTICE.md`). See `THIRD_PARTY_NOTICES.md`.

## Online Python practice

Section 08 now includes a real browser Python editor: run code, test the original exercise cases, inspect errors, save drafts, and import/export `.py` files. No Python installation is required. Runtime assets are served from this site, with no execution backend or CDN dependency. See [online Python documentation](docs/online-python.md).
