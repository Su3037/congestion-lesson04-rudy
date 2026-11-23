# Reproducibility · 复现

All commands run from the repository root. Paths are project-relative. The only private input is the music of the
科普 film, which is read from `RUDY_MUSIC_WENEVER` (or `/mnt/project-files/private-music/wenever.m4a`) and never
committed. The narration takes are committed, so rebuilding the films needs no TTS.

## 0. Environment

| Tool | Version used for the committed outputs | Needed for |
|---|---|---|
| Node.js | 22.23.4 | everything in JS (tests, clock, renderer, slides) |
| Playwright (npm) | 1.63.0, pinned in `package.json` / `package-lock.json` | browser tests, frame rendering, slides |
| Chromium | Playwright's build 1243 (`chromium.version()` is recorded in each `*.render.json`) | same |
| FFmpeg / ffprobe | 6.1.1 (Ubuntu 24.04 package) | encoding and media checks |
| Python | 3.13 (3.9+ is enough for the exercises); 3.12 venv for the voice (misaki needs < 3.13) | Python tests, PPTX, zip, voice |
| pytest / hypothesis / numpy | 8.3.4 / 6.122.3 / 2.x (`requirements-dev.txt`) | Python tests, legacy property tests, soundtrack mix |
| g++ | 13 (C++17) | upstream oracle only |
| python-pptx / pypdf | 1.0.2 / 6.x | PPTX build, PDF check |
| fontTools + brotli | 4.55.0 (only to re-subset fonts) | `scripts/subset_fonts.py` |

Clean setup on a new machine (network step, run once):

```sh
npm ci                                   # installs playwright@1.63.0 from the lockfile
npx playwright install --with-deps chromium
pip install -r requirements-dev.txt     # pytest, hypothesis, python-pptx, pypdf, numpy
sudo apt-get install ffmpeg              # or your OS's FFmpeg 6.x
```

Fonts are **committed** as subsets in `site/fonts/` (SIL OFL 1.1, licences beside them; hashes in
`media-source/fonts.json`), so no font download is needed for any build below. Only when lesson text gains new
characters: `sh scripts/fetch-fonts.sh` (network; checks the npm tarball SHA-256 in `media-source/fonts.sha256`)
then `python3 scripts/subset_fonts.py`.

## 1. Static website

The site is plain static files in `site/` (no bundler). Serve it with any static server:

```sh
node scripts/serve.mjs 8800 /congestion-lesson04-rudy/   # same subpath as GitHub Pages, with HTTP Range for video
# or: python3 -m http.server -d site 8800            # root path also works (all links are relative)
```

GitHub Pages publishes `site/` unchanged (`.github/workflows/pages.yml`).

## 2. Data, film clocks, captions, grading

```sh
node scripts/build.mjs --no-slides     # fixtures -> site/data, four films' clocks + VTT + chapters + transcripts, Python zip
npm test                               # node --test tests/*.test.mjs tests/legacy/*.test.mjs  +  pytest tests/
```

- `fixtures/rudy-fixtures.json` is the single data source: the teacher's example (spread, cluster, and an added
  boundary layout) and an edge fixture for the tile-index rule. Goldens are written in the tests by hand.
- `scripts/build-films.mjs` turns `content/films/{story,concise,advanced,lab}.json` into
  `site/data/films/<id>.clock.<lang>.json`, `site/media/<id>.<lang>.vtt`, `site/media/<id>.chapters.<lang>.vtt` and
  `media-source/transcripts/<id>.<lang>.md`. Three clock kinds (decisions D-07, D-21, D-23): **reading** (advanced;
  one clock for both languages), **music** (story; cues pinned to times in the track, violations fail the build),
  **voice** (concise, lab; one clock per language from measured take durations). Each clock records the script's
  SHA-256. Without voice takes the build fails; `--draft` writes provisional clocks that nothing final accepts.
- Film scripts are generated from `tools/films_src.py`, slides from `tools/slides_src.py`, the storyboard from
  `tools/storyboard.py`.

### Oracles

```sh
npm run oracle:teacher      # model P vs the teacher's unmodified congestion-core.js (5000 cases) and solvers.py (1000)
npm run oracle:upstream     # model A vs verbatim DREAMPlace and OpenROAD RUDY kernels, compiled with g++
npm run oracle:crosslang    # site JS vs the exact-fraction Python reference (python-ref/), 2000 cases
npm run oracle:edge         # regenerates docs/edge-cases.md
```

The oracles and `tests/legacy/` reach the site's `domain.js` through `oracles/adapter.mjs` (a format adapter only).

### Voice takes (Kokoro-82M, offline)

```sh
python3.12 -m venv ~/tts/venv && ~/tts/venv/bin/pip install kokoro-onnx==0.6.1 "misaki[zh]==0.9.4" sherpa-onnx cn2an soundfile
# model files from the kokoro-onnx GitHub releases: kokoro-v1.1-zh.onnx, voices-v1.1-zh.bin, kokoro-v1.0.onnx, voices-v1.0.bin
export RUDY_KOKORO_DIR=~/tts
~/tts/venv/bin/python scripts/voice/render-voice-kokoro.py --zh-voice zf_039 --en-voice af_heart
~/tts/venv/bin/python scripts/voice/asr_check.py      # ASR round trip (sherpa-onnx paraformer-zh, whisper-base.en)
node scripts/build-films.mjs                          # measures every take with ffprobe and rebuilds the voice clocks
```

Each line of `content/films/{concise,lab}.json` is synthesised as one take (its `speak_zh` / `speak_en` form if
present), trimmed, loudness-normalised and saved as `media-source/voice/<film>-<cue>-<n>-<lang>.m4a`. The engine,
voices and spoken text are recorded in `media-source/voice/voices.json` and `spoken.json`. Choice of voice and the
listening test: `docs/voice-casting.md`.

## 3. Stills and the lab walkthrough recording

```sh
node scripts/render.mjs --film story --lang zh --stills          # one PNG per cue mid-point -> build/stills/
node scripts/render.mjs --film advanced --stills 12.3,40.5       # chosen times
node scripts/record-walk.mjs                                     # screenshots of the real page -> site/data/walk/
```

`record-walk.mjs` must run after the other films are rendered (step 7 of the walkthrough pauses the advanced film).

## 4. Full films

```sh
export RUDY_MUSIC_WENEVER=/path/to/wenever.m4a     # only for the story film; the track is not in the repository
for f in story concise advanced lab; do for l in zh en; do node scripts/render.mjs --film $f --lang $l --full; done; done
node scripts/check-media.mjs                         # ffprobe, decode, audio, VTT, decoded-frame vs renderAt PSNR, source hashes
```

How a frame is made: `site/render.html?film=<id>&lang=<zh|en>` loads the fixtures, script, clock (and the walk
recording for the lab film), waits for fonts and images, then exposes `window.renderAt(t)`. The renderer calls it
for `t = frameIndex / 30` (random access, any order, four pages in parallel), screenshots 1920×1080 JPEG q95, and
FFmpeg encodes H.264 (`-crf 20 -preset slow -tune animation`, yuv420p). `scripts/mix_audio.py` builds the
soundtrack from the same clock (music track; or voice takes at their `voiceAt` times over the ducked NumPy score;
or the score alone), and it is muxed as AAC 160 kb/s. `*.render.json` records frame count, fps, clock hash and kind,
the audio sources and their SHA-256, SHA-256 of every source file, Node/Playwright/Chromium/FFmpeg versions,
wall time and page errors. A browser screen recording is never used.

**What is promised.** In the pinned environment the semantic state for a time is identical in any call order
(`tests/timeline.test.mjs`), and screenshots are pixel-identical in any order (`tests/browser.mjs`). Decoded
MP4 frames match a fresh `renderAt` of the same t (PSNR ≥ 32 dB, `scripts/check-media.mjs`). **Not promised:**
byte-identical MP4 files across operating systems, Chromium builds or encoder versions, or bit-identical voice takes
across onnxruntime builds (the takes are committed, so rebuilding the films does not need the TTS).

## 5. Slides and exports

```sh
node scripts/build-slides.mjs      # site/slides/rudy-slides.{zh,en}.pdf, slide JPGs, manifest, PPTX figures
python3 scripts/build_pptx.py      # site/slides/rudy-slides.{zh,en}.pptx (editable text, notes, page numbers)
python3 scripts/build-python-zip.py   # site/downloads/rudy-python.zip
```

## 6. Clean-checkout rebuild

```sh
sh scripts/clean-rebuild.sh        # clones HEAD into a temp dir, rebuilds data/slides, runs tests,
                                   # re-renders advanced.zh 40–44 s and compares it with the committed film
```

## 7. Tests

```sh
npm test                         # unit: domain, grading, timeline, legacy core + Python practice/reference/property tests
node tests/browser.mjs           # 40+ browser checks (subpath + root, lab, handoff, challenges, mobile, determinism)
node tests/browser.mjs --base https://su3037.github.io/congestion-lesson04-rudy/   # against the deployment
node scripts/check-media.mjs     # encoded media
```
