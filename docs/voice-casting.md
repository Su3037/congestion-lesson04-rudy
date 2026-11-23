# Voice casting and the listening gate

**Status (2026-11-23): no voice has passed. The public film is silent with burned-in Chinese captions (English captions as a separate cut and VTT).**

## Why silent first

The instructor's earlier feedback on this series flagged "machine voice" and "tts". Those films used GateUltra's recipe: `edge-tts` `zh-CN-YunxiNeural`, synthesised one caption cue at a time. Per-cue synthesis restarts the reading intonation on every line and glues fixed gaps between them; it is the main reason it sounded robotic. A silent captioned cut is always correct, so it ships first and the voice has to earn its place.

## What the build machine could and could not do

The cloud machine that built this lesson cannot reach Hugging Face or any hosted TTS endpoint (checked: `huggingface.co` and `speech.platform.bing.com` gave no connection). No candidate could be synthesised here. Everything below is prepared to run on a machine that can.

## Pipeline (prepared)

1. **Script for the ear:** `voice/narration.zh.md`, one paragraph per film scene, breath marks as "/", numbers written as spoken ("三分之七", "二点三三"). It is a different text from the captions on purpose.
2. **Lexicon:** `voice/lexicon.zh.tsv`: RUDY (鲁迪), HPWL (always the Chinese full name), GCell, 容量 róngliàng, 溢出, 重叠/重合 chóng, 行 háng, 线长 cháng, and fraction order (7/3 is 三分之七, never 七分之三). Have a native speaker confirm it before synthesis.
3. **Synthesise by paragraph**, never by caption cue, with each engine's own pronunciation override (pinyin tags, phoneme input or SSML) for every lexicon term.
4. **Candidates to audition** (re-check model cards, licences and versions on the day; record them below): Fun-CosyVoice3-0.5B (Apache-2.0, pinyin overrides), Qwen3-TTS 1.7B (Apache-2.0), VoxCPM2 (Apache-2.0); IndexTTS-2 only after checking its licence for a CC BY course; a hosted voice only with cached output and terms recorded; and **a human reading of the same passage**, always included as the hidden reference. `edge-tts` / Azure Neural is the failed baseline, not a candidate.
5. **Audition passage:** P04 + P05 + the first half of P10 (≈ 60 s; contains 容量, 溢出, HPWL as 半周长线长, 二点三三, a coordinate, "DREAMPlace" nearby in P11, and a question).
6. **Objective screens** (all must pass before listeners hear a candidate): two independent ASR round trips (e.g. Qwen3-ASR and Whisper-large-v3) with CER ≤ 3%; 100% of lexicon terms read correctly; 3.8–4.8 characters per second from the alignment; no pause over 1.2 s except marked ones; F0 range not flat compared with the human reference; no glitches in a full listen; licence allows public CC BY distribution.
7. **Blind listening test:** `bash voice/prepare_clips.sh candidates/` level-matches the clips to −16 LUFS / −1 dBTP and gives them random names; serve `voice/listening-test/` as a static page; ≥ 8 native Mandarin listeners, ideally students of this course; each listener downloads a CSV. Score with `python3 voice/analyze.py results/*.csv`.
8. **Pass:** naturalness MOS ≥ 4.0 with its 95% CI reported, not significantly below the hidden human reference (paired sign test), and fewer than 30% "machine" votes. Pick the winner by this test, not by preference.
9. **After a pass:** force-align each paragraph (Montreal Forced Aligner, Mandarin model, or a CTC aligner), fill `voice/cue_map.json` (which narration span covers each film cue), run `python3 voice/retime.py aligned/*.json` to write `site/data/cue-clock.json`, load it with `setCueClock` in `film.js`, re-render, mix to −16 LUFS / −1 dBTP, and re-run CER, lexicon and loudness on the full narration. One native speaker listens to the whole film with the lexicon in hand and logs any mispronunciation with a timestamp.

## Results

| Date | Candidate | Version / settings | CER (ASR 1 / 2) | Lexicon | Rate | MOS ± CI | Machine % | vs human | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | not run | not run | not run | not run | not run | not run | not run |
