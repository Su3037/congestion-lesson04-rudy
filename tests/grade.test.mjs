// Graders: each challenge passes on a correct answer/state, fails on the typical wrong one, and state challenges
// read the learner's actual lab state (any correct arrangement passes).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../site/js/domain.js';
import {CHALLENGES, grade, setupState} from '../site/js/grade.js';

const fixtures = D.prepareFixtures(JSON.parse(readFileSync(new URL('../fixtures/rudy-fixtures.json', import.meta.url))));
const g = (id, o) => grade(id, {fixtures, ...o});
const move = (st, moves) => moves.reduce((s, [c, x, y]) => D.moveCell(s, c, {x, y}).state, st);
const start = id => setupState(fixtures, CHALLENGES.find(c => c.id === id));

test('seven challenges with texts in both languages', async () => {
  assert.equal(CHALLENGES.length, 7);
  const {TEXT} = await import('../site/js/content.js');
  for (const ch of CHALLENGES) for (const l of ['zh', 'en']) {
    const c = TEXT[l].ch[ch.id];
    assert.ok(c?.title && c.goal && c.prompt && c.answer && c.explain && c.hints?.length >= 2, `${l} ${ch.id}`);
  }
});

test('c1 tiles: 6 tiles, 11/6 (fraction or 2-place decimal)', () => {
  assert.ok(g('c1-tiles', {answers: {count: '6', share: '11/6'}}).pass);
  assert.ok(g('c1-tiles', {answers: {count: '6', share: '1.83'}}).pass);
  assert.ok(!g('c1-tiles', {answers: {count: '4', share: '11/4'}}).pass);
});

test('c2 edge: cause "right", share 1', () => {
  assert.ok(g('c2-edge', {answers: {cause: 'right', share: '1'}}).pass);
  assert.ok(!g('c2-edge', {answers: {cause: 'left', share: '2'}}).pass);
});

test('c3 sum: 34 and tile (2, 0) = 20/3', () => {
  assert.ok(g('c3-sum', {answers: {sum: '34', tile: '20/3'}}).pass);
  assert.ok(!g('c3-sum', {answers: {sum: '34', tile: '37/6'}}).pass);
});

test('c4 move A: reads the actual state', () => {
  const st = start('c4-move-a');
  assert.ok(!g('c4-move-a', {state: st, answers: {predict: '34'}}).pass, 'A not moved');
  assert.ok(g('c4-move-a', {state: move(st, [['A', 3, 1]]), answers: {predict: '34'}}).pass);
  assert.ok(g('c4-move-a', {state: move(st, [['A', 3.5, 2]]), answers: {predict: '34'}}).pass, 'another valid position');
  assert.ok(!g('c4-move-a', {state: move(st, [['A', 3, 1], ['B', 9, 1]]), answers: {predict: '34'}}).pass, 'moved another pin');
});

test('c5 capacity: exactly ratio + overflow', () => {
  assert.ok(g('c5-capacity', {answers: {reasons: ['ratio', 'overflow']}}).pass);
  assert.ok(!g('c5-capacity', {answers: {reasons: ['ratio', 'overflow', 'demand']}}).pass);
});

test('c6 no overflow: a spread-out layout passes, the cluster trick fails', () => {
  const st = start('c6-no-overflow');
  assert.ok(!g('c6-no-overflow', {state: st}).pass);
  const good = move(st, [['A', 6, 3], ['B', 6, 4], ['C', 4.5, 3], ['D', 4.5, 4], ['E', 1, 4.5], ['F', 2.5, 2]]);
  assert.ok(g('c6-no-overflow', {state: good}).pass, JSON.stringify(g('c6-no-overflow', {state: good}).checks));
  const piled = move(st, [['A', 4, 2], ['B', 4.2, 2], ['C', 4, 2.2], ['D', 4.2, 2.2], ['E', 4.1, 2.1], ['F', 4.3, 2.1]]);
  assert.ok(!g('c6-no-overflow', {state: piled}).pass, 'pins piled on top of each other');
  assert.ok(!g('c6-no-overflow', {state: {...good, capacity: 10}}).pass, 'raising capacity is not allowed');
});

test('c7 model A: 99/28 within 0.006', () => {
  assert.ok(g('c7-model-a', {answers: {share: '99/28'}}).pass);
  assert.ok(g('c7-model-a', {answers: {share: '3.54'}}).pass);
  assert.ok(!g('c7-model-a', {answers: {share: '11/6'}}).pass);
});
