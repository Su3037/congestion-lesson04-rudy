// Behavioural tests of the RUDY domain used by the page, the films and the grader, against hand-computed goldens.
// (tests/legacy/core.test.mjs runs the earlier core suite through oracles/adapter.mjs on the same code.)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../site/js/domain.js';

const FX = D.prepareFixtures(JSON.parse(readFileSync(new URL('../fixtures/rudy-fixtures.json', import.meta.url))));
const T = FX.teacher, E = FX.edge;
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const mat = (A, B) => A.length === B.length && A.every((c, i) => c.every((v, j) => near(v, B[i][j])));
const an = (fx, pl, o = {}) => D.analyse(D.makeState(fx, pl, o));

test('spread layout, model P: demand map, conservation and metrics at C = 2 and C = 1', () => {
  const a = an(T, 'spread');
  assert.ok(mat(a.demand, [[37 / 6, 37 / 6], [14 / 3, 25 / 6], [20 / 3, 37 / 6], [0, 0]]), JSON.stringify(a.demand));
  assert.equal(a.totalHpwl, 34); assert.ok(near(a.metrics.sumDemand, 34));
  assert.ok(near(a.metrics.total, 22) && near(a.metrics.max, 14 / 3) && a.metrics.count === 6);
  const c1 = an(T, 'spread', {capacity: 1}).metrics;
  assert.ok(near(c1.total, 28) && near(c1.max, 17 / 3) && c1.count === 6);
  assert.ok(mat(an(T, 'spread', {capacity: 1}).demand, a.demand), 'capacity never changes demand');
});

test('per-net tiles and shares in the worked table', () => {
  const n = Object.fromEntries(an(T, 'spread').nets.map(x => [x.id, x]));
  assert.deepEqual([n.AB.hpwl, n.AB.tiles.length], [7, 3]); assert.ok(near(n.AB.share, 7 / 3));
  assert.deepEqual([n.AC.hpwl, n.AC.tiles.length, n.AC.share], [4, 2, 2]);
  assert.deepEqual([n.ABCD.hpwl, n.ABCD.tiles.length], [11, 6]); assert.ok(near(n.ABCD.share, 11 / 6));
  assert.deepEqual(n.ABCD.lo, {i: 0, j: 0}); assert.deepEqual(n.ABCD.hi, {i: 2, j: 1});
  assert.deepEqual([n.EF.hpwl, n.EF.tiles.length, n.EF.share], [1, 2, 0.5]);
});

test('cluster and boundary layouts', () => {
  const c = an(T, 'cluster');
  assert.ok(mat(c.demand, [[0, 0], [7, 0], [0, 0], [0, 0]]));
  assert.ok(near(c.metrics.total, 5) && near(c.metrics.max, 5) && c.metrics.count === 1);
  const b = an(T, 'boundary');
  assert.ok(mat(b.demand, [[10 / 3, 17 / 3], [19 / 3, 17 / 3], [41 / 6, 37 / 6], [0, 0]]));
  assert.ok(near(b.metrics.max, 29 / 6) && near(b.metrics.sumDemand, 34));
  const n = Object.fromEntries(b.nets.map(x => [x.id, x]));
  assert.equal(n.AB.tiles.length, 2); assert.equal(n.AC.tiles.length, 4);
});

test('edge rule: round down, then clamp', () => {
  const G = D.gridOf(E);
  assert.deepEqual(D.tileIndex(3, 1, G), {i: 1, j: 0});
  assert.deepEqual(D.tileIndex(12, 8, G), {i: 3, j: 1});
  assert.deepEqual(D.tileIndex(2.999, 3.999, G), {i: 0, j: 0});
  const one = pl => an(E, pl).nets[0];
  assert.deepEqual([one('inside').tiles.length, one('inside').share], [1, 1.5]);
  assert.deepEqual([one('online').tiles.length, one('online').share], [2, 1]);
  assert.deepEqual(one('rightEdge').tiles, [{i: 3, j: 1}]); assert.equal(one('rightEdge').share, 3);
  assert.deepEqual([one('same').hpwl, one('same').tiles.length, one('same').share], [0, 1, 0]);
});

test('model A: area-weighted shares, H + V = total, conservation', () => {
  const a = an(T, 'spread', {model: 'A'});
  assert.ok(mat(a.demand.map(c => c.map(v => Math.round(v * 1000) / 1000)), [[7.357, 3.786], [7.536, 4.179], [7.357, 3.786], [0, 0]]));
  assert.ok(near(a.metrics.max, 5.535714285714286));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) assert.ok(near(a.H[i][j] + a.V[i][j], a.demand[i][j]));
  assert.ok(near(a.metrics.sumDemand, 34));
  const part = a.nets.find(n => n.id === 'ABCD').parts.find(p => p.i === 1 && p.j === 0);
  assert.ok(near(part.total, 99 / 28));
});

test('partial accumulation sums to the HPWL of the nets added so far', () => {
  for (let k = 0; k <= 6; k++) {
    const a = an(T, 'spread', {upto: k});
    assert.ok(near(a.metrics.sumDemand, a.nets.slice(0, k).reduce((s, n) => s + n.hpwl, 0)));
    assert.equal(a.partial, k < 6);
  }
});

test('invalid input raises a coded error, never a reassuring map', () => {
  const s = D.makeState(T, 'spread');
  const bad = [
    [{...s, nets: [{id: 'X', pins: []}]}, s.positions, 'EMPTY_NET'],
    [{...s, nets: [{id: 'X', pins: ['A', 'Z']}]}, s.positions, 'UNKNOWN_PIN'],
    [{...s, nets: [{id: 'X', pins: ['A', 'A']}]}, s.positions, 'DUPLICATE_PIN'],
    [s, {...s.positions, A: {x: NaN, y: 1}}, 'BAD_COORDINATE'],
    [s, {...s.positions, A: {x: 13, y: 1}}, 'OUTSIDE'],
    [s, {...s.positions, Z: {x: 13, y: 1}}, 'OUTSIDE'],
    [{...s, gcell: {...s.gcell, nx: 5}}, s.positions, 'GRID_MISMATCH'],
    [{...s, gcell: {...s.gcell, nx: 0}}, s.positions, 'BAD_GRID'],
  ];
  for (const [p, pos, code] of bad) assert.throws(() => D.computeDemand(p, pos), e => e instanceof D.RudyInputError && e.code === code, code);
  for (const C of [0, -1, NaN, Infinity]) assert.throws(() => D.metrics([[1]], C), D.RudyInputError);
});

test('moves are clamped to the chip and never mutate the input', () => {
  const s = D.makeState(T, 'spread');
  const r = D.moveCell(s, 'A', {x: 20, y: -3});
  assert.deepEqual(r.state.positions.A, {x: 12, y: 0}); assert.equal(r.reason, 'clamped');
  assert.deepEqual(s.positions.A, {x: 1, y: 1});
  assert.equal(D.moveCell(s, 'Q', {x: 1, y: 1}).ok, false);
});

test('answers parse as fractions or decimals; display fractions are exact', () => {
  assert.ok(near(D.parseNumber('11/6'), 11 / 6)); assert.equal(D.parseNumber('1,5'), 1.5); assert.ok(Number.isNaN(D.parseNumber('abc')));
  assert.equal(D.frac(37 / 6), '37/6'); assert.equal(D.frac(22), '22');
});

test('close pin pairs for challenge 6', () => {
  const s = D.makeState(T, 'cluster');
  assert.ok(D.closePairs(s.positions, s.cells).length > 0);
  assert.equal(D.closePairs(D.makeState(T, 'spread').positions, s.cells).length, 0);
});
