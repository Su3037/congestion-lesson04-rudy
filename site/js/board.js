// Shared SVG board. The film renderer, the live lab, the definition figures and the slides all call Board().
// It only DRAWS a state; every number it prints comes from domain.js on the same positions.
import {analyse, fmt, frac, tileIndex, gridOf} from './domain.js';

// House palette (dark technical films): ivory text, gold focus, teal main net, muted secondary hues.
export const THEME = {bg: '#081a22', line: '#1d3640', grid: '#14303a', tile: '#2c5560', axis: '#3d5d64', tick: '#6f8a8c', ink: '#eeeadd', muted: '#8fa3a3',
  gold: '#ddbd78', teal: '#76cbb5', rose: '#d99a9a', sage: '#9fc79a', node: '#0b2029'};
export const CELL_COLORS = {A: '#86a9e0', B: '#d58f62', C: '#a3b26f', D: '#d99a9a', E: '#a18bc0', F: '#d9b06c', P: '#86a9e0', Q: '#d58f62'};
export const NET_COLORS = {AB: '#86a9e0', CD: '#d99a9a', AC: '#a3b26f', BD: '#d9b06c', ABCD: '#76cbb5', EF: '#a18bc0', PQ: '#76cbb5'};
const FALLBACK = ['#76cbb5', '#d9b06c', '#a18bc0', '#d99a9a', '#a3b26f', '#86a9e0'];
export const netColor = (id, i = 0) => NET_COLORS[id] ?? FALLBACK[i % FALLBACK.length];
export const cellColor = id => CELL_COLORS[id] ?? '#8fa3a3';

// Fixed legends: every map of one kind uses the same scale, so equal colours mean equal values across
// placements, models and capacities.
export const LEGENDS = {demand: 8, ratio: 4, overflow: 6, H: 8, V: 8};
// Sequential ramp in the house palette: deep blue-green → teal → sage → gold → rose (lightness rises monotonically).
const STOPS = [[0, [12, 38, 48]], [0.25, [27, 82, 86]], [0.5, [64, 133, 118]], [0.75, [205, 172, 102]], [1, [217, 130, 111]]];
export function ramp(t) {
  t = Math.max(0, Math.min(1, t));
  for (let k = 1; k < STOPS.length; k++) if (t <= STOPS[k][0]) {
    const [t0, c0] = STOPS[k - 1], [t1, c1] = STOPS[k], u = (t - t0) / (t1 - t0);
    const c = c0.map((v, i) => Math.round(v + (c1[i] - v) * u));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  return 'rgb(217,130,111)';
}
export const heatColor = (layer, v) => ramp(v / (LEGENDS[layer] ?? 8));

const L = {
  zh: {board: 'RUDY 图板', notWire: '虚线 = 连接关系，不是导线', layer: {demand: '需求', ratio: '需求 / 容量', overflow: '溢出', H: '水平需求', V: '垂直需求'}, cap: '容量', model: {P: '模型 P：平均分', A: '模型 A：按面积'}, partial: n => `部分累加：前 ${n} 个线网`, tile: '格', hot: '最挤'},
  en: {board: 'RUDY board', notWire: 'dashed = connectivity, not a wire', layer: {demand: 'demand', ratio: 'demand / capacity', overflow: 'overflow', H: 'horizontal demand', V: 'vertical demand'}, cap: 'capacity', model: {P: 'model P: equal shares', A: 'model A: by area'}, partial: n => `partial: first ${n} nets`, tile: 'tile', hot: 'hottest'},
};

export const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/** World <-> screen mapping. The lab inverts drags with the SAME function used to draw. */
export function geometry(bounds, {width = 900, height = 900, pad = 70, padRight = pad, padTop = pad} = {}) {
  const spanX = bounds.xmax - bounds.xmin, spanY = bounds.ymax - bounds.ymin;
  const s = Math.min((width - pad - padRight) / spanX, (height - pad - padTop) / spanY);
  const ox = pad + (width - pad - padRight - s * spanX) / 2, oy = padTop + (height - pad - padTop - s * spanY) / 2;
  return {
    width, height, s, ox, oy, bounds,
    toScreen: p => ({x: ox + (p.x - bounds.xmin) * s, y: oy + (bounds.ymax - p.y) * s}),
    toWorld: q => ({x: bounds.xmin + (q.x - ox) / s, y: bounds.ymax - (q.y - oy) / s}),
  };
}
export const boundsOf = v => ({xmin: 0, xmax: v.chip.W, ymin: 0, ymax: v.chip.H});
/** One place that decides the board margins, so drawing and drag inversion always agree. */
export const boardGeometryOptions = (width, height, compact = false) => compact ? {width, height, pad: 46, padRight: 30, padTop: 70} : {width, height, pad: 64, padRight: 54, padTop: 112};

const n2 = v => Math.round(v * 100) / 100;

/** Value of one tile for a layer, from one analysis. */
export function layerValue(a, layer, i, j) {
  if (layer === 'demand') return a.demand[i][j];
  if (layer === 'ratio') return a.metrics.ratio[i][j];
  if (layer === 'overflow') return a.metrics.overflow[i][j];
  if (layer === 'H') return a.H ? a.H[i][j] : 0;
  if (layer === 'V') return a.V ? a.V[i][j] : 0;
  return 0;
}

/**
 * view = state from domain.makeState plus:
 *   layer: 'none'|'demand'|'ratio'|'overflow'|'H'|'V', showBoxes: 'selected'|'all'|'none', visibleNets?: [ids],
 *   highlights?: {flylines, coords, values, tilesOf, deposit:{net,p}, corners, ghost, city, tiny, appear, pulse, hot,
 *                 overflowMarks, legend, edge:{x}, focusTile:{i,j}, dimOthers, heat (0..1 fade), indices, notWire}
 */
export function Board(view, {width = 900, height = 900, interactive = false, id = 'board', lang = 'zh', focusCell = null, compact = false} = {}) {
  const t = L[lang] ?? L.zh;
  const hl = view.highlights ?? {};
  const G = gridOf(view);
  const g = geometry(boundsOf(view), boardGeometryOptions(width, height, compact));
  const {s, toScreen} = g;
  const a = analyse(view);
  const parts = [];
  const fs = compact ? 0.82 : 1;
  const layer = view.layer ?? 'none';
  const heatAlpha = hl.heat ?? 1;
  const tileRect = (i, j, inset = 0) => { const p = toScreen({x: i * G.cw, y: (j + 1) * G.ch}), q = toScreen({x: (i + 1) * G.cw, y: j * G.ch}); return {x: p.x + inset, y: p.y + inset, w: q.x - p.x - 2 * inset, h: q.y - p.y - 2 * inset}; };

  parts.push(`<rect width="${width}" height="${height}" rx="14" fill="${THEME.bg}" stroke="${THEME.line}" stroke-width="1.5"/>`);
  // heat map (one rect per tile)
  if (layer !== 'none' && heatAlpha > 0) {
    const cells = [];
    for (let i = 0; i < G.nx; i++) for (let j = 0; j < G.ny; j++) {
      const r = tileRect(i, j), v = layerValue(a, layer, i, j);
      cells.push(`<rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}" fill="${heatColor(layer, v)}" fill-opacity="${n2(0.92 * heatAlpha)}"/>`);
    }
    parts.push(`<g>${cells.join('')}</g>`);
  }
  if (hl.city) { // city blocks between the streets (unit grid lines)
    const blocks = [];
    for (let x = 0; x < G.W; x++) for (let y = 0; y < G.H; y++) {
      const p = toScreen({x: x + 0.16, y: y + 0.84}), q = toScreen({x: x + 0.84, y: y + 0.16});
      blocks.push(`<rect x="${n2(p.x)}" y="${n2(p.y)}" width="${n2(q.x - p.x)}" height="${n2(q.y - p.y)}" rx="3"/>`);
    }
    parts.push(`<g fill="#10303a" fill-opacity="${layer === 'none' ? 0.85 : 0.35}" stroke="#1d3e48" stroke-width="1">${blocks.join('')}</g>`);
  }
  // fine unit grid, then the tile (GCell) grid
  const fine = [];
  for (let x = 0; x <= G.W; x++) { const p = toScreen({x, y: 0}), q = toScreen({x, y: G.H}); fine.push(`M${n2(p.x)} ${n2(p.y)}V${n2(q.y)}`); }
  for (let y = 0; y <= G.H; y++) { const p = toScreen({x: 0, y}), q = toScreen({x: G.W, y}); fine.push(`M${n2(p.x)} ${n2(p.y)}H${n2(q.x)}`); }
  parts.push(`<path d="${fine.join('')}" stroke="${THEME.grid}" stroke-width="1" fill="none" opacity="${hl.tiny ? 0 : 0.8}"/>`);
  const tg = [];
  for (let i = 0; i <= G.nx; i++) { const p = toScreen({x: i * G.cw, y: 0}), q = toScreen({x: i * G.cw, y: G.H}); tg.push(`M${n2(p.x)} ${n2(p.y)}V${n2(q.y)}`); }
  for (let j = 0; j <= G.ny; j++) { const p = toScreen({x: 0, y: j * G.ch}), q = toScreen({x: G.W, y: j * G.ch}); tg.push(`M${n2(p.x)} ${n2(p.y)}H${n2(q.x)}`); }
  parts.push(`<path d="${tg.join('')}" stroke="${THEME.tile}" stroke-width="${hl.tiny ? 1.2 : 2.2}" fill="none"/>`);
  if (hl.edge) {
    const p = toScreen({x: hl.edge.x, y: 0}), q = toScreen({x: hl.edge.x, y: G.H});
    parts.push(`<path d="M${n2(p.x)} ${n2(p.y + 14)}V${n2(q.y - 14)}" stroke="${THEME.gold}" stroke-width="3" stroke-dasharray="6 6" opacity="${hl.edge.o ?? 1}"/>`);
    parts.push(`<text x="${n2(q.x)}" y="${n2(q.y - 22)}" text-anchor="middle" fill="${THEME.gold}" font-size="${19 * fs}" font-family="var(--mono)" opacity="${hl.edge.o ?? 1}">x = ${fmt(hl.edge.x)}</text>`);
  }
  // axes and ticks (chip units), tile indices (i along the top, j on the right)
  const o = toScreen({x: 0, y: 0}), xe = toScreen({x: G.W, y: 0}), ye = toScreen({x: 0, y: G.H});
  if (!hl.tiny) {
    parts.push(`<path d="M${n2(o.x)} ${n2(o.y)}H${n2(xe.x + 16)}M${n2(o.x)} ${n2(o.y)}V${n2(ye.y - 16)}" stroke="${THEME.axis}" stroke-width="1.6" fill="none"/>`);
    const tick = [];
    const step = G.W > 9 ? 3 : 1;
    for (let x = 0; x <= G.W; x += step) { const p = toScreen({x, y: 0}); tick.push(`<text x="${n2(p.x)}" y="${n2(p.y + 26 * fs)}" text-anchor="middle">${x}</text>`); }
    for (let y = 0; y <= G.H; y += G.ch) { const p = toScreen({x: 0, y}); tick.push(`<text x="${n2(p.x - 12 * fs)}" y="${n2(p.y + 6)}" text-anchor="end">${y}</text>`); }
    parts.push(`<g fill="${THEME.tick}" font-size="${18 * fs}" font-family="var(--mono)">${tick.join('')}</g>`);
    if (hl.indices !== false) {
      const idx = [];
      for (let i = 0; i < G.nx; i++) { const r = tileRect(i, G.ny - 1); idx.push(`<text x="${n2(r.x + r.w / 2)}" y="${n2(r.y - 12)}" text-anchor="middle">x${i}</text>`); }
      for (let j = 0; j < G.ny; j++) { const r = tileRect(G.nx - 1, j); idx.push(`<text x="${n2(r.x + r.w + 10)}" y="${n2(r.y + r.h / 2 + 6)}">y${j}</text>`); }
      parts.push(`<g fill="${THEME.muted}" font-size="${16 * fs}" font-family="var(--mono)" opacity=".8">${idx.join('')}</g>`);
    }
  }

  const nets = view.nets.filter(n => !view.visibleNets || view.visibleNets.includes(n.id));
  const netIndex = Object.fromEntries(view.nets.map((n, i) => [n.id, i]));
  const info = Object.fromEntries(a.nets.map(n => [n.id, n]));
  const sel = view.selectedNet && info[view.selectedNet] ? info[view.selectedNet] : null;

  // tiles a net selects (gold dashed inset) with the share it deposits
  const tilesNet = hl.tilesOf && info[hl.tilesOf];
  if (tilesNet) {
    const col = netColor(tilesNet.id, netIndex[tilesNet.id]);
    const out = [];
    const shown = hl.tilesShown ?? tilesNet.tiles.length;
    tilesNet.tiles.slice(0, shown).forEach((tl, k) => {
      const r = tileRect(tl.i, tl.j, 7);
      out.push(`<rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}" rx="6" fill="${col}" fill-opacity=".10" stroke="${THEME.gold}" stroke-width="3" stroke-dasharray="10 7"/>`);
      const amount = tilesNet.parts[k].total;
      if (hl.shares !== false && !hl.tiny) out.push(`<text x="${n2(r.x + 12)}" y="${n2(r.y + 30 * fs)}" fill="${THEME.gold}" font-size="${21 * fs}" font-weight="700" font-family="var(--mono)">+${escapeText(view.model === 'A' ? fmt(amount) : frac(amount))}</text>`);
    });
    parts.push(out.join(''));
  }
  // the two corner tiles of a net (where its box corners fall)
  if (hl.corners && sel) {
    const out = [];
    for (const [key, c, pt] of [['lo', sel.lo ?? tileIndex(sel.bbox.x0, sel.bbox.y0, G), {x: sel.bbox.x0, y: sel.bbox.y0}], ['hi', sel.hi ?? tileIndex(sel.bbox.x1, sel.bbox.y1, G), {x: sel.bbox.x1, y: sel.bbox.y1}]]) {
      const r = tileRect(c.i, c.j, 3);
      out.push(`<rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}" rx="5" fill="none" stroke="${THEME.ink}" stroke-width="2.5" opacity="${hl.corners}"/>`);
      const q = toScreen(pt);
      out.push(`<circle cx="${n2(q.x)}" cy="${n2(q.y)}" r="6" fill="${THEME.ink}" opacity="${hl.corners}"/>`);
      out.push(`<text x="${n2(r.x + r.w - 10)}" y="${n2(key === 'lo' ? r.y + r.h - 12 : r.y + 26)}" text-anchor="end" fill="${THEME.ink}" font-size="${18 * fs}" font-family="var(--mono)" opacity="${hl.corners}">(${c.i}, ${c.j})</text>`);
    }
    parts.push(out.join(''));
  }

  // flylines: connectivity only (star from the first pin)
  if (hl.flylines) {
    const fl = [];
    for (const n of nets) {
      const pins = n.pins.map(p => toScreen(view.positions[p]));
      for (let i = 1; i < pins.length; i++) fl.push(`<path d="M${n2(pins[0].x)} ${n2(pins[0].y)}L${n2(pins[i].x)} ${n2(pins[i].y)}" stroke="${netColor(n.id, netIndex[n.id])}"/>`);
    }
    parts.push(`<g stroke-width="2" stroke-dasharray="3 7" stroke-opacity="${hl.flylines === true ? 0.55 : hl.flylines}" fill="none">${fl.join('')}</g>`);
  }

  // bounding boxes
  const rPin = Math.max(13, Math.min(24, s * 0.3)) * (compact ? 0.85 : 1);
  const labelRects = view.cells.map(c => { const p = toScreen(view.positions[c]); return [p.x - rPin - 4, p.y - rPin - 4, p.x + rPin + 4, p.y + rPin + 4]; });
  const drawBox = (n, strong) => {
    const b = n.bbox, i = netIndex[n.id];
    const p = toScreen({x: b.x0, y: b.y1}), q = toScreen({x: b.x1, y: b.y0});
    const col = netColor(n.id, i), w = Math.max(0, q.x - p.x), h = Math.max(0, q.y - p.y);
    const op = strong ? 1 : 0.55;
    let out = `<rect x="${n2(p.x)}" y="${n2(p.y)}" width="${n2(w)}" height="${n2(h)}" fill="${col}" fill-opacity="${strong ? 0.08 : 0.03}" stroke="${col}" stroke-opacity="${op}" stroke-width="${strong ? 3.5 : 2}" ${strong ? '' : 'stroke-dasharray="8 6"'}/>`;
    if ((strong || view.showBoxes === 'all') && !hl.tiny && hl.boxLabels !== false) {
      const label = `${n.id} = ${fmt(n.hpwl)}`;
      const size = (strong ? 21 : 16) * fs, lw = label.length * size * 0.62, lh = size * 1.1;
      const slots = [[p.x + 4, p.y - 8, 'start'], [q.x - 4, p.y - 8, 'end'], [p.x + 4, q.y + size + 4, 'start'], [q.x - 4, q.y + size + 4, 'end'],
        [p.x + 4, p.y + size + 4, 'start'], [q.x - 4, q.y - 8, 'end'], [p.x + 4, p.y - 8 - lh, 'start'], [p.x + 4, q.y + size + 4 + lh, 'start']];
      let pick = slots[0];
      for (const sl of slots) {
        const x0 = sl[2] === 'end' ? sl[0] - lw : sl[0], rect = [x0, sl[1] - size, x0 + lw, sl[1] + 3];
        if (!labelRects.some(r => rect[0] < r[2] && rect[2] > r[0] && rect[1] < r[3] && rect[3] > r[1])) { pick = sl; break; }
      }
      const x0 = pick[2] === 'end' ? pick[0] - lw : pick[0];
      labelRects.push([x0, pick[1] - size, x0 + lw, pick[1] + 3]);
      out += `<text x="${n2(pick[0])}" y="${n2(pick[1])}" text-anchor="${pick[2]}" fill="${col}" fill-opacity="${op}" font-size="${size}" font-weight="${strong ? 700 : 500}" font-family="var(--mono)">${escapeText(label)}</text>`;
    }
    return out;
  };
  if (view.showBoxes === 'all') nets.forEach(n => { if (n.id !== view.selectedNet) parts.push(drawBox(info[n.id], false)); });
  if (sel && view.showBoxes !== 'none') parts.push(drawBox(sel, true));

  // tile values
  if (hl.values && layer !== 'none') {
    const out = [];
    for (let i = 0; i < G.nx; i++) for (let j = 0; j < G.ny; j++) {
      const r = tileRect(i, j), v = layerValue(a, layer, i, j);
      const txt = layer === 'overflow' ? (v > 0 ? `+${hl.exact ? frac(v) : fmt(v)}` : '0') : (hl.exact ? frac(v) : fmt(v));
      out.push(`<text x="${n2(r.x + r.w - 12)}" y="${n2(r.y + r.h - 14)}" text-anchor="end">${escapeText(txt)}</text>`);
    }
    parts.push(`<g fill="${THEME.ink}" font-size="${(compact ? 22 : 26) * fs}" font-family="var(--mono)" font-weight="700" opacity="${hl.values === true ? 0.95 : hl.values}" paint-order="stroke" stroke="${THEME.bg}" stroke-width="5" stroke-opacity=".55">${out.join('')}</g>`);
  }
  // overflowing tiles (demand > capacity)
  if (hl.overflowMarks && layer !== 'none') {
    const out = [];
    for (let i = 0; i < G.nx; i++) for (let j = 0; j < G.ny; j++) if (a.metrics.overflow[i][j] > 0) {
      const r = tileRect(i, j, 3);
      out.push(`<rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}" rx="5" fill="none" stroke="${THEME.rose}" stroke-width="3"/>`);
    }
    parts.push(`<g opacity="${hl.overflowMarks === true ? 1 : hl.overflowMarks}">${out.join('')}</g>`);
  }
  if (hl.hot && a.metrics.hot && layer !== 'none') {
    const r = tileRect(a.metrics.hot.i, a.metrics.hot.j, -2);
    parts.push(`<rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}" rx="6" fill="none" stroke="${THEME.ink}" stroke-width="3.5" opacity="${hl.hot}"/><text x="${n2(r.x + 10)}" y="${n2(r.y + 26 * fs)}" fill="${THEME.ink}" font-size="${18 * fs}" opacity="${hl.hot}">${escapeText(t.hot)}</text>`);
  }
  if (hl.focusTile) {
    const r = tileRect(hl.focusTile.i, hl.focusTile.j, 2);
    parts.push(`<rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}" rx="6" fill="none" stroke="${THEME.gold}" stroke-width="4"/>`);
  }
  // deposit animation: share chips fly from the net's box centre into its tiles
  if (hl.deposit && info[hl.deposit.net] && hl.deposit.p > 0 && hl.deposit.p < 1) {
    const n = info[hl.deposit.net], b = n.bbox, c = toScreen({x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2});
    const col = netColor(n.id, netIndex[n.id]);
    const out = n.parts.map(q => {
      const r = tileRect(q.i, q.j), tx = r.x + r.w / 2, ty = r.y + r.h / 2;
      const p = hl.deposit.p, x = c.x + (tx - c.x) * p, y = c.y + (ty - c.y) * p;
      return `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(9 + 5 * (1 - p))}" fill="${col}" fill-opacity=".85" stroke="${THEME.ink}" stroke-width="1.5"/>`;
    });
    parts.push(out.join(''));
  }

  // ghost (previous) positions
  if (hl.ghost) parts.push(`<g opacity=".35">${Object.entries(hl.ghost).map(([c, p]) => { const q = toScreen(p); return `<circle cx="${n2(q.x)}" cy="${n2(q.y)}" r="14" fill="none" stroke="${cellColor(c)}" stroke-width="2" stroke-dasharray="3 4"/>`; }).join('')}</g>`);

  // pins
  const selPins = sel ? new Set(sel.pins) : null;
  const order = [...view.cells].sort((x, y) => (x === focusCell) - (y === focusCell));
  parts.push(order.map(c => {
    const p = toScreen(view.positions[c]);
    if (hl.tiny) return `<circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="4" fill="${THEME.node}" stroke="${THEME.teal}" stroke-opacity=".75" stroke-width="1.5"/>`;
    let dim = selPins && hl.dimOthers !== false && !selPins.has(c) ? 0.35 : 1;
    if (hl.appear !== undefined) dim *= hl.appear;
    const pulse = hl.pulse ? `<circle r="${n2(rPin + 8 + 10 * hl.pulse)}" fill="none" stroke="${THEME.gold}" stroke-opacity="${n2(0.8 * (1 - hl.pulse))}" stroke-width="2"/>` : '';
    const coord = hl.coords ? `<text x="${n2(rPin + 7)}" y="${n2(rPin + 18)}" fill="${THEME.muted}" font-size="${17 * fs}" font-family="var(--mono)">(${fmt(view.positions[c].x)}, ${fmt(view.positions[c].y)})</text>` : '';
    const attrs = interactive
      ? ` data-cell="${c}" tabindex="${c === focusCell ? 0 : -1}" role="button" aria-label="${escapeText(`${c} (${fmt(view.positions[c].x)}, ${fmt(view.positions[c].y)})`)}" class="cell${c === focusCell ? ' focus' : ''}"`
      : ' class="cell"';
    return `<g${attrs} transform="translate(${n2(p.x)} ${n2(p.y)})" opacity="${n2(dim)}">${pulse}<circle r="${n2(rPin + 5)}" fill="none" stroke="${cellColor(c)}" stroke-opacity=".18" stroke-width="6"/><circle r="${n2(rPin)}" fill="${THEME.node}" stroke="${cellColor(c)}" stroke-width="2.6"/><text y="${n2(rPin * 0.36)}" text-anchor="middle" fill="${cellColor(c)}" font-size="${n2(rPin * 1.05)}" font-weight="500" font-family="var(--serif)">${c}</text>${coord}</g>`;
  }).join(''));

  // header strip: model, layer legend with its fixed scale, capacity, partial flag
  if (!hl.tiny && hl.legend !== false) {
    const y0 = compact ? 22 : 28, x0 = 18;
    const head = [];
    if (layer !== 'none') {
      const max = LEGENDS[layer] ?? 8, bw = compact ? 150 : 210;
      const stops = STOPS.map(([k, c]) => `<stop offset="${k}" stop-color="rgb(${c.join(',')})"/>`).join('');
      head.push(`<defs><linearGradient id="${id}-ramp">${stops}</linearGradient></defs>`);
      head.push(`<text x="${x0}" y="${y0 + 6}" fill="${THEME.muted}" font-size="${17 * fs}">${escapeText(t.layer[layer])}</text>`);
      const lx = x0 + (compact ? 92 : 128);
      head.push(`<rect x="${lx}" y="${y0 - 8}" width="${bw}" height="14" rx="3" fill="url(#${id}-ramp)"/><text x="${lx}" y="${y0 + 26}" fill="${THEME.tick}" font-size="${14 * fs}" font-family="var(--mono)">0</text><text x="${lx + bw}" y="${y0 + 26}" text-anchor="end" fill="${THEME.tick}" font-size="${14 * fs}" font-family="var(--mono)">${max}</text>`);
      if (layer === 'demand' && hl.capLine !== false) { const cx = lx + bw * Math.min(1, view.capacity / max); head.push(`<path d="M${n2(cx)} ${y0 - 12}V${y0 + 10}" stroke="${THEME.ink}" stroke-width="2"/><text x="${n2(cx)}" y="${y0 + 26}" text-anchor="middle" fill="${THEME.ink}" font-size="${14 * fs}" font-family="var(--mono)">C=${fmt(view.capacity)}</text>`); }
    }
    const right = [t.model[view.model ?? 'P']];
    if (view.upto !== undefined && view.upto < view.nets.length) right.push(t.partial(view.upto));
    head.push(`<text x="${width - 18}" y="${y0 + 6}" text-anchor="end" fill="${view.upto !== undefined && view.upto < view.nets.length ? THEME.gold : THEME.muted}" font-size="${17 * fs}">${escapeText(right.join(' · '))}</text>`);
    if (hl.notWire) head.push(`<text x="${width - 18}" y="${y0 + 32}" text-anchor="end" fill="${THEME.muted}" font-size="${16 * fs}">${escapeText(t.notWire)}</text>`);
    parts.push(head.join(''));
  }

  return `<svg id="${escapeText(id)}" class="shared-board" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeText(t.board)}" font-family="var(--sans)">${parts.join('')}</svg>`;
}
