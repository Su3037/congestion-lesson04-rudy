// RUDY domain model. Pure functions only: no DOM, no media, no clocks, no randomness.
// Shared by the website lab, the challenges, the film timeline, the slide builder and the tests.
// Pins are points in abstract chip units; y grows upward. Maps are stored demand[x][y] (column first),
// as in the teacher's code.
//
// Two models, never mixed under one name (docs/decision-log.md):
//   'P'  the teacher's classroom proxy: HPWL shared EQUALLY by every tile between the two corner tiles
//        (floor-and-clamp index, inclusive). Sum of the map = sum of HPWL.
//   'A'  area-weighted extension (what DREAMPlace / OpenROAD do): tile gets HPWL × overlap / box area,
//        with horizontal (w × overlap / area) and vertical (h × overlap / area) maps.

export const TOLERANCE = 1e-9;
export const MODELS = Object.freeze({P: 'P', A: 'A'});

export function approxEqual(a, b, tol = TOLERANCE) {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}
export const approxLE = (a, b, tol = TOLERANCE) => a <= b || approxEqual(a, b, tol);

export class RudyInputError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'RudyInputError';
    this.code = code;
    this.detail = detail;
  }
}

const fin = v => typeof v === 'number' && Number.isFinite(v);

/** Normalised grid of a fixture/state: chip W × H cut into nx × ny tiles of cw × ch. */
export function gridOf(p) {
  return {W: p.chip.W, H: p.chip.H, nx: p.gcell.nx, ny: p.gcell.ny, cw: p.gcell.cellW, ch: p.gcell.cellH};
}

/**
 * Validate before computing anything (the teacher's helper silently skips unknown pins).
 * Errors: BAD_GRID, GRID_MISMATCH, BAD_CAPACITY, EMPTY_NET, DUPLICATE_PIN, UNKNOWN_PIN, BAD_COORDINATE, OUTSIDE.
 */
export function validate(p, positions, capacity = p.capacity) {
  if (!p || !p.chip || !p.gcell) throw new RudyInputError('BAD_GRID', 'Missing chip or gcell.');
  const G = gridOf(p);
  for (const k of ['W', 'H', 'cw', 'ch']) if (!fin(G[k]) || G[k] <= 0) throw new RudyInputError('BAD_GRID', `${k} must be a positive finite number.`, {k});
  for (const k of ['nx', 'ny']) if (!Number.isInteger(G[k]) || G[k] < 1) throw new RudyInputError('BAD_GRID', `${k} must be a positive integer.`, {k});
  if (!approxEqual(G.nx * G.cw, G.W) || !approxEqual(G.ny * G.ch, G.H)) throw new RudyInputError('GRID_MISMATCH', `${G.nx} × ${G.cw} by ${G.ny} × ${G.ch} tiles do not cover the ${G.W} × ${G.H} chip.`);
  if (capacity !== undefined && (!fin(capacity) || capacity <= 0)) throw new RudyInputError('BAD_CAPACITY', 'Capacity must be a finite number > 0.', {capacity});
  if (!Array.isArray(p.nets)) throw new RudyInputError('BAD_NETLIST', 'Nets must be a list.');
  for (const n of p.nets) {
    if (!n || !Array.isArray(n.pins) || n.pins.length === 0) throw new RudyInputError('EMPTY_NET', `Net ${n?.id ?? '?'} has no pins.`, {net: n?.id});
    const seen = new Set();
    for (const pin of n.pins) {
      if (seen.has(pin)) throw new RudyInputError('DUPLICATE_PIN', `Net ${n.id} lists pin ${pin} twice.`, {net: n.id, pin});
      seen.add(pin);
      const q = positions?.[pin];
      if (!q) throw new RudyInputError('UNKNOWN_PIN', `Net ${n.id} references unknown pin ${pin}.`, {net: n.id, pin});
      if (!fin(q.x) || !fin(q.y)) throw new RudyInputError('BAD_COORDINATE', `Pin ${pin} needs finite x and y.`, {pin});
      if (q.x < 0 || q.x > G.W || q.y < 0 || q.y > G.H) throw new RudyInputError('OUTSIDE', `Pin ${pin} (${q.x}, ${q.y}) is outside the ${G.W} × ${G.H} chip.`, {pin});
    }
  }
  // Every placed pin must be valid too, even one no net uses (same rule as the Python references).
  for (const [pin, q] of Object.entries(positions ?? {})) {
    if (!q || !fin(q.x) || !fin(q.y)) throw new RudyInputError('BAD_COORDINATE', `Pin ${pin} needs finite x and y.`, {pin});
    if (q.x < 0 || q.x > G.W || q.y < 0 || q.y > G.H) throw new RudyInputError('OUTSIDE', `Pin ${pin} (${q.x}, ${q.y}) is outside the ${G.W} × ${G.H} chip.`, {pin});
  }
  return G;
}

/** Teacher's tile index: floor, then clamp into the grid (x = W lands in the last column). */
export function tileIndex(x, y, G) {
  return {i: Math.max(0, Math.min(G.nx - 1, Math.floor(x / G.cw))), j: Math.max(0, Math.min(G.ny - 1, Math.floor(y / G.ch)))};
}

export function bbox(pins, positions) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const id of pins) {
    const q = positions[id];
    x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
  }
  return {x0, y0, x1, y1, w: x1 - x0, h: y1 - y0};
}

/** Inclusive endpoint-tile rule: every tile between the lower-left corner's tile and the upper-right corner's tile. */
export function selectedTiles(b, G) {
  const a = tileIndex(b.x0, b.y0, G), c = tileIndex(b.x1, b.y1, G);
  const tiles = [];
  for (let i = a.i; i <= c.i; i++) for (let j = a.j; j <= c.j; j++) tiles.push({i, j});
  return {tiles, lo: a, hi: c};
}

/** Model P for one net. */
export function netInfoP(net, positions, G) {
  const b = bbox(net.pins, positions);
  const hpwl = b.w + b.h;
  const {tiles, lo, hi} = selectedTiles(b, G);
  const share = hpwl / tiles.length;
  return {id: net.id, pins: [...net.pins], bbox: b, hpwl, tiles, lo, hi, share, parts: tiles.map(t => ({...t, total: share, h: NaN, v: NaN}))};
}

const overlap1 = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/**
 * Model A for one net. A degenerate box (a line) deposits its length into the tiles it runs through, in
 * proportion to the length inside each; a line exactly on a tile edge goes to the floor-and-clamp tile.
 * Coincident pins deposit 0. (DREAMPlace returns 0 and OpenROAD skips zero-area boxes: stated teaching rule.)
 */
export function netInfoA(net, positions, G) {
  const b = bbox(net.pins, positions);
  const hpwl = b.w + b.h;
  const parts = [];
  if (b.w > 0 && b.h > 0) {
    const area = b.w * b.h;
    for (let i = 0; i < G.nx; i++) for (let j = 0; j < G.ny; j++) {
      const o = overlap1(b.x0, b.x1, i * G.cw, (i + 1) * G.cw) * overlap1(b.y0, b.y1, j * G.ch, (j + 1) * G.ch);
      if (o > 0) parts.push({i, j, total: hpwl * o / area, h: b.w * o / area, v: b.h * o / area, overlap: o});
    }
  } else if (b.w > 0) {
    const {j} = tileIndex(b.x0, b.y0, G);
    for (let i = 0; i < G.nx; i++) { const o = overlap1(b.x0, b.x1, i * G.cw, (i + 1) * G.cw); if (o > 0) parts.push({i, j, total: o, h: o, v: 0, overlap: o}); }
  } else if (b.h > 0) {
    const {i} = tileIndex(b.x0, b.y0, G);
    for (let j = 0; j < G.ny; j++) { const o = overlap1(b.y0, b.y1, j * G.ch, (j + 1) * G.ch); if (o > 0) parts.push({i, j, total: o, h: 0, v: o, overlap: o}); }
  }
  return {id: net.id, pins: [...net.pins], bbox: b, hpwl, parts, tiles: parts.map(({i, j}) => ({i, j})), share: null};
}

export const zeros = G => Array.from({length: G.nx}, () => Array(G.ny).fill(0));

/**
 * Demand map. opts.model 'P' (default) or 'A'; opts.upto = number of nets accumulated (partial map), default all.
 * Returns {model, G, demand, H, V, nets, contrib, upto, partial}. Every call starts from zero.
 */
export function computeDemand(p, positions, {model = 'P', upto} = {}) {
  const G = validate(p, positions, undefined);
  if (model !== 'P' && model !== 'A') throw new RudyInputError('BAD_MODEL', `Unknown model ${model}.`);
  const n = upto === undefined ? p.nets.length : Math.max(0, Math.min(p.nets.length, upto));
  const demand = zeros(G), H = zeros(G), V = zeros(G);
  const contrib = Array.from({length: G.nx}, () => Array.from({length: G.ny}, () => []));
  const nets = [];
  for (let k = 0; k < p.nets.length; k++) {
    const info = model === 'P' ? netInfoP(p.nets[k], positions, G) : netInfoA(p.nets[k], positions, G);
    nets.push(info);
    if (k >= n) continue;
    for (const q of info.parts) {
      demand[q.i][q.j] += q.total;
      if (model === 'A') { H[q.i][q.j] += q.h; V[q.i][q.j] += q.v; }
      contrib[q.i][q.j].push({net: info.id, amount: q.total});
    }
  }
  return {model, G, demand, H: model === 'A' ? H : null, V: model === 'A' ? V : null, nets, contrib, upto: n, partial: n < p.nets.length};
}

/** Capacity only re-reads demand: ratio = d / C, overflow = max(0, d − C). */
export function metrics(demand, capacity, {topFrac = 0.25} = {}) {
  if (!fin(capacity) || capacity <= 0) throw new RudyInputError('BAD_CAPACITY', 'Capacity must be a finite number > 0.');
  const ratio = demand.map(col => col.map(d => d / capacity));
  const overflow = demand.map(col => col.map(d => (d - capacity > TOLERANCE ? d - capacity : 0)));
  const fo = overflow.flat(), fd = demand.flat();
  const sorted = ratio.flat().sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(topFrac * sorted.length));
  let hot = null;
  demand.forEach((col, i) => col.forEach((d, j) => { if (!hot || d > hot.d + TOLERANCE) hot = {i, j, d}; }));
  return {capacity, ratio, overflow, total: fo.reduce((s, v) => s + v, 0), max: Math.max(0, ...fo), count: fo.filter(v => v > 0).length,
    sumDemand: fd.reduce((s, v) => s + v, 0), maxDemand: Math.max(...fd), hot, topAvgRatio: sorted.slice(0, k).reduce((s, v) => s + v, 0) / k, topK: k};
}

export const totalHpwl = (p, positions) => p.nets.reduce((s, n) => { const b = bbox(n.pins, positions); return s + b.w + b.h; }, 0);

/** RISA net-degree weights carried in DREAMPlace ops/rudy/src/parameters.h (Cheng, ICCAD 1994). Context only. */
export function risaWeight(k) {
  const t = {1: 1, 2: 1, 3: 1, 4: 1.0828, 5: 1.1536, 6: 1.2206, 7: 1.2823, 8: 1.3385, 9: 1.3991, 10: 1.4493};
  if (k in t) return t[k];
  for (const [lim, w] of [[15, 1.6899], [20, 1.8924], [25, 2.0743], [30, 2.2334], [35, 2.3892], [40, 2.5356], [45, 2.6625]]) if (k <= lim) return w;
  return 2.7933;
}

// ---------- placement state ----------

export const clone = value => JSON.parse(JSON.stringify(value));

export function makeState(fixture, placementName, overrides = {}) {
  return {
    fixtureId: fixture.id, placement: placementName, cells: [...fixture.cells],
    nets: fixture.nets.map(n => ({id: n.id, pins: [...n.pins]})),
    chip: {...fixture.chip}, gcell: {...fixture.gcell}, capacity: fixture.capacity,
    positions: clone(fixture.placements[placementName]),
    model: 'P', layer: 'demand', upto: undefined, selectedNet: null,
    ...overrides,
  };
}

/** Apply a move, clamped to the chip. Returns {ok, state, reason}. Never mutates the input. */
export function moveCell(state, cell, point) {
  if (!state.cells.includes(cell)) return {ok: false, state, reason: 'unknown-cell'};
  if (!fin(point.x) || !fin(point.y)) return {ok: false, state, reason: 'non-finite'};
  const x = Math.min(state.chip.W, Math.max(0, point.x)), y = Math.min(state.chip.H, Math.max(0, point.y));
  const next = clone(state);
  next.positions[cell] = {x, y};
  next.placement = 'edited';
  return {ok: true, state: next, reason: x !== point.x || y !== point.y ? 'clamped' : 'moved'};
}

/** Everything the UI, film and grader need about one state, from one computation. */
export function analyse(state) {
  const d = computeDemand(state, state.positions, {model: state.model ?? 'P', upto: state.upto});
  const m = metrics(d.demand, state.capacity);
  return {...d, metrics: m, totalHpwl: d.nets.reduce((s, n) => s + n.hpwl, 0), selected: d.nets.find(n => n.id === state.selectedNet) ?? null};
}

export function lerpPositions(a, b, p) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = {x: a[k].x + (b[k].x - a[k].x) * p, y: a[k].y + (b[k].y - a[k].y) * p};
  return out;
}

/** Display only (grading never uses this). */
export function fmt(v, digits = 2) {
  if (!Number.isFinite(v)) return String(v);
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  const text = (Object.is(r, -0) ? 0 : r).toFixed(digits);
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/** Exact small fraction for teaching numbers (denominator ≤ 12), else a decimal. */
export function frac(v, maxDen = 12) {
  if (!Number.isFinite(v)) return String(v);
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9) return d === 1 ? String(n) : `${n}/${d}`;
  }
  return fmt(v, 3);
}

export function prepareFixtures(json) {
  const out = {};
  for (const [id, f] of Object.entries(json.fixtures)) out[id] = {...f, id};
  return out;
}

/** Pairs of pins closer than 1 on both axes (the 1 × 1 footprint rule used by one challenge). */
export function closePairs(positions, cells = Object.keys(positions), size = 1) {
  const out = [];
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const a = positions[cells[i]], b = positions[cells[j]];
    if (size - Math.abs(a.x - b.x) > TOLERANCE && size - Math.abs(a.y - b.y) > TOLERANCE) out.push([cells[i], cells[j]]);
  }
  return out;
}

/** Parse a learner's number: "11/6", "1.8333", "1,83". NaN when unreadable. */
export function parseNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || !v.trim()) return NaN;
  const s = v.trim().replace(/\s+/g, '').replace(',', '.').replace('÷', '/');
  const m = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  return /^-?\d+(?:\.\d+)?$/.test(s) ? Number(s) : NaN;
}
