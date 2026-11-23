"""Render the narration takes for the voiced films (concise, lab) with Kokoro-82M, offline.

  python3 scripts/voice/render-voice-kokoro.py [--zh-voice zf_001] [--en-voice af_heart] [--only concise]

Each caption line is one complete sentence and is synthesised as one take (no word splicing), so prosody runs
over the whole sentence. The spoken text is the line's `speak_<lang>` if present, else the caption with the
lexicon in media-source/voice/lexicon.tsv applied. Output: media-source/voice/<film>-<cue>-<n>-<lang>.m4a
(AAC, 48 kHz mono) and media-source/voice/voices.json. build-films.mjs then measures every take with ffprobe.

Models (not in the repository; Apache-2.0): kokoro-v1.1-zh.onnx + voices-v1.1-zh.bin (Chinese) and
kokoro-v1.0.onnx + voices-v1.0.bin (English) from github.com/thewh1teagle/kokoro-onnx releases
(model-files-v1.1 / model-files-v1.0). Set RUDY_KOKORO_DIR to their folder. Needs Python 3.12 with
kokoro-onnx 0.4+, misaki[zh] 0.9.4, soundfile.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "media-source" / "voice"
LETTERS = {"A": "ˈeɪ", "B": "bˈiː", "C": "sˈiː", "D": "dˈiː", "E": "ˈiː", "F": "ˈɛf", "P": "pˈiː", "Q": "kjˈuː", "x": "ˈɛks", "y": "wˈaɪ"}


def lexicon():
    rows = [l.split("\t") for l in (OUT / "lexicon.tsv").read_text(encoding="utf-8").splitlines() if l and not l.startswith("#")]
    return {lang: [(w, s) for (lg, w, s, *_) in rows if lg == lang] for lang in ("zh", "en")}


def spoken(line, lang, lex):
    text = line.get(f"speak_{lang}") or line[lang]
    if not line.get(f"speak_{lang}"):
        for w, s in lex[lang]:
            text = re.sub(rf"\b{re.escape(w)}\b" if lang == "en" else re.escape(w), s, text)
    return text.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zh-voice", default="zf_001")
    ap.add_argument("--en-voice", default="af_heart")
    ap.add_argument("--zh-speed", type=float, default=1.0)
    ap.add_argument("--en-speed", type=float, default=0.95)
    ap.add_argument("--only", default=None)
    a = ap.parse_args()
    import soundfile as sf
    from kokoro_onnx import Kokoro
    from kokoro_onnx.tokenizer import Tokenizer
    from misaki import zh
    mdir = Path(os.environ.get("RUDY_KOKORO_DIR", ROOT / "build" / "kokoro"))
    tok = Tokenizer()

    def en_callable(s):
        return " ".join(LETTERS[w] if w in LETTERS else tok.phonemize(w, "en-us").strip() for w in s.split())

    g2p = zh.ZHG2P(version="1.1", en_callable=en_callable)
    kz = Kokoro(str(mdir / "kokoro-v1.1-zh.onnx"), str(mdir / "voices-v1.1-zh.bin"))
    ke = Kokoro(str(mdir / "kokoro-v1.0.onnx"), str(mdir / "voices-v1.0.bin"))
    lex = lexicon()
    OUT.mkdir(parents=True, exist_ok=True)
    log = []
    for film in ("concise", "lab"):
        if a.only and a.only != film:
            continue
        script = json.loads((ROOT / "content" / "films" / f"{film}.json").read_text(encoding="utf-8"))
        for cue in script["cues"]:
            for n, line in enumerate(cue["lines"], 1):
                for lang in ("zh", "en"):
                    text = spoken(line, lang, lex)
                    if lang == "zh":
                        ph, _ = g2p(text)
                        audio, sr = kz.create(ph, voice=a.zh_voice, speed=a.zh_speed, is_phonemes=True)
                    else:
                        audio, sr = ke.create(text, voice=a.en_voice, speed=a.en_speed, lang="en-us")
                    name = f"{film}-{cue['id']}-{n}-{lang}"
                    with tempfile.TemporaryDirectory() as td:
                        wav = Path(td) / "t.wav"
                        sf.write(wav, audio, sr)
                        # trim leading/trailing silence, normalise loudness, 48 kHz mono AAC
                        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-af",
                                        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,loudnorm=I=-18:TP=-2:LRA=7",
                                        "-ar", "48000", "-ac", "1", "-c:a", "aac", "-b:a", "128k", "-map_metadata", "-1", "-fflags", "+bitexact", str(OUT / f"{name}.m4a")], check=True)
                    log.append({"take": name, "text": text})
                    print(name, text)
    (OUT / "voices.json").write_text(json.dumps({
        "engine": "Kokoro-82M via kokoro-onnx (offline, Apache-2.0 weights)",
        "zh": f"{a.zh_voice} · kokoro-v1.1-zh · misaki[zh] G2P · speed {a.zh_speed}",
        "en": f"{a.en_voice} · kokoro-v1.0 · espeak-ng G2P · speed {a.en_speed}",
        "zhVoice": a.zh_voice, "enVoice": a.en_voice}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (OUT / "spoken.json").write_text(json.dumps(log, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
