# Third-party notices

| Component | Where | Licence | Source |
|---|---|---|---|
| Noto Sans SC (subset, Regular/Bold) | `site/fonts/NotoSansSC-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-NotoSansSC.txt`) | npm `@expo-google-fonts/noto-sans-sc@0.4.4`, SHA-256 in `media-source/fonts.sha256` |
| JetBrains Mono (subset, Regular/Bold) | `site/fonts/JetBrainsMono-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-JetBrainsMono.txt`) | npm `@expo-google-fonts/jetbrains-mono@0.4.1` |
| Noto Serif SC (subset, Regular/SemiBold) | `site/fonts/NotoSerifSC-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-NotoSerifSC.txt`) | npm `@expo-google-fonts/noto-serif-sc@0.4.4` |
| Newsreader (subset, Regular/Medium/Italic) | `site/fonts/Newsreader-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-Newsreader.txt`) | npm `@expo-google-fonts/newsreader@0.4.1` |
| Noto Sans (subset, Regular/SemiBold/Italic) | `site/fonts/NotoSans-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-NotoSans.txt`) | npm `@expo-google-fonts/noto-sans@0.4.2` |
| Music of the 科普 film: “We Never (Remix)（若如初见）”, Hi Noise / 秋成 | mixed into `site/media/story.{zh,en}.mp4` only; the recording is **not** in the repository | used by the owner, credited in the film's end card and on the page | owner's private copy; onsets for cutting in `content/music/wenever.json` (timings only, no audio) |
| Narration: Kokoro-82M (zh model v1.1-zh, voice `zf_039`; en model v1.0, voice `af_heart`) | `media-source/voice/*.m4a`, mixed into the `concise` and `lab` films | Apache-2.0 (model weights and voice packs) | hexgrad/Kokoro-82M, ONNX exports from thewh1teagle/kokoro-onnx releases; run with `kokoro-onnx` 0.6.1 (MIT) |
| G2P for the narration: misaki 0.9.4 (zh), espeak-ng via `espeakng-loader` (en words), jieba, pypinyin, cn2an | build tools only, not shipped | Apache-2.0; GPL-3.0 (espeak-ng); MIT | PyPI |
| ASR round-trip check of the narration: sherpa-onnx 2.0.3 with paraformer-zh-2023-09-14 and whisper-base.en | build tool only (`scripts/voice/asr_check.py`), not shipped | Apache-2.0 (sherpa-onnx); model licences per their releases | k2-fsa/sherpa-onnx GitHub releases |
| Teacher example data and the classroom RUDY rule | `fixtures/rudy-fixtures.json` → `teacher`; `tests/legacy/fixture.json`; `python-ref/fixture.json` | CC BY 4.0, credited | yongfu-li/eda-learning @ `003bcd4`, `courses/learn_congestion` (see `docs/source-audit.md`) |
| Teacher's code snapshots | `research/teacher/` | CC BY 4.0 (`research/teacher/LICENSE`) | unmodified, kept as evidence and run as an oracle |
| DREAMPlace and OpenROAD RUDY sources | `research/upstream/` | BSD-3-Clause (their `LICENSE` files) | DREAMPlace @ 4adf954, OpenROAD @ 7b26270; unmodified, used only as test oracles |
| fast-check, pytest, hypothesis (dev only) | `package.json`, `requirements-dev.txt` | MIT, MIT, MPL-2.0 | npm / PyPI |
| Render-contract idea | `scripts/render.mjs`, `site/render.html` | MIT (see `NOTICE.md`) | GateUltra/vlsi-course-director @ `dca1c25` |
| Playwright (dev only, not shipped) | `package.json` | Apache-2.0 | npm `playwright@1.63.0` |
| FFmpeg / libx264 (build tool, not shipped) | used by `scripts/render.mjs` | LGPL/GPL | system package 6.1.1 |

Subsetting is a modification the OFL allows. The subsets keep their family names; none uses a Reserved Font Name
(Noto's licence reserves only “Source”). The score of the 精讲, 进阶 and 实验演示 films is original (`scripts/music.py`,
NumPy synthesis, from the owner's course). No stock images or characters are used.

## Browser Python runtime

The online code lab vendors unmodified Pyodide 314.0.8 (MPL-2.0) and CPython 3.14.2 / standard-library files (PSF and retained notices). See `site/python-lab/vendor/README.md`, the bundled license texts and SHA256 manifest. These licenses are independent of the lesson licenses.
