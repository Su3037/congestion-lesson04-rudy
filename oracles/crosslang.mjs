// Oracle (d): JS (site/js/rudy.js, floats) versus the independent Python
// reference (python/rudy_ref.py, exact fractions) for models P and A, on varied
// grids, non-integer and boundary coordinates, line nets, coincident pins, and
// malformed inputs that both must reject.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as R from "../site/js/rudy.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(424242);
const pick = (a) => a[Math.floor(rand() * a.length)];
const N = Number(process.argv[2] || 2000);
const cases = [];
for (let n = 0; n < N; n++) {
  const nx = pick([1, 2, 3, 4, 5]), ny = pick([1, 2, 3]);
  const cw = pick([1, 2.5, 3, 4]), ch = pick([1, 2, 4, 0.5]);
  const W = nx * cw, H = ny * ch;
  const pins = ["p0", "p1", "p2", "p3", "p4", "p5", "p6"];
  const c = (max, step) => { const r = rand(); if (r < 0.35) return Math.round(rand() * (max / step)) * step; if (r < 0.5) return Math.round(rand() * max * 4) / 4; return rand() * max; };
  const pos = {};
  for (const p of pins) pos[p] = { x: c(W, cw), y: c(H, ch) };
  if (rand() < 0.2) pos.p1 = { ...pos.p0 };               // coincident
  if (rand() < 0.2) pos.p2 = { x: pos.p3.x, y: c(H, ch) }; // vertical
  const nets = Array.from({ length: 1 + Math.floor(rand() * 6) }, () => {
    const k = 1 + Math.floor(rand() * 4); const s = new Set(); while (s.size < k) s.add(pick(pins)); return [...s];
  });
  const prob = { chip: { W, H }, gcell: { nx, ny, cellW: cw, cellH: ch }, nets };
  // malformed variants (about 10%)
  const m = rand();
  if (m < 0.03) prob.nets = nets.concat([[]]);
  else if (m < 0.06) prob.nets = nets.concat([["ghost"]]);
  else if (m < 0.08) pos.p0 = { x: W + 1, y: 0 };
  else if (m < 0.1) prob.gcell = { ...prob.gcell, nx: nx + 1 };
  let js;
  try {
    const P = R.computeDemand(prob, pos, { model: "P" }).demand;
    const A = R.computeDemand(prob, pos, { model: "A" });
    js = { ok: true, P, A: A.demand, H: A.H, V: A.V };
  } catch (e) { js = { ok: false, err: e.errors?.map((x) => x.code) }; }
  cases.push({ prob, pos, js });
}
const tmp = path.join(root, ".cache"); fs.mkdirSync(tmp, { recursive: true });
fs.writeFileSync(path.join(tmp, "cross.json"), JSON.stringify(cases));
const py = `
import json,sys
sys.path.insert(0, ${JSON.stringify(path.join(root, "python"))})
import rudy_ref as R
cs=json.load(open(${JSON.stringify(path.join(tmp, "cross.json"))}))
agree=0; bad=0; rej=0; mx=0.0; ex=[]
for k,c in enumerate(cs):
    try:
        P=R.demand_p(c["prob"],c["pos"]); A,H,V=R.demand_a(c["prob"],c["pos"]); ok=True
    except R.RudyInputError:
        ok=False
    if ok!=c["js"]["ok"]:
        bad+=1; ex.append(k); continue
    if not ok:
        rej+=1; agree+=1; continue
    good=True
    for name,M in (("P",P),("A",A),("H",H),("V",V)):
        for i,col in enumerate(M):
            for j,v in enumerate(col):
                e=abs(float(v)-c["js"][name][i][j]); mx=max(mx,e)
                if e>1e-9*max(1,abs(float(v))): good=False
    agree+=good; bad+= (not good)
    if not good: ex.append(k)
print(json.dumps({"cases":len(cs),"agree":agree,"disagree":bad,"both_rejected":rej,"max_abs_diff":mx,"first_bad":ex[:5]}))
`;
const out = JSON.parse(execFileSync("python3", ["-I", "-c", py], { encoding: "utf8" }));
console.log(`JS vs Python reference (models P and A, H/V maps): ${out.cases} cases, ${out.agree} agree (${out.both_rejected} rejected by both), ${out.disagree} disagree, max |diff| ${out.max_abs_diff.toExponential(2)}`);
fs.mkdirSync(path.join(root, "oracles/results"), { recursive: true });
fs.writeFileSync(path.join(root, "oracles/results/crosslang.json"), JSON.stringify({ seed: 424242, ...out }, null, 1));
if (out.disagree) { console.log(JSON.stringify(cases[out.first_bad[0]])); process.exit(1); }
