"""Turn forced-alignment output into a measured cue clock for the film.
Input: one JSON per paragraph from your aligner, normalised to
  {"paragraph": "P04", "words": [{"text": "先", "start": 0.00, "end": 0.18}, ...]}
and voice/cue_map.json, which lists for each film cue the narration text span
that covers it ({"onenet.0": ["P04", "先只看一条", "到 B"], ...}).
Output: site/data/cue-clock.json  {"onenet.0": {"start": s, "end": e}, ...}
film.js uses these durations instead of the reading-time clock when the file
exists and the voice has passed the listening gate (docs/voice-casting.md)."""
import json, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
aligned = {}
for f in sys.argv[1:]:
    d = json.loads(Path(f).read_text(encoding="utf-8"))
    aligned[d["paragraph"]] = d["words"]
cmap = json.loads((root / "voice" / "cue_map.json").read_text(encoding="utf-8"))
out, t0 = {}, 0.0
for cue, (para, first, last) in ((k, v) for k, v in cmap.items() if not k.startswith("_")):
    if not first or not last:
        sys.exit(f"{cue}: fill in the narration span in voice/cue_map.json first")
    words = aligned[para]
    text = "".join(w["text"] for w in words)
    a, b = text.find(first), text.find(last)
    if a < 0 or b < 0:
        sys.exit(f"{cue}: span not found in aligned {para}")
    pos, start, end = 0, None, None
    for w in words:
        if start is None and pos + len(w["text"]) > a: start = w["start"]
        if pos + len(w["text"]) >= b + len(last): end = w["end"]; break
        pos += len(w["text"])
    out[cue] = {"paragraph": para, "start": start, "end": end, "duration": round(end - start + 0.35, 3)}
(root / "site" / "data" / "cue-clock.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(f"{len(out)} cues timed from alignment")
