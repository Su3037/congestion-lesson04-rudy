import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as R from "../adapter.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const harness = process.argv[2];
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(7);
const pick = (a) => a[Math.floor(rand() * a.length)];
const cases = [];
const N = 1500;
for (let n = 0; n < N; n++) {
  const square = n % 2 === 0;
  const nx = pick([2, 3, 4, 5]), ny = pick([1, 2, 3]);
  const cw = square ? pick([2, 3, 4]) : pick([3, 2.5, 1.5]);
  const ch = square ? cw : pick([4, 2, 1]);
  const W = nx * cw, H = ny * ch;
  const nets = [], pos = {};
  const nn = 1 + Math.floor(rand() * 5);
  let id = 0;
  for (let k = 0; k < nn; k++) {
    const deg = pick([2, 2, 3, 4, 5, 7]);
    const net = [];
    for (let q = 0; q < deg; q++) {
      const p = "p" + id++;
      pos[p] = square ? { x: Math.floor(rand() * (W + 1)), y: Math.floor(rand() * (H + 1)) } : { x: rand() * W, y: rand() * H };
      net.push(p);
    }
    const b = R.bbox(net, pos);
    if (b.w > 0 && b.h > 0) nets.push(net); // non-degenerate only: degenerate rules differ by design (docs/edge-cases.md)
  }
  if (!nets.length) continue;
  cases.push({ prob: { chip: { W, H }, gcell: { nx, ny, cellW: cw, cellH: ch }, nets }, pos });
}
const input = cases.map((c) => {
  const g = c.prob.gcell;
  return [g.nx, g.ny, g.cellW, g.cellH, c.prob.nets.length, ...c.prob.nets.flatMap((net) => [net.length, ...net.flatMap((p) => [c.pos[p].x, c.pos[p].y])])].join(" ");
}).join("\n") + "\n";
const out = execFileSync(harness, { input, encoding: "utf8", maxBuffer: 1 << 26 }).trim().split("\n");
let dpBad = 0, orBad = 0, orRun = 0, dpMax = 0, orMax = 0;
cases.forEach((c, k) => {
  const [hL, vL, oL] = out.slice(3 * k, 3 * k + 3);
  const dph = hL.split(" ").slice(1).map(Number), dpv = vL.split(" ").slice(1).map(Number);
  const G = R.gridOf(c.prob);
  // model A per net, weighted by the RISA factor DREAMPlace applies
  const WH = new Array(G.nx * G.ny).fill(0), WV = new Array(G.nx * G.ny).fill(0);
  for (const net of c.prob.nets) {
    const w = R.risaWeight(net.length);
    for (const p of R.netInfoA(net, c.pos, G).parts) { WH[p.i * G.ny + p.j] += w * p.h; WV[p.i * G.ny + p.j] += w * p.v; }
  }
  let bad = false;
  for (let t = 0; t < WH.length; t++) {
    const e = Math.max(Math.abs(WH[t] - dph[t]), Math.abs(WV[t] - dpv[t])) / Math.max(1, Math.abs(WH[t]) + Math.abs(WV[t]));
    dpMax = Math.max(dpMax, e); if (e > 1e-9) bad = true;
  }
  dpBad += bad;
  if (!oL.startsWith("OR skip")) {
    orRun++;
    const ort = oL.split(" ").slice(1).map(Number);
    const A = R.computeDemand(c.prob, c.pos, { model: "A" }).demand;
    const tileArea = G.cw * G.ch;
    let ob = false;
    for (let i = 0; i < G.nx; i++) for (let j = 0; j < G.ny; j++) {
      const want = (A[i][j] * 100) / tileArea;
      const e = Math.abs(want - ort[i * G.ny + j]) / Math.max(1, want);
      orMax = Math.max(orMax, e); if (e > 1e-5) ob = true;
    }
    orBad += ob;
  }
});
const res = { dreamplace_commit: "4adf954dfce83712c4cbee541b5208ca315fda11", openroad_commit: "7b26270095b3c710bdbac50d09af1767e2265572", seed: 7,
  dreamplace: { cases: cases.length, mismatches: dpBad, max_rel_err: dpMax }, openroad: { cases: orRun, mismatches: orBad, max_rel_err: orMax, note: "float32 kernel; tolerance 1e-5 relative" } };
console.log(`DREAMPlace kernel vs model A (H and V, RISA-weighted): ${res.dreamplace.cases} cases, ${dpBad} mismatches, max rel err ${dpMax.toExponential(2)}`);
console.log(`OpenROAD visitNetTiles vs model A ×100/tile area: ${orRun} cases, ${orBad} mismatches, max rel err ${orMax.toExponential(2)}`);
fs.writeFileSync(path.join(root, "oracles/results/upstream.json"), JSON.stringify(res, null, 1));
if (dpBad || orBad) process.exit(1);
