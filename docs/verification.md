# Verification · 验证记录

Every result below was produced by running the command shown, in the cloud work environment on 2026-11-23
(Node 22.23.5, Playwright 1.63.0 / Chromium, FFmpeg 6.1.1, Python 3.13.18; voice in a Python 3.12 venv). Nothing
was skipped unless it says so. Reports: `build/*.json` (not committed; regenerate with the commands).

## Summary (house-style rebuild)

| Command | Result |
|---|---|
| `node --test tests/*.test.mjs tests/legacy/*.test.mjs` | **48 / 48** pass: domain goldens (spread / cluster / boundary, edge rule, model A, conservation, validation), grading of all 7 challenges, timeline of all four films × zh/en (clocks, random access, cue boundaries, goldens at cue ends, conservation during accumulation, handoff, captions, music-locked title, lab walkthrough), and the 19 legacy core tests including fast-check properties |
| `python3 -m pytest -q tests/` | **12 / 12** pass: exact-fraction goldens, checker passes the reference 26/26 and the starter 0/26, a silent-skip and a no-clamp implementation are caught, practice reference = exact reference on 300 random instances, legacy Hypothesis properties |
| `npm run oracle:teacher` | model P vs the teacher's unmodified `congestion-core.js`: **5000 cases, 0 mismatches**; vs `solvers.py`: **1000 cases, 0 mismatching tiles** |
| `npm run oracle:upstream` | model A vs verbatim DREAMPlace kernel: **1489 cases, 0 mismatches** (max rel err 9.6e-14); vs OpenROAD `visitNetTiles`: **739 cases, 0 mismatches** (max rel err 1.6e-7) |
| `npm run oracle:crosslang` | site JS vs exact Python reference: **2000 cases, 2000 agree** (200 rejected by both), max diff 3.6e-15 |
| `node tests/browser.mjs` (local server, subpath `/congestion-lesson04-rudy/` and root) | **65 / 65** pass |
| `node scripts/check-media.mjs` | **151 / 151** pass: for each of the 8 films, codec, frame count = round(clock × 30), duration, full decode, render record and source hashes, clock hash and kind, AAC soundtrack of the right kind and audible, every voice take in the mix, captions and chapters VTT; decoded frames vs fresh `renderAt(t)` (PSNR ≥ 32 dB); exact frame map; slide PDFs with page numbers |
| `scripts/voice/asr_check.py` | narration ASR round trip: zh CER **0.075**, en CER **0.027** (35 lines each; `media-source/voice/asr.json`) |

## Films

| Film | Kind | zh | en | Audio |
|---|---|---|---|---|
| 科普 story | music | 3:09.8 (5695 frames) | 3:09.8 | “We Never (Remix)”, Hi Noise / 秋成 (private file, not committed) |
| 精讲 concise | voice | 2:37.2 (4715) | 2:32.3 (4569) | Kokoro zf_039 / af_heart over the ducked original score |
| 进阶 advanced | reading | 2:23.5 (4304) | 2:23.5 | original NumPy score |
| 实验演示 lab | voice | 1:06.9 (2005) | 1:01.6 (1848) | Kokoro zf_039 / af_heart over the ducked score; screenshots of the real page |

## Issues found and fixed during verification

- The HPWL font subsets lacked 68 characters used by this lesson (溢, 堵, 均, 鲁 …), so the browser fell back to a
  system font. Fonts were re-subset from the pinned npm packages (`scripts/fetch-fonts.sh`, `scripts/subset_fonts.py`)
  and every film and the slides were rebuilt afterwards.
- The one-net panel showed the running tile count in the product (“3 × 2 = 1 格”) while tiles were appearing; it now
  always shows 6. Story and concise were re-rendered.
- The site accepted an unused pin placed off the chip while the Python reference rejected it (9 of 2000 cross-language
  cases). Validation now checks every placed pin (decision D2).
- The lab walkthrough's drag aimed at the centre of the pin group, which includes its coordinate label; it now aims at
  the pin circle, and the recorded drag really moves A to x = 3.

## Not done / not claimed

Byte-identical MP4 across machines; a listening review of the narration (screened by ASR only; see
`docs/voice-casting.md`); rebuilding the story soundtrack from the repository alone (the track is not committed);
router correlation; screen-reader testing with real assistive technology; a learner study.
