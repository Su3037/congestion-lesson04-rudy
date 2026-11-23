// Adapter: the old flat API (nets as arrays of pin ids) on top of site/js/domain.js, so the oracles
// (teacher diff, upstream kernels, cross-language, edge cases) and the legacy core tests check the code
// the site actually runs. No arithmetic lives here.
import * as D from '../site/js/domain.js';

const wrap = p => ({...p, nets: p.nets.map((n, k) => Array.isArray(n) ? {id: `n${k}`, pins: n} : n)});
export const {TOLERANCE, approxEqual, RudyInputError, tileIndex, bbox, selectedTiles, zeros, risaWeight} = D;
export const gridOf = p => D.gridOf(p);
// The old API returned {ok, errors[{code}]}; the site's validate throws. Map the codes, keep the meaning.
const CODE = {BAD_GRID: 'grid', GRID_MISMATCH: 'grid', BAD_CAPACITY: 'capacity', BAD_NETLIST: 'net', EMPTY_NET: 'net', DUPLICATE_PIN: 'pin', UNKNOWN_PIN: 'pin', BAD_COORDINATE: 'coord', OUTSIDE: 'outside'};
export const validate = (p, positions, capacity) => {
  try { D.validate(wrap(p), positions, capacity); return {ok: true, errors: []}; }
  catch (e) { if (!(e instanceof D.RudyInputError)) throw e; return {ok: false, errors: [{code: CODE[e.code] ?? e.code, message: e.message}]}; }
};
export const computeDemand = (p, positions, opts = {}) => D.computeDemand(wrap(p), positions, opts);
export const metrics = (demand, capacity, opts) => D.metrics(demand, capacity, opts);
export const totalHpwl = (p, positions) => D.totalHpwl(wrap(p), positions);
export const netInfoP = (net, positions, G) => D.netInfoP(Array.isArray(net) ? {id: 'n', pins: net} : net, positions, G);
export const netInfoA = (net, positions, G) => D.netInfoA(Array.isArray(net) ? {id: 'n', pins: net} : net, positions, G);
export const fracText = (v, maxDen) => D.frac(v, maxDen);
export const num = (v, digits) => D.fmt(v, digits);
