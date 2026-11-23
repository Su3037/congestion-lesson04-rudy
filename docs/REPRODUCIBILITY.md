# Reproducibility

All paths are relative to the repository root. Nothing needs a paid service, a login or the author's machine.

## 1. One-time setup (downloads)

```bash
# Node 22 and Python 3.10+; g++ for the upstream-code oracle; ffmpeg for video
npm ci                                  # pinned by package-lock.json (fast-check, playwright, axe-core, fonts)
pip install -r requirements-dev.txt     # pytest, hypothesis (pinned)
npx playwright install chromium         # only if your machine has no Chromium for Playwright 1.63.0
```

If a Chromium is already installed elsewhere, set `CHROMIUM_PATH=/path/to/chromium` instead of installing.

## 2. Local, deterministic steps (no network)

```bash
npm test                                # JS unit + property tests (fixed seed)
python3 -m pytest -q tests/             # Python reference tests + Hypothesis (fixed seed)
npm run oracle:teacher                  # teacher's unmodified JS and Python vs model P
npm run oracle:crosslang                # JS vs Python reference, models P and A
npm run oracle:upstream                 # DREAMPlace and OpenROAD kernels (verbatim) vs model A
node oracles/edge_cases.mjs             # regenerates docs/edge-cases.md
(cd python && python3 check.py rudy_ref.py)   # practice checker on the reference
npm run build                           # dist/ (site, fonts, downloads, media, slides)
npm run render:stills                   # one PNG per caption cue + contact sheet (media/stills, media/out)
npm run render:sample                   # media/out/rudy-sample.zh.mp4 (41.5 s)
npm run render:film                     # media/out/rudy-full.zh.mp4 (261.9 s) + zh/en VTT
node scripts/render_film.mjs --cut full --lang en   # English-caption cut
SERVE_DIR=dist npm run slides:pdf       # slides/rudy-slides.{zh,en}.pdf + notes
npm run build && npm run check:site     # browser acceptance checks on dist/
npm run serve                           # http://localhost:8765/congestion-lesson04-rudy/
```

The render reads `dist/`, so run `npm run build` first. After a re-render, run `npm run build` again so the new MP4s are copied into `dist/`.

Posters: `ffmpeg -y -ss 70 -i media/out/rudy-full.zh.mp4 -frames:v 1 -q:v 3 media/out/poster.zh.jpg` (and the same for `en`).

## 3. What is and is not bit-identical

- Domain results, oracle results, VTT files, the edge-case table and the `stateAt(t)` snapshots are exactly reproducible.
- Frames are drawn from `stateAt(i / 30)`; the same Chromium build and fonts give the same pixels (checked by hashing out-of-order and fresh-page renders in `scripts/check_site.mjs`). A different Chromium, GPU path or font hinting can change anti-aliasing at the pixel level.
- MP4 bytes depend on the FFmpeg/x264 build. Built here with FFmpeg from Ubuntu 24.04 and libx264 `-preset slow -crf 20 -tune animation`. Do not expect identical MP4 hashes across machines; expect identical frame content and timing.

## 4. Isolated rebuild check

`docs/verification.md` records a clean clone of the pushed repository, `npm ci`, all tests and oracles, and a rebuild of the site and the sample film from that clone.
