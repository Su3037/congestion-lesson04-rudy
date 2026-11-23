// Live RUDY lab. Draws with the shared Board() and recomputes with domain.js after every edit.
import {Board, geometry, boundsOf, boardGeometryOptions, netColor, escapeText as E} from './board.js';
import {makeState, moveCell, analyse, clone, fmt, frac, closePairs, parseNumber} from './domain.js';
import {setupState} from './grade.js';

const W = 900, H = 690;

export function createLab(root, {fixtures, text, lang, onChange = () => {}}) {
  const L = text.lab;
  let st = makeState(fixtures.teacher, 'spread', {selectedNet: 'ABCD'});
  let ui = {showAll: false, focusCell: 'A', snap: 0.5, message: '', banner: '', challenge: null, values: true};
  const undo = [], redo = [];
  let challengeSpec = null;

  root.innerHTML = `
  <div class="lab-controls">
    <label>${L.fixture} <select data-k="fixture">${Object.values(fixtures).map(f => `<option value="${f.id}">${E(f.title[lang])}</option>`).join('')}</select></label>
    <span class="presets" data-k="presets"></span>
    <fieldset class="mode"><legend>${L.model}</legend><label><input type="radio" name="lab-model" value="P"> ${L.modelP}</label><label><input type="radio" name="lab-model" value="A"> ${L.modelA}</label></fieldset>
    <label>${L.layer} <select data-k="layer"></select></label>
    <label>${L.capacity} <input data-k="cap" type="number" min="0.25" step="0.25" inputmode="decimal"></label>
    <label><input type="checkbox" data-k="showAll"> ${L.boxes}</label>
    <label><input type="checkbox" data-k="values"> ${L.values}</label>
    <label>${L.snap} <select data-k="snap"><option value="1">1</option><option value="0.5">0.5</option><option value="0.25">0.25</option><option value="0">${L.snapOff}</option></select></label>
  </div>
  <div class="lab-banner" data-k="banner" hidden></div>
  <div class="lab-main">
    <div class="lab-board" data-k="board"></div>
    <div class="lab-side">
      <div class="lab-total" data-k="total"></div>
      <div class="lab-nets" data-k="nets" role="group" aria-label="${E(L.net)}"></div>
      <div class="lab-formula" data-k="formula"></div>
      <div class="lab-row"><button type="button" data-a="step">${L.step}</button><button type="button" data-a="all">${L.all}</button><span data-k="steplog" class="scanlog"></span></div>
      <div class="lab-row cell-edit"><label>${L.cell} <select data-k="cell"></select></label>
        <label>${L.x} <input data-k="x" type="number" step="0.25" inputmode="decimal"></label><label>${L.y} <input data-k="y" type="number" step="0.25" inputmode="decimal"></label>
        <button type="button" data-a="apply">${L.apply}</button></div>
      <div class="lab-row"><button type="button" data-a="undo">${L.undo}</button><button type="button" data-a="redo">${L.redo}</button><button type="button" data-a="reset">${L.reset}</button><button type="button" data-a="export">${L.export}</button></div>
      <p class="lab-status" data-k="status" aria-live="polite"></p>
      <div class="table-wrap"><table class="contrib" data-k="table"></table></div>
      <div class="table-wrap"><table class="contrib" data-k="tiles"></table></div>
    </div>
  </div>`;
  const $ = k => root.querySelector(`[data-k="${k}"]`);
  const boardEl = $('board');

  function commit(next, message = '') {
    undo.push(clone(st)); if (undo.length > 200) undo.shift();
    redo.length = 0;
    st = next; ui.message = message;
    render();
  }

  function view() {
    return {...st, showBoxes: ui.showAll ? 'all' : 'selected',
      highlights: {values: ui.values, exact: st.model === 'P', tilesOf: st.selectedNet, coords: true, dimOthers: false, overflowMarks: st.layer !== 'overflow' && st.layer !== 'H' && st.layer !== 'V', corners: st.model === 'P' && st.selectedNet ? 1 : 0}};
  }

  function render(keepFocus = false) {
    const a = analyse(st);
    const m = a.metrics;
    const hadFocus = keepFocus || (document.activeElement && boardEl.contains(document.activeElement));
    boardEl.innerHTML = Board(view(), {width: W, height: H, interactive: true, id: 'lab-board-svg', lang, focusCell: ui.focusCell});
    if (hadFocus) boardEl.querySelector(`[data-cell="${ui.focusCell}"]`)?.focus({preventScroll: true});
    $('fixture').value = st.fixtureId;
    const fx = fixtures[st.fixtureId];
    $('presets').innerHTML = Object.keys(fx.placements).map(p => `<button type="button" data-preset="${p}" class="${st.placement === p ? 'on' : ''}">${E(L.presetName[p] ?? p)}</button>`).join('');
    root.querySelectorAll('input[name="lab-model"]').forEach(r => { r.checked = r.value === st.model; });
    const layers = ['demand', 'ratio', 'overflow', ...(st.model === 'A' ? ['H', 'V'] : [])];
    $('layer').innerHTML = layers.map(l => `<option value="${l}" ${l === st.layer ? 'selected' : ''}>${E(L.layers[l])}</option>`).join('');
    if (document.activeElement !== $('cap')) $('cap').value = st.capacity;
    $('showAll').checked = ui.showAll; $('values').checked = ui.values; $('snap').value = String(ui.snap);
    $('nets').innerHTML = st.nets.map((n, i) => `<button type="button" data-net="${n.id}" aria-pressed="${n.id === st.selectedNet}" style="--c:${netColor(n.id, i)}">${n.id}</button>`).join('');
    $('cell').innerHTML = st.cells.map(c => `<option ${c === ui.focusCell ? 'selected' : ''}>${c}</option>`).join('');
    const p = st.positions[ui.focusCell];
    if (document.activeElement !== $('x')) $('x').value = p ? +p.x.toFixed(4) : '';
    if (document.activeElement !== $('y')) $('y').value = p ? +p.y.toFixed(4) : '';
    const sel = a.selected;
    const show = v => (st.model === 'P' ? frac(v) : fmt(v, 3));
    $('total').innerHTML = `<span>${L.totalOverflow}</span><b>${show(m.total)}</b><span>${L.maxOverflow}</span><b>${show(m.max)}</b><span>${L.sum}</span><b>${show(m.sumDemand)}</b>`;
    $('formula').innerHTML = sel ? (st.model === 'P'
      ? `<b style="color:${netColor(sel.id)}">${sel.id}</b>: HPWL = ${fmt(sel.bbox.w)} + ${fmt(sel.bbox.h)} = <b>${fmt(sel.hpwl)}</b> · ${L.tiles} (${sel.lo.i}, ${sel.lo.j}) → (${sel.hi.i}, ${sel.hi.j}) = ${sel.tiles.length} · ${L.each} <b>${frac(sel.share)}</b>`
      : `<b style="color:${netColor(sel.id)}">${sel.id}</b>: HPWL = <b>${fmt(sel.hpwl)}</b> · ${L.area} ${fmt(sel.bbox.w * sel.bbox.h)} · ${sel.parts.map(q => `(${q.i}, ${q.j}) ${fmt(q.total, 3)}`).join(' · ')}`) : '';
    const th = text.th;
    $('table').innerHTML = `<thead><tr><th>${th.net}</th><th>${th.pins}</th><th>${th.hpwl}</th><th>${th.tiles}</th><th>${th.share}</th></tr></thead><tbody>${a.nets.map((n, i) => `<tr data-net="${n.id}" class="${n.id === st.selectedNet ? 'sel' : ''}${st.upto !== undefined && i >= st.upto ? ' off' : ''}"><td><span class="nettag" style="--c:${netColor(n.id, i)}">${n.id}</span></td><td>${n.pins.join(' ')}</td><td>${fmt(n.hpwl, 4)}</td><td>${n.tiles.length}</td><td>${st.model === 'P' ? frac(n.share) : '—'}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">${L.totalHpwl}</td><td><b>${fmt(a.totalHpwl, 4)}</b></td><td colspan="2"></td></tr></tfoot>`;
    const rows = [];
    for (let j = a.G.ny - 1; j >= 0; j--) for (let i = 0; i < a.G.nx; i++) rows.push(`<tr class="${m.overflow[i][j] > 0 ? 'chg' : ''}"><td>(${i}, ${j})</td><td>${show(a.demand[i][j])}</td><td>${fmt(m.ratio[i][j], 3)}</td><td>${show(m.overflow[i][j])}</td><td class="small">${a.contrib[i][j].map(c => c.net).join(' ')}</td></tr>`);
    $('tiles').innerHTML = `<thead><tr><th>${th.tile}</th><th>${th.demand}</th><th>${th.ratio}</th><th>${th.overflow}</th><th>${th.from}</th></tr></thead><tbody>${rows.join('')}</tbody>`;
    const status = [];
    if (ui.message) status.push(ui.message);
    status.push(L.live(show(m.total), show(m.max), m.count));
    if (st.upto !== undefined && st.upto < st.nets.length) status.push(L.partial(st.upto, st.nets.length));
    const close = closePairs(st.positions, st.cells);
    if (close.length) status.push(L.close(close.length));
    $('status').textContent = status.join(' · ');
    const banner = [ui.banner, ui.challenge ? L.challenge(text.ch[ui.challenge].title) : ''].filter(Boolean).join(' ');
    $('banner').hidden = !banner; $('banner').textContent = banner;
    $('steplog').textContent = st.upto === undefined ? '' : L.stepLog(st.upto, st.nets.length);
    onChange(st);
  }

  // ---- pointer drag (mouse, pen, touch) ----
  let drag = null;
  const toWorld = (clientX, clientY) => {
    const svg = boardEl.querySelector('svg');
    const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return geometry(boundsOf(st), boardGeometryOptions(W, H)).toWorld(q);
  };
  const snap = v => (ui.snap > 0 ? Math.round(v / ui.snap) * ui.snap : v);
  boardEl.addEventListener('pointerdown', e => {
    const g = e.target.closest('[data-cell]'); if (!g) return;
    ui.focusCell = g.dataset.cell;
    drag = {cell: g.dataset.cell, before: clone(st), id: e.pointerId};
    try { boardEl.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    e.preventDefault();
    render(true);
  });
  boardEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const w = toWorld(e.clientX, e.clientY);
    const r = moveCell(st, drag.cell, {x: snap(w.x), y: snap(w.y)});
    if (r.ok) { st = r.state; ui.message = ''; render(true); }
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const before = drag.before; drag = null;
    if (JSON.stringify(before.positions) !== JSON.stringify(st.positions)) {
      undo.push(before); redo.length = 0;
      const d = analyse(st).metrics.total - analyse(before).metrics.total;
      ui.message = `${L.totalOverflow} ${Math.abs(d) < 1e-9 ? '±0' : (d > 0 ? '+' : '−') + fmt(Math.abs(d), 3)}`;
      render(true);
    }
  };
  boardEl.addEventListener('pointerup', endDrag);
  boardEl.addEventListener('pointercancel', endDrag);

  // ---- keyboard ----
  boardEl.addEventListener('keydown', e => {
    const g = e.target.closest('[data-cell]'); if (!g) return;
    const c = g.dataset.cell;
    const step = e.shiftKey ? 0.25 : e.altKey ? 1 : (ui.snap || 0.25);
    const dir = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]}[e.key];
    if (dir) {
      e.preventDefault();
      const p = st.positions[c];
      const r = moveCell(st, c, {x: p.x + dir[0] * step, y: p.y + dir[1] * step});
      ui.focusCell = c;
      if (r.ok) commit(r.state, r.reason === 'clamped' ? L.clamped : '');
      boardEl.querySelector(`[data-cell="${c}"]`)?.focus({preventScroll: true});
    } else if (e.key === 'Tab' && !e.shiftKey && st.cells.indexOf(c) < st.cells.length - 1 || e.key === 'Tab' && e.shiftKey && st.cells.indexOf(c) > 0) {
      e.preventDefault();
      ui.focusCell = st.cells[st.cells.indexOf(c) + (e.shiftKey ? -1 : 1)];
      render(true);
    }
  });
  boardEl.addEventListener('focusin', e => { const g = e.target.closest('[data-cell]'); if (g && g.dataset.cell !== ui.focusCell) { ui.focusCell = g.dataset.cell; render(true); } });

  // ---- controls ----
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    if (b.dataset.preset) { ui.banner = ''; return commit(makeState(fixtures[st.fixtureId], b.dataset.preset, {model: st.model, layer: st.layer, capacity: st.capacity, selectedNet: st.selectedNet})); }
    if (b.dataset.net) { st = {...st, selectedNet: st.selectedNet === b.dataset.net ? null : b.dataset.net}; return render(); }
    const a = b.dataset.a;
    if (a === 'undo' && undo.length) { redo.push(clone(st)); st = undo.pop(); ui.message = ''; render(); }
    if (a === 'redo' && redo.length) { undo.push(clone(st)); st = redo.pop(); ui.message = ''; render(); }
    if (a === 'reset') { ui.banner = ''; commit(challengeSpec ? setupState(fixtures, challengeSpec) : makeState(fixtures[st.fixtureId], Object.keys(fixtures[st.fixtureId].placements)[0], {selectedNet: st.selectedNet})); }
    if (a === 'step') {
      const k = st.upto === undefined || st.upto >= st.nets.length ? 1 : st.upto + 1;
      st = {...st, upto: k, selectedNet: st.nets[k - 1].id}; render();
    }
    if (a === 'all') { st = {...st, upto: undefined}; render(); }
    if (a === 'apply') {
      const r = moveCell(st, ui.focusCell, {x: Number($('x').value), y: Number($('y').value)});
      if (!r.ok) { ui.message = r.reason; render(); } else commit(r.state, r.reason === 'clamped' ? L.clamped : '');
    }
    if (a === 'export') {
      const an = analyse(st);
      const json = JSON.stringify({fixtureId: st.fixtureId, model: st.model, capacity: st.capacity, positions: st.positions, demand: an.demand, totalOverflow: an.metrics.total, maxOverflow: an.metrics.max}, null, 1);
      try { navigator.clipboard.writeText(json).then(() => { ui.message = L.copied; render(); }, () => {}); } catch { /* clipboard unavailable */ }
    }
  });
  $('table').addEventListener('click', e => { const tr = e.target.closest('tr[data-net]'); if (tr) { st = {...st, selectedNet: tr.dataset.net}; render(); } });
  $('fixture').addEventListener('change', e => { const fx = fixtures[e.target.value]; ui.challenge = null; challengeSpec = null; ui.banner = ''; ui.focusCell = fx.cells[0]; commit(makeState(fx, Object.keys(fx.placements)[0], {selectedNet: fx.nets.at(-1).id})); });
  $('cell').addEventListener('change', e => { ui.focusCell = e.target.value; render(); });
  $('showAll').addEventListener('change', e => { ui.showAll = e.target.checked; render(); });
  $('values').addEventListener('change', e => { ui.values = e.target.checked; render(); });
  $('snap').addEventListener('change', e => { ui.snap = Number(e.target.value); render(); });
  $('layer').addEventListener('change', e => { st = {...st, layer: e.target.value}; render(); });
  $('cap').addEventListener('change', e => {
    const c = parseNumber(e.target.value);
    if (!(c > 0)) { ui.message = L.badCap; e.target.value = st.capacity; return render(); }
    commit({...st, capacity: c}, '');
  });
  root.querySelectorAll('input[name="lab-model"]').forEach(r => r.addEventListener('change', e => {
    const layer = e.target.value === 'P' && (st.layer === 'H' || st.layer === 'V') ? 'demand' : st.layer;
    commit({...st, model: e.target.value, layer});
  }));

  render();
  return {
    getState: () => clone(st),
    /** Take the film's actual state (positions, model, capacity, layer, net). Nothing is replaced by a preset. */
    load(h) {
      const fx = fixtures[h.fixtureId];
      const s = makeState(fx, Object.keys(fx.placements)[0], {positions: clone(h.positions), placement: 'film', model: h.model, capacity: h.capacity, layer: h.layer, upto: h.upto, selectedNet: h.selectedNet});
      ui.challenge = null; challengeSpec = null;
      ui.banner = L.fromFilm(h.time, h.cueId) + (h.intermediate ? ' ' + L.intermediate : '');
      ui.focusCell = fx.cells.includes(ui.focusCell) ? ui.focusCell : fx.cells[0];
      commit(s);
    },
    setup(ch) {
      challengeSpec = ch; ui.challenge = ch.id; ui.banner = '';
      ui.focusCell = 'A';
      commit(setupState(fixtures, ch));
    },
    activeChallenge: () => ui.challenge,
  };
}
