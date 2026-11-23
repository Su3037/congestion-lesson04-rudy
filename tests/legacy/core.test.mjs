// Core model tests. Expected values come from the evidence pack and from hand
// arithmetic, written here before they were compared with the code.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fc from "fast-check";
import * as R from "../../oracles/adapter.mjs";

const fx = JSON.parse(fs.readFileSync(new URL("./fixture.json", import.meta.url)));
const spread = fx.presets.spread.positions;
const cluster = fx.presets.cluster.positions;
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const matClose = (A, B, tol = 1e-9) => A.every((col, i) => col.every((v, j) => close(v, B[i][j], tol)));

test("spread fixture demand matches the teacher matrix exactly (column-major)", () => {
  const r = R.computeDemand(fx, spread);
  const want = [[37 / 6, 37 / 6], [14 / 3, 25 / 6], [20 / 3, 37 / 6], [0, 0]];
  assert.ok(matClose(r.demand, want), JSON.stringify(r.demand));
  assert.equal(r.demand.length, 4); // nx columns first
  assert.equal(r.demand[0].length, 2);
});

test("spread metrics at C=2 and C=1", () => {
  const d = R.computeDemand(fx, spread).demand;
  const m2 = R.metrics(d, 2), m1 = R.metrics(d, 1);
  assert.ok(close(m2.total, 22) && close(m2.max, 14 / 3) && m2.count === 6);
  assert.ok(close(m1.total, 28) && close(m1.max, 17 / 3) && m1.count === 6);
  assert.ok(close(m2.sumDemand, 34));
});

test("cluster fixture and metrics", () => {
  const d = R.computeDemand(fx, cluster).demand;
  assert.ok(matClose(d, [[0, 0], [7, 0], [0, 0], [0, 0]]));
  const m2 = R.metrics(d, 2), m1 = R.metrics(d, 1);
  assert.ok(close(m2.total, 5) && close(m2.max, 5) && m2.count === 1);
  assert.ok(close(m1.total, 6) && close(m1.max, 6) && m1.count === 1);
});

test("max and total disagree: spread lowers max overflow but raises total", () => {
  const s = R.metrics(R.computeDemand(fx, spread).demand, 2);
  const c = R.metrics(R.computeDemand(fx, cluster).demand, 2);
  assert.ok(s.max < c.max);
  assert.ok(s.total > c.total);
  assert.ok(R.totalHpwl(fx, spread) === 34 && R.totalHpwl(fx, cluster) === 7);
});

test("model A reverses the max-overflow ranking on the same pins", () => {
  const s = R.metrics(R.computeDemand(fx, spread, { model: "A" }).demand, 2);
  const c = R.metrics(R.computeDemand(fx, cluster, { model: "A" }).demand, 2);
  assert.ok(s.max > c.max, `${s.max} vs ${c.max}`);
});

test("inclusive endpoint-bin rule: (1,1)-(3,1) selects two tiles, 1 each", () => {
  const p = { gcell: fx.gcell, chip: fx.chip, nets: [["P", "Q"]] };
  const r = R.computeDemand(p, { P: { x: 1, y: 1 }, Q: { x: 3, y: 1 } });
  assert.deepEqual(r.nets[0].tiles, [{ i: 0, j: 0 }, { i: 1, j: 0 }]);
  assert.ok(close(r.demand[0][0], 1) && close(r.demand[1][0], 1));
  // model A gives everything to column 0 (zero length inside column 1)
  const a = R.computeDemand(p, { P: { x: 1, y: 1 }, Q: { x: 3, y: 1 } }, { model: "A" });
  assert.ok(close(a.demand[0][0], 2) && close(a.demand[1][0], 0));
});

test("far chip edge clamps into the last tile", () => {
  const G = R.gridOf(fx);
  assert.deepEqual(R.tileIndex(12, 8, G), { i: 3, j: 1 });
  assert.deepEqual(R.tileIndex(0, 0, G), { i: 0, j: 0 });
});

test("vertical and horizontal nets are valid; coincident pins deposit zero", () => {
  const p = { gcell: fx.gcell, chip: fx.chip, nets: [["P", "Q"], ["S", "T"], ["U", "V"]] };
  const pos = { P: { x: 1, y: 1 }, Q: { x: 1, y: 6 }, S: { x: 2, y: 2 }, T: { x: 7, y: 2 }, U: { x: 5, y: 5 }, V: { x: 5, y: 5 } };
  const r = R.computeDemand(p, pos);
  assert.equal(r.nets[0].hpwl, 5); assert.equal(r.nets[0].tiles.length, 2);
  assert.equal(r.nets[1].hpwl, 5); assert.equal(r.nets[1].tiles.length, 3);
  assert.equal(r.nets[2].hpwl, 0); assert.equal(r.nets[2].tiles.length, 1);
  assert.equal(r.demand[1][1], 0);
  const sum = r.demand.flat().reduce((s, v) => s + v, 0);
  assert.ok(close(sum, 10));
});

test("singleton net deposits zero", () => {
  const p = { gcell: fx.gcell, chip: fx.chip, nets: [["P"]] };
  const r = R.computeDemand(p, { P: { x: 4, y: 4 } });
  assert.ok(r.demand.flat().every((v) => v === 0));
});

test("validation rejects malformed input instead of producing NaN", () => {
  const bad = [
    [{ ...fx, nets: [[]] }, spread, "net"],
    [{ ...fx, nets: [["A", "Z"]] }, spread, "pin"],
    [fx, { ...spread, A: { x: NaN, y: 1 } }, "coord"],
    [fx, { ...spread, A: { x: 13, y: 1 } }, "outside"],
    [fx, { ...spread, A: { x: 1, y: -0.5 } }, "outside"],
    [{ ...fx, gcell: { ...fx.gcell, nx: 5 } }, spread, "grid"],
    [{ ...fx, gcell: { ...fx.gcell, nx: 0 } }, spread, "grid"],
  ];
  for (const [p, pos, code] of bad) {
    const v = R.validate(p, pos);
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => e.code === code), `${code}: ${JSON.stringify(v.errors)}`);
    assert.throws(() => R.computeDemand(p, pos), R.RudyInputError);
  }
  for (const C of [0, -1, NaN, Infinity]) {
    assert.throws(() => R.metrics([[1]], C), R.RudyInputError);
    assert.equal(R.validate(fx, spread, C).ok, false);
  }
});

test("partial accumulation is labelled partial and equals the prefix sum", () => {
  const p3 = R.computeDemand(fx, spread, { upto: 3 });
  assert.equal(p3.partial, true);
  const full = R.computeDemand(fx, spread);
  assert.equal(full.partial, false);
  const s3 = p3.demand.flat().reduce((s, v) => s + v, 0);
  assert.ok(close(s3, 7 + 7 + 4));
});

test("selected-tile breakdown sums to the tile's demand", () => {
  const r = R.computeDemand(fx, spread);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++)
    assert.ok(close(r.contrib[i][j].reduce((s, c) => s + c.amount, 0), r.demand[i][j]));
});

// ---------- property-based tests (fast-check, fixed seed) ----------
const SEED = 20261123;
const coord = (max) => fc.oneof(
  fc.integer({ min: 0, max }),                      // includes tile boundaries and far edge
  fc.double({ min: 0, max, noNaN: true, noDefaultInfinity: true }),
);
const posArb = fc.record(Object.fromEntries(fx.pins.map((p) => [p, fc.record({ x: coord(12), y: coord(8) })])));
const netsArb = fc.array(fc.uniqueArray(fc.constantFrom(...fx.pins), { minLength: 1, maxLength: 6 }), { minLength: 0, maxLength: 8 });
const opts = { seed: SEED, numRuns: 400 };

test("property: conservation (sum demand = sum HPWL) in both models", () => {
  fc.assert(fc.property(posArb, netsArb, (pos, nets) => {
    const p = { ...fx, nets };
    const h = R.totalHpwl(p, pos);
    for (const model of ["P", "A"]) {
      const s = R.computeDemand(p, pos, { model }).demand.flat().reduce((a, b) => a + b, 0);
      if (!close(s, h, 1e-7)) return false;
    }
    return true;
  }), opts);
});

test("property: model A directional sums equal Σ width and Σ height", () => {
  fc.assert(fc.property(posArb, netsArb, (pos, nets) => {
    const p = { ...fx, nets };
    const r = R.computeDemand(p, pos, { model: "A" });
    const sw = nets.reduce((s, n) => s + R.bbox(n, pos).w, 0);
    const sh = nets.reduce((s, n) => s + R.bbox(n, pos).h, 0);
    return close(r.H.flat().reduce((a, b) => a + b, 0), sw, 1e-7) && close(r.V.flat().reduce((a, b) => a + b, 0), sh, 1e-7);
  }), opts);
});

test("property: capacity never changes demand; metrics are consistent", () => {
  fc.assert(fc.property(posArb, netsArb, fc.double({ min: 0.1, max: 20, noNaN: true }), (pos, nets, C) => {
    const p = { ...fx, nets };
    const d1 = R.computeDemand(p, pos).demand;
    const m = R.metrics(d1, C);
    const d2 = R.computeDemand(p, pos).demand;
    if (!matClose(d1, d2, 0)) return false;
    const tot = d1.flat().reduce((s, v) => s + Math.max(0, v - C), 0);
    return close(m.total, tot, 1e-7) && m.count === d1.flat().filter((v) => v - C > 1e-9).length;
  }), opts);
});

test("property: net order does not matter; duplicating a net doubles its share", () => {
  fc.assert(fc.property(posArb, netsArb, (pos, nets) => {
    const p = { ...fx, nets };
    const a = R.computeDemand(p, pos).demand;
    const b = R.computeDemand({ ...fx, nets: nets.slice().reverse() }, pos).demand;
    if (!matClose(a, b, 1e-9)) return false;
    const c = R.computeDemand({ ...fx, nets: nets.concat(nets) }, pos).demand;
    return matClose(c, a.map((col) => col.map((v) => 2 * v)), 1e-9);
  }), opts);
});

test("property: mirror symmetry holds for model A and for model P off tile boundaries", () => {
  const off = fc.record(Object.fromEntries(fx.pins.map((p) => [p, fc.record({
    x: fc.double({ min: 0.01, max: 11.99, noNaN: true }).filter((v) => Math.abs(v / 3 - Math.round(v / 3)) > 1e-6),
    y: fc.double({ min: 0.01, max: 7.99, noNaN: true }).filter((v) => Math.abs(v / 4 - Math.round(v / 4)) > 1e-6),
  })])));
  fc.assert(fc.property(off, netsArb, (pos, nets) => {
    const p = { ...fx, nets };
    const mir = Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, { x: 12 - v.x, y: v.y }]));
    for (const model of ["P", "A"]) {
      const a = R.computeDemand(p, pos, { model }).demand;
      const b = R.computeDemand(p, mir, { model }).demand;
      if (!matClose(a, b.slice().reverse(), 1e-7)) return false;
    }
    return true;
  }), opts);
});

test("model P mirror symmetry breaks on a boundary (documented, not a bug)", () => {
  const p = { gcell: fx.gcell, chip: fx.chip, nets: [["P", "Q"]] };
  const a = R.computeDemand(p, { P: { x: 1, y: 1 }, Q: { x: 3, y: 1 } }).demand;
  const b = R.computeDemand(p, { P: { x: 11, y: 1 }, Q: { x: 9, y: 1 } }).demand;
  assert.notDeepEqual(a, b.slice().reverse());
});

test("fracText prints teaching fractions", () => {
  assert.equal(R.fracText(37 / 6), "37/6");
  assert.equal(R.fracText(7), "7");
  assert.equal(R.risaWeight(4), 1.0828);
});
