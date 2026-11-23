// RUDY classroom estimator: pure domain functions shared by the lesson text,
// the live lab, the film renderer, the challenges and the tests.
// No DOM access, no globals, no randomness. Every call starts from zero.
//
// Matrix orientation everywhere: demand[x][y] (column index first), matching
// the teacher's source. Screen drawing flips y so that y=0 is at the bottom.
//
// Two models, never mixed under one name:
//   "P" = teacher's discrete equal-share proxy (the core of this lesson)
//   "A" = area-weighted extension (what DREAMPlace / OpenROAD-style tools do)
// SPDX-License-Identifier: MIT

export const MODELS = Object.freeze({ P: "P", A: "A" });

// ---------- validation ----------

/** Build a normalised grid description from a problem object. */
export function gridOf(problem) {
  const g = problem.gcell;
  return {
    W: Number(problem.chip.W),
    H: Number(problem.chip.H),
    nx: Number(g.nx),
    ny: Number(g.ny),
    cw: Number(g.cellW),
    ch: Number(g.cellH),
  };
}

const fin = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * Validate a problem + positions. Returns { ok, errors: [{code, msg}] }.
 * The core model refuses to compute on invalid input instead of producing
 * NaN, Infinity or a reassuring all-zero map.
 */
export function validate(problem, positions, capacity) {
  const errors = [];
  const err = (code, msg) => errors.push({ code, msg });
  if (!problem || !problem.chip || !problem.gcell) {
    err("problem", "missing chip or gcell section");
    return { ok: false, errors };
  }
  const G = gridOf(problem);
  for (const k of ["W", "H", "cw", "ch"]) if (!fin(G[k]) || G[k] <= 0) err("grid", `${k} must be a positive finite number`);
  for (const k of ["nx", "ny"]) if (!Number.isInteger(G[k]) || G[k] < 1) err("grid", `${k} must be a positive integer`);
  if (errors.length === 0) {
    if (Math.abs(G.nx * G.cw - G.W) > 1e-9 || Math.abs(G.ny * G.ch - G.H) > 1e-9)
      err("grid", `grid ${G.nx}×${G.cw} by ${G.ny}×${G.ch} does not tile the ${G.W}×${G.H} chip`);
  }
  if (capacity !== undefined && (!fin(capacity) || capacity <= 0))
    err("capacity", "capacity must be a finite number greater than 0");
  const nets = problem.nets;
  if (!Array.isArray(nets)) err("nets", "nets must be a list");
  else
    nets.forEach((net, k) => {
      if (!Array.isArray(net) || net.length === 0) err("net", `net ${k} is empty`);
      else
        for (const id of net)
          if (!positions || !(id in positions)) err("pin", `net ${k} references unknown pin ${id}`);
    });
  if (!positions || typeof positions !== "object") err("positions", "positions missing");
  else
    for (const [id, p] of Object.entries(positions)) {
      if (!p || !fin(p.x) || !fin(p.y)) {
        err("coord", `pin ${id} has a non-finite coordinate`);
        continue;
      }
      if (errors.some((e) => e.code === "grid")) continue;
      if (p.x < 0 || p.x > G.W || p.y < 0 || p.y > G.H)
        err("outside", `pin ${id} (${p.x}, ${p.y}) is outside the ${G.W}×${G.H} chip`);
    }
  return { ok: errors.length === 0, errors };
}

export class RudyInputError extends Error {
  constructor(errors) {
    super(errors.map((e) => e.msg).join("; "));
    this.errors = errors;
  }
}

function assertValid(problem, positions, capacity) {
  const v = validate(problem, positions, capacity);
  if (!v.ok) throw new RudyInputError(v.errors);
  return gridOf(problem);
}

// ---------- geometry ----------

/** Teacher's tile index: floor, then clamp into the grid. x = W lands in the last column. */
export function tileIndex(x, y, G) {
  const i = Math.max(0, Math.min(G.nx - 1, Math.floor(x / G.cw)));
  const j = Math.max(0, Math.min(G.ny - 1, Math.floor(y / G.ch)));
  return { i, j };
}

export function bbox(net, positions) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const id of net) {
    const p = positions[id];
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/** Inclusive endpoint-bin rule: every tile index between the two corners' tiles. */
export function selectedTiles(b, G) {
  const a = tileIndex(b.x0, b.y0, G);
  const c = tileIndex(b.x1, b.y1, G);
  const tiles = [];
  for (let i = a.i; i <= c.i; i++) for (let j = a.j; j <= c.j; j++) tiles.push({ i, j });
  return tiles;
}

/** Everything the lesson shows about one net under model P. */
export function netInfoP(net, positions, G) {
  const b = bbox(net, positions);
  const hpwl = b.w + b.h;
  const tiles = selectedTiles(b, G);
  const share = hpwl / tiles.length; // tiles.length >= 1 always
  return { pins: net.slice(), bbox: b, hpwl, tiles, share };
}

function overlap1(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/**
 * Model A for one net: demand proportional to bbox overlap area.
 *   total[t] = HPWL × overlap(t) / area,  H[t] = w × overlap / area,  V[t] = h × overlap / area
 * Degenerate boxes (a stated teaching rule; DREAMPlace returns 0 and OpenROAD skips them):
 *   a horizontal or vertical segment deposits its length into the tiles it runs
 *   through, in proportion to the length inside each tile; a segment lying exactly
 *   on a tile edge goes to the tile chosen by the floor-and-clamp index.
 *   Coincident pins deposit 0.
 */
export function netInfoA(net, positions, G) {
  const b = bbox(net, positions);
  const hpwl = b.w + b.h;
  const parts = [];
  if (b.w > 0 && b.h > 0) {
    const area = b.w * b.h;
    for (let i = 0; i < G.nx; i++)
      for (let j = 0; j < G.ny; j++) {
        const ox = overlap1(b.x0, b.x1, i * G.cw, (i + 1) * G.cw);
        const oy = overlap1(b.y0, b.y1, j * G.ch, (j + 1) * G.ch);
        const o = ox * oy;
        if (o > 0) parts.push({ i, j, total: (hpwl * o) / area, h: (b.w * o) / area, v: (b.h * o) / area });
      }
  } else if (b.w > 0) {
    const { j } = tileIndex(b.x0, b.y0, G);
    for (let i = 0; i < G.nx; i++) {
      const ox = overlap1(b.x0, b.x1, i * G.cw, (i + 1) * G.cw);
      if (ox > 0) parts.push({ i, j, total: ox, h: ox, v: 0 });
    }
  } else if (b.h > 0) {
    const { i } = tileIndex(b.x0, b.y0, G);
    for (let j = 0; j < G.ny; j++) {
      const oy = overlap1(b.y0, b.y1, j * G.ch, (j + 1) * G.ch);
      if (oy > 0) parts.push({ i, j, total: oy, h: 0, v: oy });
    }
  }
  return { pins: net.slice(), bbox: b, hpwl, parts };
}

// ---------- maps ----------

export function zeros(G) {
  return Array.from({ length: G.nx }, () => Array(G.ny).fill(0));
}

/**
 * Compute a demand map. options.model = "P" (default) or "A".
 * options.upto = number of nets to include (partial accumulation); default all.
 * Returns { model, demand, H, V, nets: [netInfo], contrib: [[ [{net, amount}] ]] }.
 */
export function computeDemand(problem, positions, options = {}) {
  const G = assertValid(problem, positions, options.capacity);
  const model = options.model || MODELS.P;
  const n = options.upto === undefined ? problem.nets.length : Math.max(0, Math.min(problem.nets.length, options.upto));
  const demand = zeros(G);
  const H = zeros(G);
  const V = zeros(G);
  const contrib = Array.from({ length: G.nx }, () => Array.from({ length: G.ny }, () => []));
  const nets = [];
  for (let k = 0; k < n; k++) {
    const net = problem.nets[k];
    if (model === MODELS.P) {
      const info = netInfoP(net, positions, G);
      nets.push(info);
      for (const t of info.tiles) {
        demand[t.i][t.j] += info.share;
        contrib[t.i][t.j].push({ net: k, amount: info.share });
      }
    } else if (model === MODELS.A) {
      const info = netInfoA(net, positions, G);
      nets.push(info);
      for (const p of info.parts) {
        demand[p.i][p.j] += p.total;
        H[p.i][p.j] += p.h;
        V[p.i][p.j] += p.v;
        contrib[p.i][p.j].push({ net: k, amount: p.total });
      }
    } else throw new RudyInputError([{ code: "model", msg: `unknown model ${model}` }]);
  }
  return { model, G, demand, H, V, nets, contrib, partial: n < problem.nets.length, upto: n };
}

/** Capacity metrics. Capacity never changes demand; it only re-reads it. */
export function metrics(demand, capacity, opts = {}) {
  if (!fin(capacity) || capacity <= 0) throw new RudyInputError([{ code: "capacity", msg: "capacity must be > 0" }]);
  const eps = opts.eps ?? 1e-9;
  const ratio = demand.map((col) => col.map((d) => d / capacity));
  const overflow = demand.map((col) => col.map((d) => (d - capacity > eps ? d - capacity : 0)));
  const flatO = overflow.flat();
  const flatD = demand.flat();
  const total = flatO.reduce((s, v) => s + v, 0);
  const max = Math.max(...flatO);
  const count = flatO.filter((v) => v > 0).length;
  const sumDemand = flatD.reduce((s, v) => s + v, 0);
  // Top-k average ratio, in the spirit of ACE(x): mean ratio of the worst ceil(frac*N) tiles.
  const frac = opts.topFrac ?? 0.25;
  const sorted = ratio.flat().slice().sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(frac * sorted.length));
  const topAvgRatio = sorted.slice(0, k).reduce((s, v) => s + v, 0) / k;
  return { capacity, ratio, overflow, total, max, count, sumDemand, topAvgRatio, topK: k };
}

export function totalHpwl(problem, positions) {
  return problem.nets.reduce((s, net) => {
    const b = bbox(net, positions);
    return s + b.w + b.h;
  }, 0);
}

// RISA net-degree weights as carried in DREAMPlace ops/rudy/src/parameters.h
// (Cheng, ICCAD 1994). Shown in the lesson as context; model P and model A do not apply them.
export function risaWeight(numPins) {
  const t = { 1: 1, 2: 1, 3: 1, 4: 1.0828, 5: 1.1536, 6: 1.2206, 7: 1.2823, 8: 1.3385, 9: 1.3991, 10: 1.4493 };
  if (numPins in t) return t[numPins];
  if (numPins <= 15) return 1.6899;
  if (numPins <= 20) return 1.8924;
  if (numPins <= 25) return 2.0743;
  if (numPins <= 30) return 2.2334;
  if (numPins <= 35) return 2.3892;
  if (numPins <= 40) return 2.5356;
  if (numPins <= 45) return 2.6625;
  return 2.7933;
}

/** Nice fraction text for teaching numbers with small denominators (≤ 12). */
export function fracText(v, maxDen = 12) {
  if (!fin(v)) return String(v);
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9) {
      if (d === 1) return String(n);
      return `${n}/${d}`;
    }
  }
  return v.toFixed(3);
}

export function num(v, digits = 2) {
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  return v.toFixed(digits);
}
