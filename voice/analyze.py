"""Score the blind listening test.  python3 voice/analyze.py results/*.csv
Uses listening-test/KEY.private.json to unblind. Gates (from the deep prompt):
  naturalness MOS >= 4.0 (95% CI reported); not significantly below the hidden
  human reference (paired sign test, two-sided p < 0.05 counts as 'below');
  fewer than 30% 'machine' votes; at least 8 native listeners."""
import csv, json, math, sys
from collections import defaultdict
from pathlib import Path

key = json.loads((Path(__file__).parent / "listening-test" / "KEY.private.json").read_text())
rows = [r for f in sys.argv[1:] for r in csv.DictReader(open(f, encoding="utf-8"))]
natives = {r["listener"] for r in rows if r["native"] == "是"}
by = defaultdict(list); hm = defaultdict(list); per = defaultdict(dict)
for r in rows:
    if r["native"] != "是":
        continue
    c = key.get(r["clip"], r["clip"])
    by[c].append(float(r["naturalness"])); hm[c].append(r["human_or_machine"] == "machine")
    per[r["listener"]][c] = float(r["naturalness"])

def t95(n):  # two-sided 95% t critical values, small n
    table = {1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57, 6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23, 12: 2.18, 15: 2.13, 20: 2.09, 30: 2.04}
    return table.get(n, table[min(table, key=lambda k: abs(k - n))]) if n < 31 else 1.96

def sign_test(diffs):
    d = [x for x in diffs if x != 0]; n = len(d); k = sum(1 for x in d if x < 0)
    if n == 0: return 1.0
    p = sum(math.comb(n, i) for i in range(0, min(k, n - k) + 1)) / 2 ** n * 2
    return min(1.0, p)

print(f"native listeners: {len(natives)} (gate: >= 8)")
human = next((c for c in by if c.lower().startswith("human")), None)
for c in sorted(by, key=lambda c: -sum(by[c]) / len(by[c])):
    v = by[c]; n = len(v); m = sum(v) / n; sd = math.sqrt(sum((x - m) ** 2 for x in v) / (n - 1)) if n > 1 else 0
    ci = t95(n - 1) * sd / math.sqrt(n) if n > 1 else float("nan")
    mach = 100 * sum(hm[c]) / len(hm[c])
    line = f"{c:24s} MOS {m:.2f} ± {ci:.2f} (n={n})  machine votes {mach:.0f}%"
    if human and c != human:
        diffs = [per[l][c] - per[l][human] for l in per if c in per[l] and human in per[l]]
        p = sign_test(diffs); below = p < 0.05 and sum(diffs) < 0
        ok = len(natives) >= 8 and m >= 4.0 and not below and mach < 30
        line += f"  vs human p={p:.3f}  -> {'PASS' if ok else 'FAIL'}"
    print(line)
if not human:
    print("No clip named human*: the hidden human reference is missing, so no candidate can pass.")
