// Oracle (a): the teacher's own, unmodified congestion-core.js and solvers.py
// versus this lesson's model P, on many deterministic generated cases.
// The only transformation is dropping the teacher file's canvas import line
// (a drawing helper that is not part of the computation and not in the pack).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as R from "../site/js/rudy.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = path.join(root, ".cache"); fs.mkdirSync(cache, { recursive: true });
const src = fs.readFileSync(path.join(root, "research/teacher/congestion-core.js"), "utf8")
  .replace(/^import .*canvas-hires\.js";\s*$/m, "const fitHiDpiCanvas=()=>{}; const LAB_CANVAS_CSS_HEIGHT=0;");
const tmp = path.join(cache, "teacher-core.mjs"); fs.writeFileSync(tmp, src);
const T = await import(pathToFileURL(tmp).href);
const fx = JSON.parse(fs.readFileSync(path.join(root, "site/data/fixture.json")));

// Small deterministic PRNG (mulberry32) so the case set is reproducible.
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(20261123);
function coord(max) {
  const r = rand();
  if (r < 0.3) return Math.floor(rand() * (max + 1));            // integers incl. boundaries and far edge
  if (r < 0.45) return [0, 3, 4, 6, 8, 9, 12].filter((v) => v <= max)[Math.floor(rand() * 7) % 7] ?? 0;
  if (r < 0.6) return Math.round(rand() * max * 2) / 2;          // halves
  return rand() * max;
}
const N = Number(process.argv[2] || 5000);
const cases = [];
let mism = 0, maxErr = 0;
for (let n = 0; n < N; n++) {
  const pos = Object.fromEntries(fx.pins.map((p) => [p, { x: coord(12), y: Math.min(8, coord(8)) }]));
  let nets = fx.nets;
  if (n % 2 === 1) {
    const k = 1 + Math.floor(rand() * 8);
    nets = Array.from({ length: k }, () => { const m = 1 + Math.floor(rand() * 6); return fx.pins.filter(() => rand() < m / 6).concat([fx.pins[Math.floor(rand() * 6)]]).filter((v, i, a) => a.indexOf(v) === i); });
  }
  const C = [0.5, 1, 2, 3.5][n % 4];
  const mine = R.computeDemand({ ...fx, nets }, pos).demand;
  const theirs = T.rudyDemand(pos, nets);
  const mm = R.metrics(mine, C), tm = T.overflowMetrics(theirs, C);
  let bad = false;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const e = Math.abs(mine[i][j] - theirs[i][j]); maxErr = Math.max(maxErr, e); if (e > 1e-9) bad = true; }
  if (Math.abs(mm.total - tm.total) > 1e-9 || Math.abs(mm.max - tm.max) > 1e-9 || mm.count !== tm.count) bad = true;
  if (bad) { mism++; if (mism < 5) console.log("MISMATCH", JSON.stringify({ pos, nets, mine, theirs, mm: [mm.total, mm.max, mm.count], tm: [tm.total, tm.max, tm.count] })); }
  if (n < 1000) cases.push({ pos, nets, C, js: mine });
}
console.log(`teacher JS vs lesson model P: ${N} cases, ${mism} mismatches, max |diff| ${maxErr.toExponential(2)}`);

// Teacher Python (solvers.py, unmodified) on the first 1000 cases.
fs.writeFileSync(path.join(cache, "teacher-cases.json"), JSON.stringify({ fx, cases }));
const py = `
import json,sys
sys.path.insert(0, ${JSON.stringify(path.join(root, "research/teacher"))})
from solvers import rudy_demand, overflow_metrics
d=json.load(open(${JSON.stringify(path.join(cache, "teacher-cases.json"))}))
fx=d["fx"]; bad=0; mx=0.0
for c in d["cases"]:
    data={"gcell":fx["gcell"],"capacity":c["C"],"nets":c["nets"]}
    D=rudy_demand(c["pos"], data)
    for i in range(4):
        for j in range(2):
            e=abs(D[i][j]-c["js"][i][j]); mx=max(mx,e)
            if e>1e-9: bad+=1
print(f"teacher Python vs lesson model P: {len(d['cases'])} cases, {bad} mismatching tiles, max |diff| {mx:.2e}")
`;
const out = execFileSync("python3", ["-I", "-c", py], { encoding: "utf8" });
process.stdout.write(out);
const pyBad = /, (\d+) mismatching/.exec(out)?.[1];
fs.writeFileSync(path.join(root, "oracles/results/teacher.json"), JSON.stringify({ date: new Date().toISOString().slice(0, 10), seed: 20261123, js_cases: N, js_mismatches: mism, js_max_abs_diff: maxErr, py_cases: cases.length, py_mismatching_tiles: Number(pyBad) }, null, 1));
if (mism || Number(pyBad)) process.exit(1);
