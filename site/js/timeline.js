// Deterministic random-access timeline: stateAt(t) depends only on t, the fixtures, the script and the clock.
// No wall clock, no randomness, no accumulated history. Every number is recomputed from positions by domain.js.
import {analyse, lerpPositions, clone} from './domain.js';

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const ease = v => { const p = clamp(v); return p * p * (3 - 2 * p); };

/** Index of the cue whose picture window contains t (windows are contiguous and half-open). */
export function cueIndexAt(t, clock) {
  const segs = clock.segments;
  for (let i = 0; i < segs.length; i++) if (t < segs[i].sceneEnd) return i;
  return segs.length - 1;
}

export function validateClock(clock, script, {allowProvisional = false} = {}) {
  if (!clock || !Array.isArray(clock.segments) || !clock.segments.length) throw new TypeError('clock.segments required');
  if (clock.provisional && !allowProvisional) throw new Error('final film cannot use a provisional clock');
  let prev = 0;
  clock.segments.forEach((s, i) => {
    if (s.id !== script.cues[i]?.id) throw new Error(`clock/script order mismatch at ${i}: ${s.id}`);
    if (!(s.start >= 0 && s.start <= s.end && s.end <= s.sceneEnd && s.sceneEnd <= clock.duration)) throw new Error(`bad times in ${s.id}`);
    if (Math.abs(s.start - prev) > 1e-9) throw new Error(`gap before ${s.id}`);
    if (s.lines.length !== script.cues[i].lines.length) throw new Error(`line count mismatch in ${s.id}`);
    for (const L of s.lines) if (!(L.start >= s.start - 1e-9 && L.end <= s.end + 1e-9 && L.start < L.end)) throw new Error(`bad line in ${s.id}`);
    prev = s.sceneEnd;
  });
  if (Math.abs(prev - clock.duration) > 1e-9) throw new Error('clock does not end at duration');
  return true;
}

function view(fx, positions, extra = {}) {
  return {
    fixtureId: fx.id, cells: [...fx.cells], nets: fx.nets.map(n => ({id: n.id, pins: [...n.pins]})), chip: {...fx.chip}, gcell: {...fx.gcell},
    capacity: fx.capacity, positions, model: 'P', layer: 'none', upto: undefined, selectedNet: null,
    showBoxes: 'selected', highlights: {}, ...extra,
  };
}
const SP = FX => clone(FX.teacher.placements.spread);
const N = (v, d = 3) => +v.toFixed(d);
const ORDER = ['AB', 'CD', 'AC', 'BD', 'ABCD', 'EF'];

/** Build the cue-specific picture. `c` holds timing helpers for this cue. */
const CUES = {
  // ---------- shared / concise ----------
  title(FX, c) {
    return {board: view(FX.teacher, SP(FX), {layer: 'demand', highlights: {heat: 0.55, legend: false}}), panel: {kind: 'title'}};
  },
  problem(FX, c) {
    return {board: view(FX.teacher, SP(FX), {showBoxes: c.li >= 1 ? 'all' : 'none', highlights: {flylines: true, coords: c.li === 0, notWire: c.li >= 2}}),
      panel: {kind: 'notes', set: 'problem', reveal: c.li + 1}};
  },
  grid(FX, c) {
    return {board: view(FX.teacher, SP(FX), {highlights: {flylines: 0.25, focusTile: c.li >= 1 ? {i: 2, j: 1} : null}}), panel: {kind: 'grid', reveal: c.li + 1}};
  },
  onenet(FX, c) {
    const k = c.li >= 2 ? Math.min(6, 1 + Math.floor(c.raw(2) * 7)) : 0;
    return {board: view(FX.teacher, SP(FX), {selectedNet: 'ABCD', visibleNets: ['ABCD'], highlights: {coords: true, corners: c.li >= 1 ? N(c.lp(1, 0, 0.3)) : 0, tilesOf: c.li >= 2 ? 'ABCD' : null, tilesShown: k, shares: false}}),
      panel: {kind: 'net', net: 'ABCD', step: c.li, shown: k}};
  },
  deposit(FX, c) {
    const T = FX.teacher, p = c.lp(0, 0.1, 0.6);
    const b = view(T, SP(FX), {nets: T.nets.filter(n => n.id === 'ABCD').map(n => ({id: n.id, pins: [...n.pins]})), selectedNet: 'ABCD', layer: 'demand', upto: p >= 1 ? 1 : 0,
      highlights: {tilesOf: 'ABCD', deposit: {net: 'ABCD', p: N(p)}, values: p >= 1 ? 1 : 0, exact: true, edge: c.li >= 2 ? {x: 3, o: N(c.lp(2, 0, 0.3))} : null, capLine: false}});
    return {board: b, panel: {kind: 'deposit', net: 'ABCD', rule: c.li >= 1, edge: c.li >= 2}, intermediate: p > 0 && p < 1};
  },
  accumulate(FX, c) {
    let k = 6;
    if (c.li === 0) k = Math.min(5, 1 + Math.floor(c.raw(0) * 5));
    if (c.li === 1) k = 5;
    return {board: view(FX.teacher, SP(FX), {layer: 'demand', upto: k, selectedNet: c.li >= 2 ? null : ORDER[k - 1], showBoxes: c.li >= 2 ? 'none' : 'selected',
      highlights: {tilesOf: c.li >= 2 ? null : ORDER[k - 1], values: true, exact: true, dimOthers: false, capLine: false}}),
      panel: {kind: 'accum', upto: k, sum: c.li >= 2}};
  },
  capacity(FX, c) {
    const layer = c.li === 0 ? 'ratio' : 'overflow';
    return {board: view(FX.teacher, SP(FX), {layer, capacity: c.li >= 2 ? 1 : 2, highlights: {values: true, exact: true, overflowMarks: c.li >= 1}}),
      panel: {kind: 'metrics', show: c.li, compareCap: c.li >= 2 ? 2 : null}};
  },
  pseudocode(FX, c) {
    let line = 0, k = 0;
    if (c.li === 1) { k = Math.min(6, 1 + Math.floor(c.raw(1) * 6)); line = 2; }
    if (c.li >= 2) { k = 6; line = 5; }
    return {board: view(FX.teacher, SP(FX), {layer: c.li >= 2 ? 'overflow' : 'demand', upto: k, selectedNet: c.li === 1 ? ORDER[k - 1] : null,
      highlights: {tilesOf: c.li === 1 ? ORDER[k - 1] : null, values: k > 0, exact: true, overflowMarks: c.li >= 2, shares: false}}),
      panel: {kind: 'code', line, upto: k}};
  },
  takeaway(FX, c) {
    return {board: view(FX.teacher, SP(FX), {layer: 'demand', highlights: {values: true, exact: true, overflowMarks: true}}), panel: {kind: 'summary', reveal: c.li + 1}};
  },
  // ---------- advanced ----------
  edge_move(FX, c) {
    const E = FX.edge, P = E.placements;
    if (c.li >= 2) return {board: view(E, clone(P.rightEdge), {selectedNet: 'PQ', layer: 'demand', highlights: {coords: true, tilesOf: 'PQ', corners: 1, edge: {x: 12}, capLine: false}}), panel: {kind: 'edge', which: 'rightEdge'}};
    const p = c.li >= 1 ? 1 : c.lp(0, 0.15, 0.7);
    const pos = lerpPositions(P.inside, P.online, p);
    return {board: view(E, pos, {selectedNet: 'PQ', layer: 'demand', highlights: {coords: true, tilesOf: 'PQ', corners: 1, edge: {x: 3}, ghost: p > 0 ? {Q: P.inside.Q} : null, capLine: false}}),
      panel: {kind: 'edge', which: p >= 1 ? 'online' : 'inside', moving: p > 0 && p < 1}, intermediate: p > 0 && p < 1};
  },
  boundary_teacher(FX, c) {
    const T = FX.teacher, p = c.lp(0, 0.1, 0.6);
    const pos = lerpPositions(T.placements.spread, T.placements.boundary, p);
    return {board: view(T, pos, {layer: c.li >= 1 ? 'overflow' : 'demand', selectedNet: c.li === 0 ? 'AC' : null, showBoxes: c.li === 0 ? 'selected' : 'none',
      highlights: {tilesOf: c.li === 0 ? 'AC' : null, ghost: {A: T.placements.spread.A}, edge: {x: 3}, values: true, exact: true, overflowMarks: c.li >= 1, dimOthers: false}}),
      panel: {kind: 'metrics', show: 1, compareTo: 'spread'}, intermediate: p > 0 && p < 1};
  },
  compare(FX, c) {
    const T = FX.teacher;
    const layer = c.li === 0 ? 'demand' : 'overflow';
    const mk = pl => view(T, clone(T.placements[pl]), {layer, highlights: {values: true, exact: true, overflowMarks: c.li >= 1, hot: c.li >= 2 ? 1 : 0}});
    return {board: mk('spread'), boards: [mk('spread'), mk('cluster')], panel: {kind: 'compare', verdict: c.li >= 2, model: 'P'}};
  },
  capacity_change(FX, c) {
    const p = c.lp(0, 0.2, 0.7);
    const cap = N(2 - p, 3);
    return {board: view(FX.teacher, SP(FX), {layer: 'overflow', capacity: cap, highlights: {values: true, exact: p >= 1 || p <= 0, overflowMarks: true}}),
      panel: {kind: 'metrics', show: 1, compareCap: 2, both: true}, intermediate: p > 0 && p < 1};
  },
  modelA(FX, c) {
    const T = FX.teacher;
    if (c.li >= 2) {
      const mk = layer => view(T, SP(FX), {model: 'A', layer, highlights: {values: true}});
      return {board: mk('H'), boards: [mk('H'), mk('V')], panel: {kind: 'modelA', step: 2}};
    }
    return {board: view(T, SP(FX), {model: 'A', layer: 'demand', selectedNet: c.li === 1 ? 'ABCD' : null, highlights: {values: true, tilesOf: c.li === 1 ? 'ABCD' : null, dimOthers: false}}),
      panel: {kind: 'modelA', step: c.li, net: 'ABCD'}};
  },
  flip(FX, c) {
    const T = FX.teacher;
    const mk = pl => view(T, clone(T.placements[pl]), {model: 'A', layer: 'overflow', highlights: {values: true, overflowMarks: true, hot: 1}});
    return {board: mk('spread'), boards: [mk('spread'), mk('cluster')], panel: {kind: 'compare', verdict: true, model: 'A'}};
  },
  limits(FX, c) {
    const chip = syntheticChip();
    return {board: view(chip, clone(chip.placements.start), {layer: 'ratio', showBoxes: 'none', highlights: {tiny: true, legend: false}}), panel: {kind: 'notes', set: 'limits', reveal: c.li + 1}};
  },
  // ---------- popular-science film (cut to music) ----------
  city(FX, c) {
    return {board: view(FX.teacher, SP(FX), {highlights: {city: true, flylines: c.li >= 1 ? 0.5 : 0, appear: N(c.lp(0, 0, 0.5)), pulse: c.li >= 1 ? N(c.lp(1, 0, 0.6)) : 0, indices: false}}),
      panel: {kind: 'story', set: 'hook', reveal: c.li + 1}};
  },
  city_box(FX, c) {
    const p = c.since(c.seg.start + 0.4, 1.6), q = c.since(c.seg.start + 2.2, 1.6);
    return {board: view(FX.teacher, SP(FX), {selectedNet: 'ABCD', visibleNets: ['ABCD'], showBoxes: p > 0 ? 'selected' : 'none',
      highlights: {city: true, indices: false, tilesOf: q > 0 ? 'ABCD' : null, tilesShown: Math.ceil(q * 6), shares: q >= 1}}),
      panel: {kind: 'story', set: 'box', reveal: q >= 1 ? 2 : 1}};
  },
  chip_turn(FX, c) {
    return {board: view(FX.teacher, SP(FX), {showBoxes: c.li >= 1 ? 'all' : 'none', highlights: {flylines: c.li === 0 ? true : 0.3, notWire: c.li >= 1}}),
      panel: {kind: 'notes', set: 'problem', reveal: c.li + 1}};
  },
  title_story(FX, c) {
    const hits = c.hits.filter(h => h >= c.seg.start - 0.05 && h <= (c.sections.lock ?? c.seg.start + 2) + 0.05);
    const shown = hits.filter(h => h <= c.T).length;
    return {board: view(FX.teacher, SP(FX), {layer: 'demand', highlights: {heat: shown >= hits.length ? 0.55 : 0.15, legend: false}}),
      panel: {kind: 'title', shown: c.T >= (c.sections.lock ?? c.seg.start) + 0.8 ? 99 : shown}};
  },
  onenet_story(FX, c) {
    const k = c.li >= 1 ? Math.min(6, 1 + Math.floor(c.raw(1) * 7)) : 0;
    return {board: view(FX.teacher, SP(FX), {selectedNet: 'ABCD', visibleNets: ['ABCD'], highlights: {coords: c.li === 0, corners: c.li >= 1 ? 1 : 0, tilesOf: c.li >= 1 ? 'ABCD' : null, tilesShown: k, shares: false}}),
      panel: {kind: 'net', net: 'ABCD', step: c.li >= 1 ? 2 : 0, shown: k}};
  },
  deposit_story(FX, c) {
    const T = FX.teacher, p = c.lp(0, 0.05, 0.55);
    return {board: view(T, SP(FX), {nets: T.nets.filter(n => n.id === 'ABCD').map(n => ({id: n.id, pins: [...n.pins]})), selectedNet: 'ABCD', layer: 'demand', upto: p >= 1 ? 1 : 0,
      highlights: {tilesOf: 'ABCD', deposit: {net: 'ABCD', p: N(p)}, values: p >= 1 ? 1 : 0, exact: true, capLine: false}}),
      panel: {kind: 'deposit', net: 'ABCD'}, intermediate: p > 0 && p < 1};
  },
  accumulate_story(FX, c) {
    const k = c.li === 0 ? Math.min(6, 1 + Math.floor(c.raw(0) * 6)) : 6;
    return {board: view(FX.teacher, SP(FX), {layer: 'demand', upto: k, selectedNet: c.li === 0 ? ORDER[k - 1] : null, showBoxes: c.li === 0 ? 'selected' : 'none',
      highlights: {tilesOf: c.li === 0 ? ORDER[k - 1] : null, values: c.li >= 1, exact: true, shares: false, dimOthers: false, capLine: false}}),
      panel: {kind: 'accum', upto: k, sum: c.li >= 1}};
  },
  capacity_story(FX, c) {
    return {board: view(FX.teacher, SP(FX), {layer: 'overflow', highlights: {values: true, exact: true, overflowMarks: true}}), panel: {kind: 'metrics', show: 1}};
  },
  final_story(FX, c) {
    return {board: view(FX.teacher, SP(FX), {layer: c.li >= 2 ? 'demand' : 'overflow', highlights: {values: true, exact: true, overflowMarks: c.li < 2, hot: c.li === 1 ? 1 : 0}}),
      panel: {kind: 'metrics', show: c.li >= 2 ? 3 : 1}};
  },
  cluster_story(FX, c) {
    const T = FX.teacher, p = c.lp(0, 0.05, 0.6);
    const pos = lerpPositions(T.placements.spread, T.placements.cluster, p);
    return {board: view(T, pos, {layer: c.li >= 1 ? 'overflow' : 'demand', highlights: {values: p >= 1, exact: true, overflowMarks: c.li >= 1, hot: c.li >= 2 ? 1 : 0}}),
      panel: {kind: 'metrics', show: 1}, intermediate: p > 0 && p < 1};
  },
  cluster_hold(FX, c) {
    const T = FX.teacher;
    const mk = pl => view(T, clone(T.placements[pl]), {layer: 'overflow', highlights: {values: true, exact: true, overflowMarks: true, hot: 1}});
    return {board: mk('cluster'), boards: [mk('spread'), mk('cluster')], panel: {kind: 'compare', verdict: true, model: 'P'}};
  },
  boundary_story(FX, c) {
    const E = FX.edge, P = E.placements;
    const p = c.li >= 1 ? c.lp(1, 0.05, 0.5) : 0;
    const pos = lerpPositions(P.inside, P.online, p);
    return {board: view(E, pos, {selectedNet: 'PQ', layer: 'demand', highlights: {coords: true, tilesOf: 'PQ', edge: {x: 3}, corners: 1, capLine: false}}),
      panel: {kind: 'edge', which: p >= 1 ? 'online' : 'inside', moving: p > 0 && p < 1}, intermediate: p > 0 && p < 1};
  },
  modelA_story(FX, c) {
    if (c.li >= 1) return CUES.flip(FX, c);
    return {board: view(FX.teacher, SP(FX), {model: 'A', layer: 'demand', highlights: {values: true}}), panel: {kind: 'modelA', step: 0}};
  },
  chip_wide(FX, c) {
    const chip = syntheticChip();
    const sel = chip.nets[(c.li * 7) % chip.nets.length].id;
    return {board: view(chip, clone(chip.placements.start), {layer: 'ratio', showBoxes: 'selected', selectedNet: sel, highlights: {tiny: true, tilesOf: sel, shares: false, legend: false}}),
      panel: {kind: 'story', set: 'chip', reveal: c.li + 1}};
  },
  end_story(FX, c) {
    return {board: view(FX.teacher, SP(FX), {layer: 'demand', highlights: {values: true, exact: true, legend: false}}), panel: {kind: 'end', credit: c.li >= 1}};
  },
  // Lab walkthrough: recorded screenshots of the real page (scripts/record-walk.mjs), a cursor that travels between
  // the recorded pointer positions, and a click ring. Still a pure function of t and the recorded data.
  walk(FX, c) {
    const shots = c.walk?.shots?.[c.cue.id] ?? [];
    const u = clamp((c.T - c.seg.start) / Math.max(0.001, c.seg.sceneEnd - c.seg.start));
    let k = 0;
    shots.forEach((s, i) => { if (s.at <= u) k = i; });
    const cur = shots[k] ?? null, prev = shots[k - 1] ?? cur;
    const since = cur ? (c.T - (c.seg.start + cur.at * (c.seg.sceneEnd - c.seg.start))) : 0;
    const move = ease(since / 0.45);
    const cursor = cur && prev ? [prev.cursor[0] + (cur.cursor[0] - prev.cursor[0]) * move, prev.cursor[1] + (cur.cursor[1] - prev.cursor[1]) * move].map(v => +v.toFixed(2)) : null;
    const shown = cur && since < 0.45 && prev !== cur ? prev : cur;
    const click = cur?.click && since >= 0.45 && since < 0.95 ? +((since - 0.45) / 0.5).toFixed(3) : null;
    return {board: null, panel: {kind: 'walk', step: c.cue.id, n: shots.length}, walk: shown ? {img: shown.img, cursor, click, viewport: c.walk.viewport} : null};
  },
};

// A deterministic stand-in for "a real chip": many pins and nets from a seeded generator (mulberry32),
// a 10 × 6 tile grid, and a RUDY map computed by the same domain code.
let CHIP = null;
export function syntheticChip() {
  if (CHIP) return CHIP;
  let a = 20261123;
  const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const cells = [], start = {};
  // denser in two "hot" regions, so the map has structure
  for (let i = 0; i < 220; i++) {
    const id = `c${i}`; cells.push(id);
    const hot = rnd();
    const cx = hot < 0.35 ? 12 : hot < 0.6 ? 28 : rnd() * 40, cy = hot < 0.35 ? 15 : hot < 0.6 ? 7 : rnd() * 24;
    const sx = hot < 0.6 ? 5 : 0, sy = hot < 0.6 ? 4 : 0;
    start[id] = {x: Math.round(Math.min(40, Math.max(0, cx + (rnd() - 0.5) * 2 * sx)) * 10) / 10, y: Math.round(Math.min(24, Math.max(0, cy + (rnd() - 0.5) * 2 * sy)) * 10) / 10};
  }
  const nets = [];
  for (let i = 0; i < 160; i++) {
    const k = 2 + Math.floor(rnd() * rnd() * 4), base = Math.floor(rnd() * cells.length), pins = new Set([`c${base}`]);
    const near = cells.filter(id => Math.abs(start[id].x - start[`c${base}`].x) < 7 && Math.abs(start[id].y - start[`c${base}`].y) < 5);
    for (let tries = 0; pins.size < k && tries < 20; tries++) pins.add(near[Math.floor(rnd() * near.length)]);
    if (pins.size >= 2) nets.push({id: `n${i}`, pins: [...pins]});
  }
  CHIP = {id: 'chip', cells, nets, chip: {W: 40, H: 24}, gcell: {nx: 10, ny: 6, cellW: 4, cellH: 4}, capacity: 6, placements: {start}};
  return CHIP;
}

/**
 * stateAt(t, fixtures, script, clock): the complete semantic state at time t.
 * fixtures: prepared fixtures (domain.prepareFixtures).
 */
export function stateAt(time, fixtures, script, clock, {walk = null} = {}) {
  if (!Number.isFinite(time)) throw new TypeError('A finite time is required.');
  const t = clamp(time, 0, clock.duration);
  const i = cueIndexAt(t, clock);
  const seg = clock.segments[i], cue = script.cues[i];
  if (!cue || cue.id !== seg.id) throw new Error(`Missing script cue for ${seg.id}`);
  const L = seg.lines;
  let li = 0;
  for (let k = 0; k < L.length; k++) if (L[k].start <= t) li = k;
  const raw = k => (k < li ? 1 : k > li ? 0 : clamp((t - L[k].start) / (L[k].end - L[k].start)));
  const lp = (k, a = 0, b = 1) => ease((raw(k) - a) / (b - a));
  const scene = cue.scene ?? cue.id;
  const build = CUES[scene];
  if (!build) throw new Error(`No picture for scene ${scene} (cue ${cue.id})`);
  const since = (a, d = 1) => ease((t - a) / d); // music-locked motion: 0 before time a, 1 after a + d
  const pic = build(fixtures, {li, raw, lp, T: t, seg, since, hits: clock.track?.hits ?? [], sections: clock.track?.sections ?? {}, cue, walk});
  const line = cue.lines[li];
  const captionOn = t >= L[li].start && t < L[li].end && Boolean(line.zh || line.en);
  // Numbers for the panel: computed here, from the same positions the board draws.
  const metrics = pic.board ? analyse(pic.board) : {total: null, nets: []};
  const extra = {};
  if (pic.boards) extra.boardsMetrics = pic.boards.map(b => analyse(b));
  if (pic.panel.compareTo) {
    const fx = fixtures[pic.board.fixtureId];
    extra.reference = analyse({...pic.board, positions: clone(fx.placements[pic.panel.compareTo])});
  }
  if (pic.panel.compareCap) extra.reference = analyse({...pic.board, capacity: pic.panel.compareCap});
  return {
    time: t, duration: clock.duration, cueIndex: i, cueId: cue.id, chapter: cue.chapter, layout: cue.layout,
    lineIndex: li, lineProgress: raw(li), cueProgress: clamp((t - seg.start) / (seg.sceneEnd - seg.start)),
    caption: captionOn ? {zh: cue.lines[li].zh, en: cue.lines[li].en, id: `${cue.id}-${li + 1}`} : null,
    intermediate: Boolean(pic.intermediate),
    board: pic.board, boards: pic.boards ?? null, panel: pic.panel, metrics, walk: pic.walk ?? null, ...extra,
  };
}

/** What "Try this frame" hands to the lab: the actual coordinates and settings of the primary board. */
export function labHandoff(state) {
  const b = state.board;
  if (!b || b.fixtureId === 'chip') return null;
  return {
    fixtureId: b.fixtureId, positions: clone(b.positions), model: b.model ?? 'P', capacity: b.capacity, layer: b.layer === 'none' ? 'demand' : b.layer,
    upto: b.upto, selectedNet: b.selectedNet ?? null, cueId: state.cueId, time: state.time, intermediate: state.intermediate,
  };
}

/** Frame index <-> time mapping used by both the renderer and the web player. */
export const frameTime = (frame, fps) => frame / fps;
export const frameAt = (seconds, fps) => Math.floor(seconds * fps + 1e-6);
