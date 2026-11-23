"""Write media-source/storyboard.md from content/films/*.json and site/data/films/*.clock.*.json."""
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]
KIND = {"music": "cut to “We Never (Remix)（若如初见）”, Hi Noise / 秋成; cues start at fixed times in the track",
        "voice": "narrated (Kokoro-82M: zh zf_039, en af_heart); each cue's clock is set by the measured takes",
        "reading": "silent reading film with the original score; captions timed by reading speed"}
mmss = lambda t: f"{int(t // 60)}:{t % 60:04.1f}"
out = ["# Storyboard · 分镜", "",
       "Four films, each in a Chinese and an English version, 1920×1080, 30 fps. Times come from",
       "`site/data/films/<id>.clock.<lang>.json` (built by `scripts/build-films.mjs`). Every frame is `Scene(stateAt(t))`;",
       "boards are drawn by the same `Board()` as the lab. Caption text: `content/films/<id>.json` (source `tools/films_src.py`).", ""]
for fid in ["story", "concise", "advanced", "lab"]:
    s = json.loads((R / f"content/films/{fid}.json").read_text())
    c = {l: json.loads((R / f"site/data/films/{fid}.clock.{l}.json").read_text()) for l in ("zh", "en")}
    out += [f"## {s['title']['zh']} · {s['title']['en']}", "",
            f"{KIND[s['kind']]}. Duration zh {mmss(c['zh']['duration'])}, en {mmss(c['en']['duration'])}.", "",
            "| Ch | Cue | Scene | zh start | en start | Title | First line (zh) |", "|---|---|---|---|---|---|---|"]
    for i, cue in enumerate(s["cues"]):
        ch = s.get("chapters", {}).get(cue["chapter"], {}).get("zh", cue["chapter"])
        first = next((L["zh"] for L in cue["lines"] if L.get("zh")), "")
        out.append(f"| {cue['chapter']} {ch} | {cue['id']} | {cue['scene']} | {mmss(c['zh']['segments'][i]['start'])} | {mmss(c['en']['segments'][i]['start'])} | {cue['title']['zh']} · {cue['title']['en']} | {first} |")
    out.append("")
(R / "media-source/storyboard.md").write_text("\n".join(out))
print("storyboard written")
