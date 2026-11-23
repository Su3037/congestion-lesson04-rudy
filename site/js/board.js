// Shared board: turns a view state into SVG markup. Used by the lesson figures,
// the live lab, the film renderer and the slides, so all of them draw the same
// geometry from the same numbers. Pure: same state in, same string out.
// SPDX-License-Identifier: MIT
import * as R from "./rudy.js";

// Fixed legends. Every heat map of a given kind uses the same scale, so equal
// colours always mean equal values across cases, models and capacities.
export const LEGENDS = Object.freeze({
  demand: { max: 8, zh: "需求（教学单位）", en: "Demand (teaching units)" },
  ratio: { max: 4, zh: "需求 / 容量", en: "Demand / capacity" },
  overflow: { max: 6, zh: "溢出 = max(0, 需求 − 容量)", en: "Overflow = max(0, demand − capacity)" },
});

// Sequential ramp, dark navy → teal → amber → red. Checked for monotone lightness.
const STOPS = [
  [0.0, [24, 33, 52]],
  [0.25, [26, 94, 110]],
  [0.5, [74, 160, 120]],
  [0.75, [232, 176, 64]],
  [1.0, [226, 82, 62]],
];
export function ramp(t) {
  t = Math.max(0, Math.min(1, t));
  for (let k = 1; k < STOPS.length; k++) {
    if (t <= STOPS[k][0]) {
      const [t0, c0] = STOPS[k - 1], [t1, c1] = STOPS[k];
      const u = (t - t0) / (t1 - t0);
      const c = c0.map((v, i) => Math.round(v + (c1[i] - v) * u));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return "rgb(226,82,62)";
}
export function colorFor(kind, v) {
  const L = LEGENDS[kind];
  return ramp(v / L.max);
}

export const PIN_COLORS = { A: "#7cc4ff", B: "#ffb86b", C: "#b39dff", D: "#7ee0a1", E: "#ff8fb1", F: "#f2e46b" };
export const NET_COLORS = ["#7cc4ff", "#ffb86b", "#b39dff", "#7ee0a1", "#f2e46b", "#ff8fb1", "#9fe6e0", "#e6a3ff"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * state = {
 *   problem, positions, model: "P"|"A", capacity,
 *   layer: "none"|"demand"|"ratio"|"overflow",   which heat map
 *   upto: number of nets accumulated (partial if < nets.length),
 *   selectedNet: index|null, show: {flylines, bbox, tiles, share, values, ids, pins},
 *   highlightTile: {i,j}|null, ghostTiles: bool, lang: "zh"|"en", fade: 0..1 per layer (optional)
 * }
 * geom = { x, y, scale }  placement of the board in the outer SVG.
 */
export function boardMarkup(state, geom = { x: 40, y: 20, scale: 56 }) {
  const { problem, positions } = state;
  const G = R.gridOf(problem);
  const s = geom.scale;
  const X = (x) => geom.x + x * s;
  const Y = (y) => geom.y + (G.H - y) * s;
  const show = Object.assign({ flylines: true, bbox: true, tiles: true, share: true, values: true, ids: true, pins: true }, state.show || {});
  const lang = state.lang || "zh";
  const out = [];
  const valid = R.validate(problem, positions);
  let comp = null;
  if (valid.ok) comp = R.computeDemand(problem, positions, { model: state.model || "P", upto: state.upto });
  const cap = state.capacity ?? problem.capacity;
  let met = null;
  if (comp && cap > 0) met = R.metrics(comp.demand, cap);

  // chip outline + tiles
  out.push(`<rect x="${X(0)}" y="${Y(G.H)}" width="${G.W * s}" height="${G.H * s}" fill="#121a2b" stroke="#5b6b8c" stroke-width="2"/>`);
  for (let i = 0; i < G.nx; i++)
    for (let j = 0; j < G.ny; j++) {
      const x = X(i * G.cw), y = Y((j + 1) * G.ch), w = G.cw * s, h = G.ch * s;
      let fill = "none";
      if (comp && state.layer && state.layer !== "none") {
        const d = comp.demand[i][j];
        const v = state.layer === "demand" ? d : state.layer === "ratio" ? d / cap : Math.max(0, d - cap);
        fill = colorFor(state.layer, v);
      }
      const op = state.layerOpacity ?? 1;
      if (fill !== "none") out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" opacity="${op}"/>`);
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#3a4866" stroke-width="1.5"/>`);
      if (show.ids) out.push(`<text x="${x + 6}" y="${y + 16}" class="tid" fill="#8fa0c2" font-size="${Math.max(10, s * 0.22)}">(${i},${j})</text>`);
      if (comp && show.values && state.layer && state.layer !== "none") {
        const d = comp.demand[i][j];
        const v = state.layer === "demand" ? d : state.layer === "ratio" ? d / cap : Math.max(0, d - cap);
        const txt = state.layer === "ratio" ? R.num(v, 2) : R.fracText(v);
        out.push(`<text x="${x + w / 2}" y="${y + h / 2 + s * 0.14}" text-anchor="middle" font-size="${s * 0.42}" font-weight="700" fill="#f4f7ff" stroke="#0b1020" stroke-width="3" paint-order="stroke">${esc(txt)}</text>`);
        if (state.layer !== "demand" && met && d - cap > 1e-9 && state.layer === "ratio")
          out.push(`<text x="${x + w / 2}" y="${y + h / 2 + s * 0.62}" text-anchor="middle" font-size="${s * 0.24}" fill="#ffd2c8">${lang === "zh" ? "超出容量" : "over capacity"}</text>`);
      }
    }
  if (state.highlightTile) {
    const { i, j } = state.highlightTile;
    out.push(`<rect x="${X(i * G.cw) + 2}" y="${Y((j + 1) * G.ch) + 2}" width="${G.cw * s - 4}" height="${G.ch * s - 4}" fill="none" stroke="#ffffff" stroke-width="4"/>`);
  }
  // axis ticks
  for (let x = 0; x <= G.W; x += G.cw) out.push(`<text x="${X(x)}" y="${Y(0) + 20}" text-anchor="middle" font-size="13" fill="#8fa0c2">x=${x}</text>`);
  for (let y = 0; y <= G.H; y += G.ch) out.push(`<text x="${X(0) - 8}" y="${Y(y) + 4}" text-anchor="end" font-size="13" fill="#8fa0c2">y=${y}</text>`);

  if (!valid.ok) {
    out.push(`<text x="${X(G.W / 2)}" y="${Y(G.H / 2)}" text-anchor="middle" font-size="18" fill="#ffb4a6">${esc(lang === "zh" ? "输入无效，未计算：" : "Invalid input, not computed: ")}${esc(valid.errors[0].msg)}</text>`);
  }

  // selected net: tiles, bbox, share labels
  const sel = state.selectedNet;
  if (comp && sel !== null && sel !== undefined && sel < problem.nets.length) {
    const info = (state.model || "P") === "A" ? R.netInfoA(problem.nets[sel], positions, G) : R.netInfoP(problem.nets[sel], positions, G);
    const col = NET_COLORS[sel % NET_COLORS.length];
    if (show.tiles) {
      const tiles = info.tiles || info.parts;
      for (const t of tiles) {
        out.push(`<rect x="${X(t.i * G.cw) + 5}" y="${Y((t.j + 1) * G.ch) + 5}" width="${G.cw * s - 10}" height="${G.ch * s - 10}" fill="${col}" fill-opacity="0.16" stroke="${col}" stroke-width="3" stroke-dasharray="10 6"/>`);
        if (show.share) {
          const amt = info.tiles ? info.share : t.total;
          out.push(`<text x="${X((t.i + 0.5) * G.cw)}" y="${Y((t.j + 1) * G.ch) + s * 0.62}" text-anchor="middle" font-size="${s * 0.34}" font-weight="700" fill="${col}" stroke="#0b1020" stroke-width="3" paint-order="stroke">+${esc(R.fracText(amt))}</text>`);
        }
      }
    }
    if (show.bbox) {
      const b = info.bbox;
      const bw = Math.max(b.w * s, 0), bh = Math.max(b.h * s, 0);
      out.push(`<rect x="${X(b.x0)}" y="${Y(b.y1)}" width="${bw}" height="${bh}" fill="${col}" fill-opacity="0.10" stroke="${col}" stroke-width="2.5"/>`);
      if (state.showDims) {
        out.push(`<text x="${X((b.x0 + b.x1) / 2)}" y="${Y(b.y0) + 34}" text-anchor="middle" font-size="16" fill="${col}">${lang === "zh" ? "宽" : "w"} ${R.num(b.w)}</text>`);
        out.push(`<text x="${X(b.x1) + s * 0.32}" y="${Y((b.y0 + b.y1) / 2) - s * 0.25}" font-size="16" fill="${col}">${lang === "zh" ? "高" : "h"} ${R.num(b.h)}</text>`);
      }
    }
  }

  // flylines (connections, not routes): star from the bbox centre for 3+ pins
  if (show.flylines && valid.ok) {
    problem.nets.forEach((net, k) => {
      if (state.onlySelectedFly && k !== sel) return;
      const col = NET_COLORS[k % NET_COLORS.length];
      const dim = sel !== null && sel !== undefined && k !== sel ? 0.25 : 0.85;
      if (net.length === 2) {
        const [a, b] = net.map((id) => positions[id]);
        out.push(`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}" stroke="${col}" stroke-width="2" stroke-dasharray="4 5" opacity="${dim}"/>`);
      } else if (net.length > 2) {
        const bb = R.bbox(net, positions);
        const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
        for (const id of net) out.push(`<line x1="${X(cx)}" y1="${Y(cy)}" x2="${X(positions[id].x)}" y2="${Y(positions[id].y)}" stroke="${col}" stroke-width="2" stroke-dasharray="4 5" opacity="${dim}"/>`);
      }
    });
  }

  // pins
  if (show.pins)
    for (const id of Object.keys(positions)) {
      const p = positions[id];
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const col = PIN_COLORS[id] || "#e6ecff";
      out.push(`<g class="pin" data-pin="${esc(id)}"><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${s * 0.2}" fill="${col}" stroke="#0b1020" stroke-width="2.5"/><text x="${X(p.x)}" y="${Y(p.y) + s * 0.08}" text-anchor="middle" font-size="${s * 0.22}" font-weight="700" fill="#0b1020" pointer-events="none">${esc(id)}</text></g>`);
    }
  if (comp && comp.partial && state.layer && state.layer !== "none") {
    out.push(`<text x="${X(G.W)}" y="${Y(G.H) - 8}" text-anchor="end" font-size="15" fill="#ffd27a">${lang === "zh" ? `部分累加：前 ${comp.upto} / ${problem.nets.length} 条 net` : `Partial sum: first ${comp.upto} of ${problem.nets.length} nets`}</text>`);
  }
  return { markup: out.join(""), comp, met, width: G.W * s, height: G.H * s };
}

/** Horizontal legend bar for one kind, fixed scale. */
export function legendMarkup(kind, x, y, w, lang = "zh", capLine = null) {
  const L = LEGENDS[kind];
  const out = [];
  const n = 40;
  for (let k = 0; k < n; k++) out.push(`<rect x="${x + (k * w) / n}" y="${y}" width="${w / n + 0.5}" height="12" fill="${ramp(k / (n - 1))}"/>`);
  out.push(`<text x="${x}" y="${y - 6}" font-size="13" fill="#c9d4ee">${esc(L[lang])}</text>`);
  for (let k = 0; k <= 4; k++) out.push(`<text x="${x + (k * w) / 4}" y="${y + 28}" text-anchor="middle" font-size="12" fill="#8fa0c2">${R.num((k * L.max) / 4)}${k === 4 ? "+" : ""}</text>`);
  if (capLine !== null && capLine <= L.max) {
    const cx = x + (capLine / L.max) * w;
    out.push(`<line x1="${cx}" y1="${y - 3}" x2="${cx}" y2="${y + 15}" stroke="#fff" stroke-width="2"/><text x="${cx}" y="${y + 42}" text-anchor="middle" font-size="12" fill="#fff">${lang === "zh" ? "容量" : "cap"} ${R.num(capLine)}</text>`);
  }
  return out.join("");
}
