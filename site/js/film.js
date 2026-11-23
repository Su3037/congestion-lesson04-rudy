// Film: an explicit timeline. stateAt(t) is a pure function of time and the
// immutable fixture; frameMarkup(t) draws it with the shared board. No wall
// clock, no accumulated simulation state, no randomness.
// SPDX-License-Identifier: MIT
import * as R from "./rudy.js";
import { boardMarkup, legendMarkup, NET_COLORS } from "./board.js";

export const FPS = 30;
export const W = 1280, H = 720;

// ---------- reading-time clock (silent cut) ----------
// No narration: each caption stays up long enough to read. 4.5 characters per
// second plus a 0.9 s settle, never below 2.6 s. (Limit in docs: ≤ 9 cps.)
export function readChars(s) {
  return [...s.replace(/\s+/g, "")].length;
}
export function cueDuration(zh) {
  return Math.max(2.6, readChars(zh) / 4.5 + 0.9);
}

// Caption line breaking: ≤ 16 CJK-width characters per line, at most 2 lines,
// prefer breaking after punctuation, never inside a number, formula or Latin token.
export function splitCaption(s, max = 16) {
  const w = (str) => [...str].reduce((a, ch) => a + (/[\u0000-ÿ]/.test(ch) ? 0.55 : 1), 0);
  if (w(s) <= max) return [s];
  const chars = [...s];
  let best = -1, bestScore = Infinity;
  for (let k = 1; k < chars.length; k++) {
    const a = chars.slice(0, k).join(""), b = chars.slice(k).join("");
    if (w(a) > max || w(b) > max) continue;
    const prev = chars[k - 1], next = chars[k];
    const a0 = chars.slice(0, k).join("");
    if ((a0.match(/[(（]/g) || []).length > (a0.match(/[)）]/g) || []).length) continue; // inside parentheses
    if ((a0.match(/[“"]/g) || []).length % 2 === 1 && !(a0.match(/”/g) || []).length) continue; // inside quotes
    if (/[0-9A-Za-z.\/×÷=+\-−(),_[\]]/.test(prev) && /[0-9A-Za-z.\/×÷=+\-−(),_[\]]/.test(next)) continue; // inside a token
    let score = Math.abs(w(a) - w(b));
    if (/[，、：；。？！,:;]/.test(prev)) score -= 12;
    if (score < bestScore) { bestScore = score; best = k; }
  }
  if (best < 0) return null; // caller must shorten the cue
  return [chars.slice(0, best).join("").trim(), chars.slice(best).join("").trim()];
}

// ---------- shared data ----------
const FX_URL = new URL("../data/fixture.json", import.meta.url);
let FX = null;
export async function loadFixture() {
  if (FX) return FX;
  if (typeof fetch === "function" && !FX_URL.protocol.startsWith("file")) FX = await (await fetch(FX_URL)).json();
  else FX = JSON.parse((await import("node:fs")).readFileSync(FX_URL, "utf8"));
  build(FX);
  return FX;
}
export function setFixture(fx) { FX = fx; build(fx); }

const spreadOf = (fx) => fx.presets.spread.positions;
const clusterOf = (fx) => fx.presets.cluster.positions;
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u));

const CODE = {
  zh: [
    "demand ← 全零矩阵 [nx][ny]",
    "for 每条 net:",
    "  box ← 所有 pin 的外接矩形",
    "  hpwl ← 框宽 + 框高",
    "  tiles ← 两角所在格之间的全部格",
    "  share ← hpwl ÷ |tiles|",
    "  每个 t ∈ tiles: demand[t] += share",
    "overflow[t] ← max(0, demand[t] − C)",
  ],
  en: [
    "demand ← zero matrix [nx][ny]",
    "for each net:",
    "  box ← bounding box of its pins",
    "  hpwl ← box width + box height",
    "  tiles ← all tiles between the corner tiles",
    "  share ← hpwl ÷ |tiles|",
    "  for t in tiles: demand[t] += share",
    "overflow[t] ← max(0, demand[t] − C)",
  ],
};
export { CODE };

function netCue(fx, k) {
  const pos = spreadOf(fx);
  const G = R.gridOf(fx);
  const info = R.netInfoP(fx.nets[k], pos, G);
  const name = fx.nets[k].join("–");
  return {
    zh: `第 ${k + 1} 条 ${name}：HPWL ${R.num(info.hpwl)}，${info.tiles.length} 格，每格 ${R.fracText(info.share)}。`,
    en: `Net ${k + 1}, ${name}: HPWL ${R.num(info.hpwl)}, ${info.tiles.length} tiles, ${R.fracText(info.share)} each.`,
  };
}

// ---------- scenes ----------
// Each scene: id, cues [{zh,en}], hold (extra seconds at the end), and
// view(ctx) -> { boards: [...], panel } where ctx = { k (cue index), u (0..1 in scene), tc (seconds into cue), ts (seconds into scene) }.
function scenes(fx) {
  const spread = spreadOf(fx), cluster = clusterOf(fx);
  const base = { problem: fx, positions: spread, model: "P", capacity: 2, layer: "none", selectedNet: null };
  const G = R.gridOf(fx);
  const net0 = R.netInfoP(fx.nets[0], spread, G);
  const S = [];

  S.push({ id: "title", hold: 0.6, cues: [
    { zh: "拥塞估计 第四课：RUDY", en: "Congestion, Lesson 4: RUDY" },
    { zh: "布线之前，先估计哪里会挤。", en: "Before routing, estimate where it will be crowded." },
  ], view: ({ ts }) => ({ boards: [{ ...base, show: { flylines: true, ids: false }, layerOpacity: 1 }], panel: { kind: "title", fade: ease(ts / 0.8) } }) });

  S.push({ id: "problem", hold: 0.4, cues: [
    { zh: "这块芯片 12×8，六个 pin，六条 net。", en: "A 12 × 8 chip, six pins, six nets." },
    { zh: "虚线只表示谁连谁，不是走线。", en: "Dashed lines show connections, not routes." },
    { zh: "六条 net 的 HPWL 加起来是 34。", en: "The six nets' HPWL adds up to 34." },
    { zh: "可这个总数说不出：线会挤在哪里？", en: "But the total cannot say where wires will crowd." },
  ], view: ({ k }) => ({ boards: [{ ...base, show: { ids: false, tiles: false } }], panel: { kind: "hpwl", step: k } }) });

  S.push({ id: "grid", hold: 0.4, cues: [
    { zh: "把芯片切成 4×2 个布线格，叫 GCell。", en: "Cut the chip into 4 × 2 routing tiles, called GCells." },
    { zh: "每格宽 3、高 4。", en: "Each tile is 3 wide and 4 tall." },
    { zh: "需求按 demand[x][y] 存：先列，后行。", en: "Demand is stored as demand[x][y]: column first." },
    { zh: "每格能容纳的布线量叫容量，这里取 2。", en: "What a tile can hold is its capacity; here 2." },
  ], view: ({ k }) => ({ boards: [{ ...base, show: { flylines: k < 1, ids: true }, highlightTile: k >= 2 ? { i: 2, j: 1 } : null }], panel: { kind: "grid", step: k } }) });

  const sampleOne = [
    { zh: "先看一条 net：A–B。", en: "Start with one net: A–B." },
    { zh: "外接框宽 7、高 0，所以 HPWL 是 7。", en: "Its box is 7 wide and 0 tall, so HPWL is 7." },
    { zh: "左端 x=1 落在第 0 列，右端 x=8 落在第 2 列。", en: "Left end x=1 is in column 0; right end x=8 is in column 2." },
    { zh: "两端之间的格全部选中，一共 3 格。", en: "Every tile between them is selected: 3 tiles." },
    { zh: "每格分到 7÷3，约 2.33。", en: "Each tile gets 7 ÷ 3, about 2.33." },
  ];
  const oneNetView = ({ k }) => ({
    boards: [{ ...base, selectedNet: 0, onlySelectedFly: true, showDims: k >= 1, show: { tiles: k >= 3, share: k >= 4, bbox: k >= 1 } }],
    panel: { kind: "onenet", step: k, info: net0, codeLine: [1, 3, 4, 4, 5][k] },
  });
  S.push({ id: "onenet", hold: 0.6, cues: sampleOne, view: oneNetView, sample: true });

  S.push({ id: "deposit", hold: 0.8, cues: [
    { zh: "把 7/3 加进这三格。", en: "Add 7/3 to each of the three tiles." },
    { zh: "和容量 2 比，每格已经多出 1/3。", en: "Against capacity 2, each is already 1/3 over." },
    { zh: "这就是溢出：max(0, 需求−容量)。", en: "That is overflow: max(0, demand − capacity)." },
  ], view: ({ k, tc }) => ({
    boards: [{ ...base, selectedNet: 0, onlySelectedFly: true, upto: 1, layer: k >= 2 ? "overflow" : "demand", layerOpacity: k === 0 ? ease(tc / 0.8) : 1, show: { tiles: k === 0, share: k === 0, bbox: k === 0 } }],
    panel: { kind: "deposit", step: k, codeLine: k >= 2 ? 7 : 6, legend: k >= 2 ? "overflow" : "demand" },
  }), sample: true });

  // boundary: A slides from x=2.2 to x=3; the selected tiles jump when it crosses
  const bProb = { ...fx, nets: [["A", "B"]] };
  S.push({ id: "boundary", hold: 0.8, cues: [
    { zh: "边界有个细节：看 pin 正好落在 x=3。", en: "A boundary detail: watch a pin land exactly on x=3." },
    { zh: "floor(3÷3)=1，它算进下一列。", en: "floor(3 ÷ 3) = 1, so it counts in the next column." },
    { zh: "(1,1) 到 (3,1)：选两格，每格 1。", en: "(1,1) to (3,1): two tiles, 1 each." },
    { zh: "重合的 pin：HPWL 是 0，就加 0。", en: "Coincident pins: HPWL is 0, so add 0." },
  ], view: ({ k, tc }) => {
    let pos;
    if (k === 0) pos = { A: { x: 1, y: 1 }, B: { x: lerp(2.2, 2.9, ease(tc / 2.5)), y: 1 } };
    else if (k < 3) pos = { A: { x: 1, y: 1 }, B: { x: 3, y: 1 } };
    else pos = { A: { x: 7.5, y: 6 }, B: { x: 7.5, y: 6 } };
    pos.B.x = Math.round(pos.B.x * 100) / 100;
    return { boards: [{ problem: bProb, positions: pos, model: "P", capacity: 2, layer: "demand", selectedNet: 0, upto: 1, showDims: true, show: { ids: true } }], panel: { kind: "boundary", step: k, pos } };
  } });

  const acc = [];
  for (let n = 1; n < fx.nets.length; n++) acc.push(netCue(fx, n));
  acc.push({ zh: "注意：这是部分累加，还不是最终需求。", en: "Note: this is a partial sum, not the final demand." });
  S.push({ id: "accumulate", hold: 0.6, cues: acc, view: ({ k, tc }) => {
    const n = Math.min(k + 1, fx.nets.length - 1); // net index being added
    const isNote = k >= fx.nets.length - 1;
    const upto = isNote ? 4 : n + (tc > 1.4 ? 1 : 0);
    return { boards: [{ ...base, layer: "demand", upto: isNote ? 4 : upto, selectedNet: isNote ? null : n, show: { share: true } }], panel: { kind: "accumulate", net: n, upto: isNote ? 4 : upto, note: isNote, codeLine: tc > 1.4 ? 6 : 5 } };
  } });

  S.push({ id: "final", hold: 0.8, cues: [
    { zh: "六条都加完，这才是完整的需求图。", en: "All six added: now this is the full demand map." },
    { zh: "八格加起来是 34，正好等于 HPWL 总和。", en: "The eight tiles sum to 34, exactly the total HPWL." },
    { zh: "在这个模型里，需求是守恒的。", en: "In this model, demand is conserved." },
  ], view: ({ k }) => ({ boards: [{ ...base, layer: "demand" }], panel: { kind: "final", step: k, legend: "demand" } }) });

  S.push({ id: "capacity", hold: 0.8, cues: [
    { zh: "容量 2：比值超过 1 的格就溢出。", en: "Capacity 2: any tile with ratio above 1 overflows." },
    { zh: "六格溢出，总溢出 22，最大 14/3。", en: "Six tiles overflow; total 22, max 14/3." },
    { zh: "把容量改成 1，需求一个数都没变。", en: "Set capacity to 1: not one demand number changes." },
    { zh: "变的只有比值和溢出：总溢出 28。", en: "Only ratio and overflow change: total overflow 28." },
  ], view: ({ k }) => {
    const C = k >= 2 ? 1 : 2;
    const layer = k === 0 ? "ratio" : k === 2 ? "demand" : "overflow";
    return { boards: [{ ...base, capacity: C, layer }], panel: { kind: "capacity", step: k, C, legend: layer } };
  } });

  S.push({ id: "compare", hold: 1.0, cues: [
    { zh: "再看老师给的另一种摆法：中心聚集。", en: "Now the teacher's other placement: a centre cluster." },
    { zh: "需求全挤进一格，是 7。", en: "All demand lands in one tile: 7." },
    { zh: "两张图用同一把色尺：同色就是同值。", en: "Both maps share one legend: same colour, same value." },
    { zh: "换成展开，最大溢出从 5 降到 4.67。", en: "Spread out, max overflow drops from 5 to 4.67." },
    { zh: "可总溢出从 5 升到 22。", en: "But total overflow rises from 5 to 22." },
    { zh: "因为这里总需求就是总线长：7 对 34。", en: "Here total demand is total wirelength: 7 vs 34." },
    { zh: "说“更好”之前，先说按哪个指标。", en: "Before saying 'better', name the metric." },
  ], view: ({ k }) => ({
    boards: [
      { ...base, positions: cluster, layer: "overflow", show: { values: true, ids: false }, tag: "cluster" },
      { ...base, positions: spread, layer: "overflow", show: { values: true, ids: false }, tag: "spread" },
    ],
    panel: { kind: "compare", step: k, legend: "overflow" },
  }) });

  S.push({ id: "modelA", hold: 1.0, cues: [
    { zh: "同样的 pin，改成按重叠面积分配。", en: "Same pins, now shared by overlap area." },
    { zh: "DREAMPlace 和 OpenROAD 的代码都这样算。", en: "DREAMPlace and OpenROAD code both work this way." },
    { zh: "框中间的格分得多，边角格分得少。", en: "Tiles in the middle of a box get more, corners less." },
    { zh: "这样算，展开布局的最大溢出是 5.54。", en: "Computed this way, the spread's max overflow is 5.54." },
    { zh: "结论会随模型变，先说清用哪种 RUDY。", en: "Conclusions move with the model: say which RUDY." },
  ], view: ({ k }) => ({
    boards: [
      { ...base, layer: k >= 3 ? "overflow" : "demand", show: { ids: false }, tag: "P" },
      { ...base, model: "A", layer: k >= 3 ? "overflow" : "demand", show: { ids: false }, tag: "A" },
    ],
    panel: { kind: "modelA", step: k, legend: k >= 3 ? "overflow" : "demand" },
  }) });

  S.push({ id: "limits", hold: 0.8, cues: [
    { zh: "RUDY 是布线前的快速估计，不是布线器。", en: "RUDY is a fast pre-routing estimate, not a router." },
    { zh: "真实容量要分方向，还要分金属层。", en: "Real capacity is split by direction and by metal layer." },
    { zh: "多 pin 的 net 实际更长，RISA 会乘系数。", en: "Multi-pin nets run longer; RISA scales them up." },
    { zh: "它最适合给布局一个快速反馈。", en: "Its best use is quick feedback during placement." },
  ], view: ({ k }) => ({ boards: [{ ...base, model: "A", layer: "demand", show: { ids: false, values: false } }], panel: { kind: "limits", step: k } }) });

  S.push({ id: "outro", hold: 1.2, cues: [
    { zh: "暂停影片，点“试试这一帧”，", en: "Pause the film and press 'Try this frame'" },
    { zh: "把这一刻的 pin 和网格带进实验室。", en: "to take these pins and this grid into the lab." },
  ], view: () => ({ boards: [{ ...base, layer: "demand" }], panel: { kind: "outro" } }) });
  return S;
}

// ---------- timeline ----------
let TL = null;
// Optional measured cue clock from forced alignment (voice/retime.py). Unused
// until a narration track passes the listening gate; the silent cut uses the
// reading-time clock above.
let CLOCK = null;
export function setCueClock(c) { CLOCK = c; if (FX) build(FX); }
const durOf = (scId, k, c) => CLOCK?.[`${scId}.${k}`]?.duration ?? cueDuration(c.zh);
function build(fx) {
  const S = scenes(fx);
  const full = [];
  let t = 0;
  for (const sc of S) {
    const start = t;
    const cues = sc.cues.map((c, k) => { const d = durOf(sc.id, k, c); const cue = { ...c, start: t, end: t + d }; t += d; return cue; });
    t += sc.hold;
    full.push({ ...sc, start, end: t, cues });
  }
  // sample cut: a short title card, then the one-net and deposit scenes
  const sample = [];
  let ts = 0;
  const sampleScenes = [{ id: "sampletitle", hold: 0.4, cues: [{ zh: "RUDY 小样：一条 net 的需求", en: "RUDY sample: one net's demand" }], view: S[0].view }, ...S.filter((s) => s.sample)];
  for (const sc of sampleScenes) {
    const start = ts;
    const cues = sc.cues.map((c, k) => { const d = durOf(sc.id, k, c); const cue = { ...c, start: ts, end: ts + d }; ts += d; return cue; });
    ts += sc.hold;
    sample.push({ ...sc, start, end: ts, cues });
  }
  TL = { full: { scenes: full, duration: t }, sample: { scenes: sample, duration: ts } };
}
export function timeline(cut = "full") { return TL[cut]; }
export function duration(cut = "full") { return TL[cut].duration; }

/** Pure: everything needed to draw time t (seconds) of a cut. */
export function stateAt(t, cut = "full") {
  const tl = TL[cut];
  const tt = Math.max(0, Math.min(t, tl.duration - 1e-6));
  let sc = tl.scenes[tl.scenes.length - 1];
  for (const s of tl.scenes) if (tt >= s.start && tt < s.end) { sc = s; break; }
  let k = sc.cues.length - 1;
  for (let q = 0; q < sc.cues.length; q++) if (tt < sc.cues[q].end) { k = q; break; }
  const cue = sc.cues[k];
  const ctx = { k, tc: tt - cue.start, ts: tt - sc.start, u: (tt - sc.start) / (sc.end - sc.start) };
  const v = sc.view(ctx);
  return { t: tt, cut, scene: sc.id, cueIndex: k, caption: { zh: cue.zh, en: cue.en }, captionFade: ease((tt - cue.start) / 0.25), ...v };
}

/** The state "Try this frame" hands to the lab: exact pins, grid, model, capacity, selection. */
export function labSnapshot(t, cut = "full") {
  const s = stateAt(t, cut);
  const b = s.boards[s.boards.length - 1];
  return {
    from: { cut, t: Math.round(s.t * 1000) / 1000, scene: s.scene, cue: s.cueIndex },
    problem: { chip: b.problem.chip, gcell: b.problem.gcell, capacity: b.problem.capacity, nets: b.problem.nets },
    positions: JSON.parse(JSON.stringify(b.positions)),
    model: b.model || "P",
    capacity: b.capacity,
    selectedNet: b.selectedNet ?? null,
    upto: b.upto ?? null,
    layer: b.layer,
  };
}

// ---------- drawing ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function textLines(lines, x, y, size, color = "#dfe7fb", gap = 1.45, weight = 400) {
  return lines.map((l, n) => {
    const o = typeof l === "string" ? { text: l } : l;
    return `<text x="${x}" y="${y + n * size * gap}" font-size="${o.size || size}" fill="${o.color || color}" font-weight="${o.weight || weight}"${o.mono ? ' font-family="JetBrains Mono, monospace"' : ""}>${esc(o.text)}</text>`;
  }).join("");
}

function codeBlock(lang, hl, x, y) {
  const lines = CODE[lang];
  const out = [`<rect x="${x - 12}" y="${y - 24}" width="520" height="${lines.length * 27 + 18}" rx="8" fill="#0c1222" stroke="#2a3756"/>`];
  lines.forEach((l, n) => {
    if (n === hl) out.push(`<rect x="${x - 10}" y="${y - 19 + n * 27}" width="516" height="25" rx="4" fill="#2b3f6b"/>`);
    out.push(`<text x="${x}" y="${y + n * 27}" font-size="16" fill="${n === hl ? "#ffffff" : "#9fb0d3"}" font-family="JetBrains Mono, Noto Sans SC, monospace" xml:space="preserve">${esc(`${n + 1}  ${l}`)}</text>`);
  });
  return out.join("");
}

function metricRows(fx, positions, model, C, lang) {
  const d = R.computeDemand(fx, positions, { model }).demand;
  const m = R.metrics(d, C);
  const L = lang === "zh" ? ["需求总和", "总溢出", "最大溢出", "溢出格数"] : ["Sum of demand", "Total overflow", "Max overflow", "Tiles over"];
  return [[L[0], R.num(m.sumDemand)], [L[1], R.fracText(m.total)], [L[2], R.fracText(m.max)], [L[3], String(m.count)]];
}

function panelMarkup(fx, p, lang, s) {
  const x = 730, y = 92;
  const zh = lang === "zh";
  const out = [];
  const title = (t) => out.push(`<text x="${x}" y="${y}" font-size="30" font-weight="700" fill="#ffffff">${esc(t)}</text>`);
  const G = R.gridOf(fx);
  switch (p.kind) {
    case "title": {
      out.push(`<g opacity="${p.fade}"><text x="${x}" y="${y + 60}" font-size="54" font-weight="700" fill="#ffffff">RUDY</text>`);
      out.push(textLines([zh ? "矩形均匀布线密度" : "Rectangular Uniform wire DensitY", { text: zh ? "拥塞估计 · 第四课" : "Congestion · Lesson 4", color: "#8fb5ff" }], x, y + 110, 26));
      out.push(textLines([{ text: zh ? "课堂简化模型：等份分配（老师的教学版本）" : "Classroom proxy: equal shares (the teacher's version)", color: "#9fb0d3" }], x, y + 230, 18));
      out.push(`</g>`);
      break;
    }
    case "hpwl": {
      title(zh ? "只看总线长，看不出位置" : "Total wirelength hides location");
      const rows = fx.nets.map((net, k) => { const b = R.bbox(net, s.boards[0].positions); return { text: `${net.join("–").padEnd(8)}  ${R.num(b.w)} + ${R.num(b.h)} = ${R.num(b.w + b.h)}`, color: NET_COLORS[k], mono: true }; });
      out.push(textLines(p.step >= 2 ? rows : rows.slice(0, 0), x, y + 50, 19));
      if (p.step >= 2) out.push(textLines([{ text: (zh ? "合计 HPWL = " : "Total HPWL = ") + R.num(R.totalHpwl(fx, s.boards[0].positions)), weight: 700, size: 24 }], x, y + 50 + 6 * 27 + 20, 24));
      if (p.step >= 3) out.push(textLines([{ text: zh ? "同样的总数，可以集中在一处，也可以分散。" : "The same total can be concentrated or spread.", color: "#ffd27a" }], x, y + 300, 19));
      break;
    }
    case "grid": {
      title(zh ? "布线格 GCell 与需求矩阵" : "GCells and the demand matrix");
      const l = [
        zh ? `${G.nx} 列 × ${G.ny} 行，每格 ${G.cw} × ${G.ch}` : `${G.nx} columns × ${G.ny} rows, each ${G.cw} × ${G.ch}`,
        zh ? "格号 = (floor(x÷3), floor(y÷4))，越界夹回网格" : "tile = (floor(x/3), floor(y/4)), clamped to the grid",
      ];
      out.push(textLines(l.slice(0, p.step + 1), x, y + 50, 20));
      if (p.step >= 2) {
        out.push(textLines([{ text: "demand[x][y]", mono: true, color: "#8fb5ff", size: 22 }], x, y + 140, 22));
        out.push(textLines([{ text: zh ? "高亮格：x 方向第 2 列，y 方向第 1 行 → demand[2][1]" : "Highlighted: column 2, row 1 → demand[2][1]", color: "#ffffff" }], x, y + 180, 18));
      }
      if (p.step >= 3) out.push(textLines([{ text: zh ? "容量 C = 2（同一教学单位）" : "Capacity C = 2 (same teaching units)", color: "#ffd27a", size: 22 }], x, y + 240, 22));
      break;
    }
    case "onenet": {
      title(zh ? "一条 net 怎样变成需求" : "How one net becomes demand");
      const i = p.info;
      const l = [];
      if (p.step >= 1) l.push({ text: `box: x ${R.num(i.bbox.x0)}…${R.num(i.bbox.x1)},  y ${R.num(i.bbox.y0)}…${R.num(i.bbox.y1)}`, mono: true });
      if (p.step >= 1) l.push({ text: `hpwl = ${R.num(i.bbox.w)} + ${R.num(i.bbox.h)} = ${R.num(i.hpwl)}`, mono: true });
      if (p.step >= 2) l.push({ text: `floor(1/3)=0   floor(8/3)=2`, mono: true });
      if (p.step >= 3) l.push({ text: zh ? `选中格: (0,0) (1,0) (2,0)  → 3 格` : `tiles: (0,0) (1,0) (2,0) → 3`, mono: true });
      if (p.step >= 4) l.push({ text: `share = 7 ÷ 3 = 7/3 ≈ 2.33`, mono: true, color: "#ffd27a", weight: 700 });
      out.push(textLines(l, x, y + 48, 19));
      out.push(codeBlock(lang, p.codeLine, x + 12, y + 245));
      break;
    }
    case "deposit": {
      title(zh ? "加进需求，再和容量比" : "Deposit, then compare with capacity");
      const l = [{ text: `demand(0,0) = demand(1,0) = demand(2,0) = 7/3`, mono: true }];
      if (p.step >= 1) l.push({ text: `7/3 − 2 = 1/3 > 0`, mono: true, color: "#ffd27a" });
      if (p.step >= 2) l.push({ text: zh ? "溢出 = max(0, 需求 − 容量)" : "overflow = max(0, demand − capacity)", color: "#ffb4a6" });
      out.push(textLines(l, x, y + 48, 19));
      out.push(codeBlock(lang, p.codeLine, x + 12, y + 245));
      break;
    }
    case "boundary": {
      title(zh ? "边界规则：含两端的格" : "The boundary rule");
      const b = p.pos.B, a = p.pos.A;
      const G2 = R.gridOf(fx);
      const ia = R.tileIndex(a.x, a.y, G2).i, ib = R.tileIndex(b.x, b.y, G2).i;
      const l = [];
      if (p.step < 3) {
        l.push({ text: `B.x = ${b.x.toFixed(2)}   floor(${b.x.toFixed(2)}/3) = ${ib}`, mono: true });
        l.push({ text: zh ? `选中 ${ib - ia + 1} 格，HPWL ${R.num(b.x - a.x)}` : `${ib - ia + 1} tile(s), HPWL ${R.num(b.x - a.x)}`, mono: true });
        if (p.step >= 1) l.push({ text: zh ? "源码用 floor 取格号，再取两端之间的全部格。" : "The source floors each end and takes every tile between.", color: "#9fb0d3" });
        if (p.step >= 2) l.push({ text: zh ? "这和“按面积相交”不同：x=3 那格面积为 0。" : "Unlike area overlap: the x=3 tile has zero overlap.", color: "#ffd27a" });
      } else {
        l.push({ text: zh ? "两个 pin 重合在 (7.5, 6)" : "Two pins coincide at (7.5, 6)", mono: true });
        l.push({ text: `HPWL = 0  →  share = 0 ÷ 1 = 0`, mono: true, color: "#ffd27a" });
        l.push({ text: zh ? "不除以零面积，也不凭空加需求。" : "No division by zero area, no invented demand.", color: "#9fb0d3" });
      }
      out.push(textLines(l, x, y + 48, 19));
      break;
    }
    case "accumulate": {
      title(zh ? "逐条累加" : "Adding net by net");
      const rows = fx.nets.map((net, k) => {
        const i = R.netInfoP(net, s.boards[0].positions, G);
        const done = k < p.upto;
        return { text: `${String(k + 1)}  ${net.join("").padEnd(5)} hpwl ${R.num(i.hpwl).padStart(2)}  ${String(i.tiles.length)}${zh ? "格" : "t"}  +${R.fracText(i.share)}`, mono: true, color: done ? NET_COLORS[k] : "#4a5878" };
      });
      out.push(textLines(rows, x, y + 48, 19));
      const sum = R.computeDemand(fx, s.boards[0].positions, { upto: p.upto }).demand.flat().reduce((a, b) => a + b, 0);
      out.push(textLines([{ text: (zh ? `已加 ${p.upto} 条，总量 ${R.fracText(sum)}` : `${p.upto} nets added, sum ${R.fracText(sum)}`), color: "#ffd27a", weight: 700 }], x, y + 48 + 6 * 27 + 16, 20));
      out.push(codeBlock(lang, p.codeLine, x + 12, y + 300));
      break;
    }
    case "final": {
      title(zh ? "完整需求图" : "The full demand map");
      const d = R.computeDemand(fx, s.boards[0].positions).demand;
      const l = [{ text: "demand[x][y] =", mono: true }];
      d.forEach((col, i) => l.push({ text: `  x=${i}: [ ${col.map((v) => R.fracText(v).padStart(4)).join(", ")} ]`, mono: true }));
      if (p.step >= 1) l.push({ text: `Σ demand = 34 = Σ HPWL`, mono: true, color: "#ffd27a", weight: 700 });
      out.push(textLines(l, x, y + 48, 19));
      break;
    }
    case "capacity": {
      title(zh ? `容量 C = ${p.C}` : `Capacity C = ${p.C}`);
      const rows = metricRows(fx, s.boards[0].positions, "P", p.C, lang);
      out.push(table(rows, x, y + 50));
      if (p.step >= 2) out.push(textLines([{ text: zh ? "需求矩阵与 C=2 时完全相同" : "Demand matrix identical to C = 2", color: "#ffd27a" }], x, y + 230, 19));
      break;
    }
    case "compare": {
      title(zh ? "聚集 vs 展开（C = 2）" : "Cluster vs spread (C = 2)");
      const a = metricRows(fx, clusterOf(fx), "P", 2, lang), b = metricRows(fx, spreadOf(fx), "P", 2, lang);
      const head = zh ? ["", "聚集", "展开"] : ["", "Cluster", "Spread"];
      const rows = [head, ...a.map((r, n) => [r[0], r[1], b[n][1]])];
      const hpw = [zh ? "总 HPWL" : "Total HPWL", "7", "34"];
      out.push(table3([...rows, hpw], x, y + 50, p.step));
      if (p.step >= 6) out.push(textLines([{ text: zh ? "看热点：展开稍好。看总负担：聚集更好。" : "Hotspot: spread slightly better. Total burden: cluster better.", color: "#ffd27a" }], x, y + 290, 18));
      break;
    }
    case "modelA": {
      title(zh ? "模型 P（等份） vs 模型 A（按面积）" : "Model P (equal) vs model A (area)");
      const l = [
        { text: zh ? "P：hpwl ÷ 格数，每格一样多" : "P: hpwl ÷ tile count, equal shares" },
        { text: zh ? "A：hpwl × 重叠面积 ÷ 框面积" : "A: hpwl × overlap area ÷ box area" },
      ];
      out.push(textLines(l, x, y + 48, 19));
      if (p.step >= 1) out.push(textLines([{ text: zh ? "已用 DREAMPlace、OpenROAD 原始代码核对" : "Checked against DREAMPlace and OpenROAD code", color: "#9fb0d3", size: 16 }], x, y + 110, 16));
      if (p.step >= 3) {
        const head = zh ? ["C=2", "P 展开", "A 展开"] : ["C=2", "P spread", "A spread"];
        const a = metricRows(fx, spreadOf(fx), "P", 2, lang), b = metricRows(fx, spreadOf(fx), "A", 2, lang);
        out.push(table3([head, ...a.map((r, n) => [r[0], r[1], b[n][1]])], x, y + 150, 9));
        out.push(textLines([{ text: zh ? "聚集布局在两种模型下最大溢出都是 5" : "The cluster's max overflow is 5 in both models", color: "#ffd27a", size: 17 }], x, y + 330, 17));
      }
      break;
    }
    case "limits": {
      title(zh ? "它能做什么，不能做什么" : "What it can and cannot do");
      const l = zh
        ? ["✓ 毫秒级，适合放在布局循环里", "✗ 不是布线结果，也不是签核", "✗ 没分水平/垂直、没分金属层", "✗ 多 pin net 没乘 RISA 系数（4 pin ≈ 1.08）", "✗ 单位是教学单位，不是轨道数"]
        : ["✓ Milliseconds: fits inside a placement loop", "✗ Not a routing result, not sign-off", "✗ No horizontal/vertical split, no layers", "✗ No RISA factor for multi-pin nets (4 pins ≈ 1.08)", "✗ Teaching units, not routing tracks"];
      out.push(textLines(l.slice(0, Math.min(l.length, p.step + 2)), x, y + 50, 20));
      break;
    }
    case "outro": {
      title(zh ? "去实验室试一试" : "Try it in the lab");
      out.push(textLines([zh ? "拖动 pin，看格子何时跳变" : "Drag pins and watch tiles jump", zh ? "改容量，看需求是否不变" : "Change capacity: does demand stay put?", zh ? "切换模型 P / A，比较最大溢出" : "Switch model P / A and compare max overflow"], x, y + 50, 20));
      break;
    }
  }
  if (p.legend) out.push(legendMarkup(p.legend, x, 560, 420, lang, p.legend === "demand" || p.legend === "ratio" ? (p.legend === "ratio" ? 1 : (p.C ?? 2)) : null));
  return out.join("");
}

function table(rows, x, y) {
  return rows.map((r, n) => `<text x="${x}" y="${y + n * 34}" font-size="20" fill="#9fb0d3">${esc(r[0])}</text><text x="${x + 300}" y="${y + n * 34}" font-size="22" font-weight="700" fill="#fff" text-anchor="end">${esc(r[1])}</text>`).join("");
}
function table3(rows, x, y, step) {
  // highlight rows according to the compare step
  const hl = { 3: 3, 4: 2, 5: 5 }[step];
  return rows.map((r, n) => {
    const bg = n === hl ? `<rect x="${x - 8}" y="${y + n * 34 - 24}" width="440" height="32" rx="4" fill="#2b3f6b"/>` : "";
    return bg + `<text x="${x}" y="${y + n * 34}" font-size="19" fill="${n === 0 ? "#8fb5ff" : "#9fb0d3"}">${esc(r[0])}</text>` +
      `<text x="${x + 290}" y="${y + n * 34}" font-size="20" font-weight="700" fill="#fff" text-anchor="end">${esc(r[1])}</text>` +
      `<text x="${x + 420}" y="${y + n * 34}" font-size="20" font-weight="700" fill="#fff" text-anchor="end">${esc(r[2])}</text>`;
  }).join("");
}

/** Full 1280×720 frame for time t. lang decides the burned-in caption and panel text. */
export function frameMarkup(t, cut = "full", lang = "zh", opts = {}) {
  const s = stateAt(t, cut);
  const fx = FX;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif">`];
  out.push(`<rect width="${W}" height="${H}" fill="#0b1020"/>`);
  // boards
  if (s.boards.length === 1) {
    out.push(boardMarkup({ ...s.boards[0], lang }, { x: 70, y: 70, scale: 50 }).markup);
  } else {
    s.boards.forEach((b, n) => {
      const gx = 40 + n * 340;
      out.push(boardMarkup({ ...b, lang }, { x: gx, y: 150, scale: 26 }).markup);
      const label = { cluster: lang === "zh" ? "聚集" : "Cluster", spread: lang === "zh" ? "展开" : "Spread", P: lang === "zh" ? "模型 P：等份" : "Model P: equal", A: lang === "zh" ? "模型 A：按面积" : "Model A: area" }[b.tag] || "";
      out.push(`<text x="${gx}" y="130" font-size="22" font-weight="700" fill="#fff">${esc(label)}</text>`);
    });
  }
  out.push(panelMarkup(fx, s.panel, lang, s));
  // progress line + scene marker
  const dur = duration(cut);
  out.push(`<rect x="0" y="${H - 4}" width="${(W * s.t) / dur}" height="4" fill="#3d6fd1"/>`);
  if (!opts.noCaption) {
    const lines = splitCaption(s.caption[lang], lang === "zh" ? 16 : 52) || [s.caption[lang]];
    const cy = H - 30 - (lines.length - 1) * 40;
    out.push(`<g opacity="${s.captionFade}">`);
    lines.forEach((l, n) => out.push(`<text x="${W / 2}" y="${cy + n * 40}" text-anchor="middle" font-size="${lang === "zh" ? 32 : 28}" font-weight="500" fill="#ffffff" stroke="#05070d" stroke-width="6" paint-order="stroke">${esc(l)}</text>`));
    out.push(`</g>`);
  }
  out.push(`</svg>`);
  return out.join("");
}

/** WebVTT for a cut and language, from the same cue clock. */
export function vtt(cut = "full", lang = "zh") {
  const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), sec = x % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${sec.toFixed(3).padStart(6, "0")}`; };
  const lines = ["WEBVTT", ""];
  let n = 1;
  for (const sc of TL[cut].scenes) for (const c of sc.cues) {
    const parts = lang === "zh" ? (splitCaption(c.zh) || [c.zh]) : [c.en];
    lines.push(String(n++), `${ts(c.start)} --> ${ts(c.end)}`, ...parts, "");
  }
  return lines.join("\n");
}
