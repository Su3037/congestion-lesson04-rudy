# Voice casting and the listening gate

**Status (2026-11-23): the 精讲 and 实验演示 films ship with a synthesised voiceover (Kokoro-82M, zh `zf_039`, en `af_heart`), selected by an ASR screen. The blind listening test below has not been run yet; it remains the way to confirm or replace the voice.**

## What ships now

- **Engine:** Kokoro-82M through `kokoro-onnx`, offline (`scripts/voice/render-voice-kokoro.py`). Chinese uses the v1.1-zh model with misaki G2P; English uses v1.0 with espeak-ng.
- **How it is synthesised:** one whole caption line per take, never word by word, so each sentence keeps its own intonation. The film clock is then built from the measured length of every take (`scripts/build-films.mjs`), so the picture waits for the voice instead of the voice being squeezed to fit.
- **Spoken forms and lexicon:** `media-source/voice/lexicon.tsv` and the `speak_zh` / `speak_en` fields in `tools/films_src.py`: RUDY → 鲁迪, HPWL → 半周长线长 (zh) or "H P W L" (en), GCell → 布线格, fractions read numerator-aware (11/6 → 六分之十一, "eleven sixths"). What was actually spoken is recorded in `media-source/voice/spoken.json`.
- **Voice choice:** 18 Chinese voices read the same passage; each was transcribed by paraformer-zh (sherpa-onnx). `zf_039` had the lowest character error rate (0.029) and was chosen. English: `af_heart` at 0.95 speed.
- **Full-narration ASR check** (`scripts/voice/asr_check.py`, results copied to `media-source/voice/asr.json`): zh CER 0.075, en CER 0.027 over all 35 lines per language. The remaining zh "errors" are the recogniser writing spelled letters (A B C D) as words, "Python" as 拍分, and homophones such as 引脚/银角. These were judged from the transcripts only: **no person has listened to the full narration yet**, which is what the listening test below is for.
- **Loudness:** each take is trimmed and normalised (EBU R128); the score under the voice is ducked to about −33 dBFS (`scripts/mix_audio.py`).

## Why the earlier version was silent

The instructor's earlier feedback on this series flagged "machine voice" and "tts". Those films used `edge-tts`, synthesised one caption cue at a time with fixed gaps. The first build of this lesson could not reach any TTS and shipped silent. The owner then asked for music and a voiceover as in the earlier lessons, so the current voice was built with the measures above. The listening test below is the upgrade path.

## Listening test (prepared, not yet run)

1. **Script for the ear:** `voice-test/narration.zh.md`, one paragraph per film scene, breath marks as "/", numbers written as spoken ("三分之七", "二点三三"). It is a different text from the captions on purpose.
2. **Lexicon:** `voice-test/lexicon.zh.tsv`: RUDY (鲁迪), HPWL (always the Chinese full name), GCell, 容量 róngliàng, 溢出, 重叠/重合 chóng, 行 háng, 线长 cháng, and fraction order (7/3 is 三分之七, never 七分之三). Have a native speaker confirm it before synthesis.
3. **Synthesise by paragraph**, never by caption cue, with each engine's own pronunciation override (pinyin tags, phoneme input or SSML) for every lexicon term.
4. **Candidates to audition** (re-check model cards, licences and versions on the day; record them below): Fun-CosyVoice3-0.5B (Apache-2.0, pinyin overrides), Qwen3-TTS 1.7B (Apache-2.0), VoxCPM2 (Apache-2.0); IndexTTS-2 only after checking its licence for a CC BY course; a hosted voice only with cached output and terms recorded; and **a human reading of the same passage**, always included as the hidden reference. `edge-tts` / Azure Neural is the failed baseline, not a candidate.
5. **Audition passage:** P04 + P05 + the first half of P10 (≈ 60 s; contains 容量, 溢出, HPWL as 半周长线长, 二点三三, a coordinate, "DREAMPlace" nearby in P11, and a question).
6. **Objective screens** (all must pass before listeners hear a candidate): two independent ASR round trips (e.g. Qwen3-ASR and Whisper-large-v3) with CER ≤ 3%; 100% of lexicon terms read correctly; 3.8–4.8 characters per second from the alignment; no pause over 1.2 s except marked ones; F0 range not flat compared with the human reference; no glitches in a full listen; licence allows public CC BY distribution.
7. **Blind listening test:** `bash voice-test/prepare_clips.sh candidates/` level-matches the clips to −16 LUFS / −1 dBTP and gives them random names; serve `voice-test/listening-test/` as a static page; ≥ 8 native Mandarin listeners, ideally students of this course; each listener downloads a CSV. Score with `python3 voice-test/analyze.py results/*.csv`.
8. **Pass:** naturalness MOS ≥ 4.0 with its 95% CI reported, not significantly below the hidden human reference (paired sign test), and fewer than 30% "machine" votes. Pick the winner by this test, not by preference.
9. **After a pass:** force-align each paragraph (Montreal Forced Aligner, Mandarin model, or a CTC aligner), fill `voice-test/cue_map.json` (which narration span covers each film cue), run `python3 voice-test/retime.py aligned/*.json` to write `site/data/cue-clock.json`, load it with `setCueClock` in `film.js`, re-render, mix to −16 LUFS / −1 dBTP, and re-run CER, lexicon and loudness on the full narration. One native speaker listens to the whole film with the lexicon in hand and logs any mispronunciation with a timestamp.

## Results

| Date | Candidate | Version / settings | CER (ASR 1 / 2) | Lexicon | Rate | MOS ± CI | Machine % | vs human | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-23 | Kokoro-82M zf_039 (zh) / af_heart (en) | kokoro-onnx 0.6.1, v1.1-zh / v1.0, speed 1.0 / 0.95 | zh 0.075 / en 0.027 (paraformer-zh, whisper-base.en) | spoken forms for every lexicon term | from takes | not run | not run | not run | shipped pending listening test |
