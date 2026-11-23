// Challenge definitions and graders. Pure: every check reads the actual state or answer and the domain model.
// Texts live in content.js (by challenge id); this file holds only the logic so it can be unit-tested.
import {analyse, approxEqual, approxLE, makeState, parseNumber, closePairs, TOLERANCE} from './domain.js';

// Fractions are exact; a decimal answer is accepted when it rounds correctly to 2 places.
const near = (v, target, tol = 0.006) => { const x = parseNumber(v); return Number.isFinite(x) && (approxEqual(x, target) || Math.abs(x - target) <= tol); };

export const CHALLENGES = [
  {id: 'c1-tiles', category: 'compute', difficulty: 1, kind: 'answer', fixture: 'teacher', placement: 'spread', selectedNet: 'ABCD', fields: ['count', 'share']},
  {id: 'c2-edge', category: 'diagnose', difficulty: 1, kind: 'answer', fixture: 'edge', placement: 'online', selectedNet: 'PQ', fields: ['cause', 'share']},
  {id: 'c3-sum', category: 'compute', difficulty: 2, kind: 'answer', fixture: 'teacher', placement: 'spread', fields: ['sum', 'tile']},
  {id: 'c4-move-a', category: 'experiment', difficulty: 2, kind: 'state', fixture: 'teacher', placement: 'spread', selectedNet: 'AC', fields: ['predict']},
  {id: 'c5-capacity', category: 'judge', difficulty: 2, kind: 'answer', fixture: 'teacher', placement: 'spread', fields: ['reasons']},
  {id: 'c6-no-overflow', category: 'construct', difficulty: 3, kind: 'state', fixture: 'teacher', placement: 'spread', layer: 'overflow'},
  {id: 'c7-model-a', category: 'extension', difficulty: 2, kind: 'answer', fixture: 'teacher', placement: 'spread', model: 'A', selectedNet: 'ABCD', fields: ['share']},
];

/** The lab state a challenge starts from (same constructor as the lab). */
export function setupState(fixtures, ch) {
  return makeState(fixtures[ch.fixture], ch.placement, {model: ch.model ?? 'P', layer: ch.layer ?? 'demand', selectedNet: ch.selectedNet ?? null});
}

const result = checks => ({pass: checks.every(c => c.ok), checks});
const same = (a, b) => approxEqual(a.x, b.x) && approxEqual(a.y, b.y);

/**
 * grade(id, {state, answers, fixtures}) -> {pass, checks: [{key, ok, got?}]}
 * `state` is the learner's CURRENT lab state for 'state' challenges; answers are raw strings/arrays from the form.
 */
export function grade(id, {state = null, answers = {}, fixtures}) {
  const ch = CHALLENGES.find(c => c.id === id);
  if (!ch) throw new Error(`unknown challenge ${id}`);
  const ref = setupState(fixtures, ch);
  switch (id) {
    case 'c1-tiles': {
      const n = analyse(ref).nets.find(x => x.id === 'ABCD');
      return result([{key: 'count', ok: near(answers.count, n.tiles.length, 0)}, {key: 'share', ok: near(answers.share, n.share)}]);
    }
    case 'c2-edge': {
      const n = analyse(ref).nets[0];
      return result([{key: 'cause', ok: answers.cause === 'right'}, {key: 'share', ok: near(answers.share, n.share)}]);
    }
    case 'c3-sum': {
      const a = analyse(ref);
      return result([{key: 'sum', ok: near(answers.sum, a.metrics.sumDemand)}, {key: 'tile', ok: near(answers.tile, a.demand[2][0])}]);
    }
    case 'c4-move-a': {
      if (!state || state.fixtureId !== 'teacher') return result([{key: 'load', ok: false}]);
      const a = analyse({...state, model: 'P', upto: undefined});
      const others = ['B', 'C', 'D', 'E', 'F'].every(c => same(state.positions[c], ref.positions[c]));
      const ac = a.nets.find(n => n.id === 'AC');
      return result([
        {key: 'predict', ok: near(answers.predict, analyse(makeState(fixtures.teacher, 'boundary')).metrics.sumDemand, 0)},
        {key: 'onlyA', ok: others},
        {key: 'four', ok: ac.tiles.length === 4, got: ac.tiles.length},
        {key: 'conserved', ok: approxEqual(a.metrics.sumDemand, a.totalHpwl), got: a.metrics.sumDemand},
      ]);
    }
    case 'c5-capacity': {
      const picked = new Set(Array.isArray(answers.reasons) ? answers.reasons : []);
      const correct = new Set(['ratio', 'overflow']);
      return result([{key: 'reasons', ok: picked.size === correct.size && [...correct].every(k => picked.has(k))}]);
    }
    case 'c6-no-overflow': {
      if (!state || state.fixtureId !== 'teacher') return result([{key: 'load', ok: false}]);
      const a = analyse({...state, model: 'P', upto: undefined, capacity: 2});
      const close = closePairs(state.positions, state.cells);
      return result([
        {key: 'model', ok: (state.model ?? 'P') === 'P'},
        {key: 'capacity', ok: approxEqual(state.capacity, 2)},
        {key: 'apart', ok: close.length === 0, got: close.length},
        {key: 'noOverflow', ok: approxLE(a.metrics.max, 0), got: a.metrics.max},
      ]);
    }
    case 'c7-model-a': {
      const n = analyse(ref).nets.find(x => x.id === 'ABCD');
      const part = n.parts.find(p => p.i === 1 && p.j === 0);
      return result([{key: 'share', ok: near(answers.share, part.total, 0.006)}]);
    }
    default: throw new Error('unreachable');
  }
}

export {TOLERANCE};
