// Timeline: clocks of all four films, random-access determinism, cue boundaries, numbers vs goldens, handoff,
// captions, the music-locked title and the lab walkthrough.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as D from '../site/js/domain.js';
import {stateAt, validateClock, cueIndexAt, labHandoff, frameAt, frameTime} from '../site/js/timeline.js';
import {Scene} from '../site/js/scene.js';

const raw = p => readFileSync(new URL(`../${p}`, import.meta.url));
const read = p => JSON.parse(raw(p));
const fixtures = D.prepareFixtures(read('fixtures/rudy-fixtures.json'));
const index = read('site/data/films/index.json');
const FILMS = {};
for (const e of index) for (const lang of ['zh', 'en']) {
  const script = read(`site/data/films/${e.id}.json`), clock = read(`site/data/films/${e.id}.clock.${lang}.json`);
  const walk = e.id === 'lab' && existsSync(new URL(`../site/data/walk/${lang}.json`, import.meta.url)) ? read(`site/data/walk/${lang}.json`) : null;
  FILMS[`${e.id}.${lang}`] = {id: e.id, lang, script, clock, walk, at: t => stateAt(t, fixtures, script, clock, {walk})};
}
const F = (id, lang = 'zh') => FILMS[`${id}.${lang}`];
const seg = (f, scene) => {
  const i = f.script.cues.findIndex(c => (c.scene ?? c.id) === scene);
  assert.ok(i >= 0, `${f.id} has no scene ${scene}`);
  return f.clock.segments[i];
};
const end = (f, scene) => f.at(seg(f, scene).sceneEnd - 0.05);

test('index lists the four films in house order, each with a zh and an en version', () => {
  assert.deepEqual(index.map(e => e.id), ['story', 'concise', 'advanced', 'lab']);
  assert.deepEqual(index.map(e => e.kind), ['music', 'voice', 'reading', 'voice']);
  for (const e of index) for (const l of ['zh', 'en']) assert.equal(e.langs[l].clock, `data/films/${e.id}.clock.${l}.json`);
});

test('clocks are contiguous, ordered like their scripts and built from the current source scripts', () => {
  for (const f of Object.values(FILMS)) {
    assert.equal(validateClock(f.clock, f.script, {allowProvisional: true}), true);
    assert.deepEqual(f.script, read(`content/films/${f.id}.json`));
    assert.equal(f.clock.scriptSha256, createHash('sha256').update(raw(`content/films/${f.id}.json`)).digest('hex'));
    assert.deepEqual(f.clock.violations, []);
  }
  // reading and music films share one clock across languages; voice films have one per language
  for (const id of ['story', 'advanced']) assert.deepEqual(F(id, 'zh').clock.segments, F(id, 'en').clock.segments);
  assert.equal(F('story').clock.duration, 189.823);
});

test('voice films are final: every line has a measured take, and zh and en clocks differ', () => {
  for (const id of ['concise', 'lab']) for (const lang of ['zh', 'en']) {
    const c = F(id, lang).clock;
    assert.equal(c.provisional, false, `${id}.${lang} is provisional: voice takes missing`);
    assert.equal(validateClock(c, F(id, lang).script), true);
    for (const s of c.segments) for (const L of s.lines) {
      assert.ok(L.voice && L.voiceDuration > 0, `${id}.${lang} ${s.id}`);
      assert.ok(L.voiceAt >= L.start && L.voiceAt + L.voiceDuration <= L.end + 1e-6, `${id}.${lang} ${s.id}: take overruns its line`);
    }
  }
  assert.notDeepEqual(F('concise', 'zh').clock.segments, F('concise', 'en').clock.segments);
});

test('random access: direct, out-of-order and repeated calls give identical states', () => {
  for (const f of Object.values(FILMS)) {
    const d = f.clock.duration;
    const times = [0, 2, d * 0.13, d * 0.4, d * 0.77, d - 0.01, d];
    const fresh = times.map(t => JSON.stringify(f.at(t)));
    for (const t of [...times].reverse()) f.at(t);
    times.forEach((t, i) => assert.equal(JSON.stringify(f.at(t)), fresh[i], `${f.id}.${f.lang} t=${t}`));
    assert.equal(Scene(f.at(d * 0.4), f.script, {lang: f.lang}), Scene(f.at(d * 0.4), f.script, {lang: f.lang}));
  }
});

test('cue boundaries are half-open and every frame belongs to exactly one cue', () => {
  for (const f of Object.values(FILMS)) {
    const {clock} = f;
    for (let i = 1; i < clock.segments.length; i++) {
      assert.equal(f.at(clock.segments[i].start).cueId, clock.segments[i].id);
      assert.equal(f.at(clock.segments[i].start - 1e-6).cueId, clock.segments[i - 1].id);
    }
    const fps = 30, frames = Math.round(clock.duration * fps);
    let last = -1;
    for (let fr = 0; fr < frames; fr++) {
      const i = cueIndexAt(frameTime(fr, fps), clock);
      assert.ok(i >= last); last = i;
      assert.equal(frameAt(frameTime(fr, fps), fps), fr);
    }
    assert.equal(last, clock.segments.length - 1);
  }
});

const M = st => st.metrics.metrics;
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('numbers shown at the end of each motion match the hand-computed goldens', () => {
  for (const lang of ['zh', 'en']) {
    const c = F('concise', lang), a = F('advanced', lang), s = F('story', lang);
    const one = end(c, 'deposit');
    assert.equal(one.metrics.upto, 1); assert.ok(near(M(one).sumDemand, 11));
    for (const f of [c, s]) {
      const acc = end(f, f === c ? 'accumulate' : 'accumulate_story');
      assert.ok(near(M(acc).sumDemand, 34) && near(M(acc).total, 22) && near(M(acc).max, 14 / 3) && M(acc).count === 6);
    }
    const cap = end(c, 'capacity');
    assert.equal(cap.board.capacity, 1); assert.ok(near(M(cap).total, 28) && near(M(cap).max, 17 / 3));
    const edge = end(a, 'edge_move');
    assert.ok(near(M(edge).sumDemand, 3) && M(edge).count === 1);
    const bnd = end(a, 'boundary_teacher');
    assert.ok(near(M(bnd).max, 29 / 6) && near(M(bnd).sumDemand, 34));
    assert.deepEqual(end(a, 'compare').boardsMetrics.map(m => Math.round(m.metrics.total * 1e9) / 1e9), [22, 5]);
    const ma = end(a, 'modelA');
    assert.equal(ma.board.model, 'A'); assert.ok(near(M(ma).max, 5.535714285714286));
    const cl = end(s, 'cluster_story');
    assert.ok(near(M(cl).total, 5) && near(M(cl).max, 5) && M(cl).count === 1);
  }
});

test('demand is conserved at every frame of the accumulate cue (partial maps sum to the HPWL added so far)', () => {
  for (const f of [F('concise'), F('story')]) {
    const sg = seg(f, f.id === 'story' ? 'accumulate_story' : 'accumulate');
    for (let t = sg.start; t < sg.sceneEnd; t += 0.1) {
      const st = f.at(t), m = st.metrics;
      const added = m.nets.slice(0, m.upto).reduce((x, n) => x + n.hpwl, 0);
      assert.ok(near(m.metrics.sumDemand, added), `${f.id} t=${t}`);
    }
  }
});

test('handoff carries the actual coordinates, model, capacity, layer and step of the frame', () => {
  const a = F('advanced');
  const st = end(a, 'boundary_teacher');
  const h = labHandoff(st);
  assert.deepEqual(h.positions, st.board.positions);
  assert.deepEqual(h.positions.A, {x: 3, y: 1});
  const re = D.analyse({...D.makeState(fixtures[h.fixtureId], 'spread'), positions: h.positions, model: h.model, capacity: h.capacity, upto: h.upto});
  assert.ok(near(re.metrics.max, M(st).max));
  const ma = labHandoff(end(a, 'modelA'));
  assert.equal(ma.model, 'A');
  assert.equal(labHandoff(end(F('concise'), 'capacity')).capacity, 1);
  assert.equal(labHandoff(end(a, 'limits')), null, 'the synthetic chip is not a lab fixture');
});

test('captions: every line is shown inside its window and not outside it', () => {
  for (const f of Object.values(FILMS)) {
    for (const s of f.clock.segments) s.lines.forEach((L, i) => {
      const line = f.script.cues.find(c => c.id === s.id).lines[i];
      const st = f.at((L.start + L.end) / 2);
      if (line.zh || line.en) assert.equal(st.caption?.id, `${s.id}-${i + 1}`, `${f.id}.${f.lang} ${s.id}-${i + 1}`);
      else assert.equal(st.caption, null);
    });
    assert.equal(f.at(0.1).caption, null, `${f.id}: lead-in before the first caption`);
  }
});

test('story film: cues sit on the music, and the title assembles one piece per drum hit', () => {
  const f = F('story');
  f.script.cues.forEach((c, i) => { if (i > 0) assert.equal(f.clock.segments[i].start, c.at); });
  const hits = f.clock.track.hits;
  assert.ok(hits.length >= 5 && hits.every(h => h >= f.clock.track.sections.roll - 0.05 && h <= f.clock.track.sections.lock + 0.05));
  const title = seg(f, 'title_story');
  assert.ok(title.start <= hits[0] && title.sceneEnd > hits.at(-1));
  const before = Scene(f.at(hits[1] - 0.02), f.script, {lang: 'zh'}), after = Scene(f.at(hits[1] + 0.02), f.script, {lang: 'zh'});
  assert.notEqual(before, after, 'a drum hit changes the title');
});

test('lab walkthrough: every cue draws a recorded screenshot of the real page, and there is nothing to hand off', () => {
  for (const lang of ['zh', 'en']) {
    const f = F('lab', lang);
    assert.ok(f.walk, `site/data/walk/${lang}.json missing (run node scripts/record-walk.mjs)`);
    for (const s of f.clock.segments) {
      const st = f.at((s.start + s.sceneEnd) / 2);
      assert.equal(st.board, null);
      assert.equal(labHandoff(st), null);
      assert.ok(st.walk?.img.startsWith(`data/walk/${lang}-${s.id}-`), `${lang} ${s.id}`);
      assert.ok(existsSync(new URL(`../site/${st.walk.img}`, import.meta.url)));
      assert.ok(st.walk.cursor.every(Number.isFinite));
    }
  }
});
