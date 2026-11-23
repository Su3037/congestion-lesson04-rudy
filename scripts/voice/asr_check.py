"""Automatic intelligibility check of the narration takes: transcribe every take with an offline recogniser and
compare with the spoken text. Not a substitute for a native listener; it catches mispronounced or dropped words.

  python3 scripts/voice/asr_check.py  -> build/voice-asr.json (+ summary on stdout)

Recognisers (sherpa-onnx, offline): paraformer-zh-2023-09-14 (Chinese) and whisper-base.en (English), from
github.com/k2-fsa/sherpa-onnx releases (asr-models). Set RUDY_ASR_DIR to their parent folder.
Metric: character error rate (zh, Chinese numerals normalised with cn2an) and character error rate on letters/digits (en, number words as digits, spaces ignored).
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import sherpa_onnx

ROOT = Path(__file__).resolve().parents[2]
D = Path(os.environ.get("RUDY_ASR_DIR", "/home/user/tts"))


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype="<f4")


def edit(a, b):
    d = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, y in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (x != y))
    return d[len(b)]


def norm_zh(s):
    import cn2an
    s = cn2an.transform(s, "an2cn")
    return [c for c in s if "一" <= c <= "鿿" or c.isalpha()]


NUM = {"zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10", "eleven": "11", "twelve": "12", "twenty-two": "22", "twenty-eight": "28", "thirty-four": "34", "fourteen": "14"}


def norm_en(s):
    s = s.lower().replace("-", " - ")
    w = re.findall(r"[a-z0-9']+", s.replace(" - ", "-"))
    out = []
    for x in w:
        out.append(NUM.get(x, x))
    toks = " ".join(out).replace("-", " ").split()
    return list("".join(toks))  # character level: "H P W L" vs "HP WL" vs "HPWL" compare equal


def main():
    zh = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=str(D / "sherpa-onnx-paraformer-zh-2023-09-14/model.int8.onnx"), tokens=str(D / "sherpa-onnx-paraformer-zh-2023-09-14/tokens.txt"), num_threads=4)
    wd = D / "sherpa-onnx-whisper-base.en"
    en = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=str(wd / "base.en-encoder.int8.onnx"), decoder=str(wd / "base.en-decoder.int8.onnx"), tokens=str(wd / "base.en-tokens.txt"), num_threads=4)
    spoken = {r["take"]: r["text"] for r in json.loads((ROOT / "media-source/voice/spoken.json").read_text(encoding="utf-8"))}
    rows, tot = [], {"zh": [0, 0], "en": [0, 0]}
    for take, text in spoken.items():
        lang = take.rsplit("-", 1)[1]
        rec = zh if lang == "zh" else en
        s = rec.create_stream()
        s.accept_waveform(16000, load(ROOT / f"media-source/voice/{take}.m4a"))
        rec.decode_stream(s)
        hyp = s.result.text.strip()
        ref_t, hyp_t = (norm_zh(text), norm_zh(hyp)) if lang == "zh" else (norm_en(text), norm_en(hyp))
        e = edit(ref_t, hyp_t)
        tot[lang][0] += e; tot[lang][1] += len(ref_t)
        rows.append({"take": take, "ref": text, "hyp": hyp, "errors": e, "len": len(ref_t), "rate": round(e / max(1, len(ref_t)), 3)})
    summary = {lang: round(v[0] / max(1, v[1]), 4) for lang, v in tot.items()}
    out = ROOT / "build/voice-asr.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(summary))
    for r in sorted(rows, key=lambda r: -r["rate"])[:int(sys.argv[1]) if len(sys.argv) > 1 else 12]:
        print(r["rate"], r["take"], "|", r["ref"], "|", r["hyp"])


if __name__ == "__main__":
    main()
