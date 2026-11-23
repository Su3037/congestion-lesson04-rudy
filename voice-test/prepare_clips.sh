#!/usr/bin/env bash
# Level-match audition clips and give them blind names for the listening test.
#   bash voice-test/prepare_clips.sh candidates/  (one WAV per candidate, e.g. cosyvoice3.wav, human.wav)
# Writes listening-test/clips/<random>.m4a and listening-test/clips.json; the
# name → candidate key stays in listening-test/KEY.private.json (do not publish it).
set -euo pipefail
src="${1:?folder of candidate WAV files}"
here="$(cd "$(dirname "$0")" && pwd)"; out="$here/listening-test/clips"; mkdir -p "$out"
python3 - "$src" "$out" "$here/listening-test" <<'PY'
import json, os, random, subprocess, sys, secrets
src, out, base = sys.argv[1:4]
files = sorted(f for f in os.listdir(src) if f.lower().endswith((".wav", ".flac", ".m4a", ".mp3")))
key, clips = {}, []
for f in files:
    cid = secrets.token_hex(4)
    # EBU R128 two-pass would be better; single-pass loudnorm to -16 LUFS, -1 dBTP is enough for level matching
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(src, f), "-af", "loudnorm=I=-16:TP=-1:LRA=8", "-ar", "48000", "-c:a", "aac", "-b:a", "160k", os.path.join(out, cid + ".m4a")], check=True)
    key[cid] = os.path.splitext(f)[0]
    clips.append({"id": cid, "src": "clips/" + cid + ".m4a"})
random.shuffle(clips)
json.dump({"clips": clips}, open(os.path.join(base, "clips.json"), "w"), indent=1)
json.dump(key, open(os.path.join(base, "KEY.private.json"), "w"), indent=1)
print(f"{len(clips)} clips prepared")
PY
