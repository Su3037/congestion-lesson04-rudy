// Live lab. All numbers come from rudy.js; all drawing from board.js.
// SPDX-License-Identifier: MIT
import * as R from "./rudy.js";
import { boardMarkup, legendMarkup, LEGENDS, NET_COLORS } from "./board.js";
import { CODE } from "./film.js";

const T = {
  zh: {
    preset: "预设", undo: "撤销", reset: "重置", net: "选中 net", none: "（无）", model: "模型", modelP: "P：等份（老师课堂版）", modelA: "A：按重叠面积（扩展）",
    layer: "热图", lnone: "关闭", ldemand: "需求", lratio: "需求/容量", loverflow: "溢出", cap: "容量 C", show: "显示", fly: "连接虚线", bbox: "外接框", tiles: "选中格", share: "单条份额", ids: "格号",
    step: "逐条累加", prev: "上一步", next: "下一步", all: "全部", partial: (k, n) => `部分累加：前 ${k} / ${n} 条（还不是最终需求）`, full: "完整需求（全部 net）",
    metrics: "指标", sum: "需求总和", hpwl: "HPWL 总和", total: "总溢出", max: "最大溢出", count: "溢出格数", top: "最挤 25% 格的平均比值",
    grid: "数值表（行 = y，从上到下；列 = x）", breakdown: "选中格的来源", clickTile: "点击表格或热图中的一格查看来源。", from: "来自",
    pins: "pin 坐标（可直接输入）", clamped: (id) => `pin ${id} 超出芯片，已夹回边界。`, snapA: "存为对比 A", snapB: "存为对比 B", compare: "对比（同一色尺）",
    fromFilm: (s) => `已载入影片 ${s.from.cut === "sample" ? "小样" : "正片"} 第 ${s.from.t.toFixed(2)} 秒（场景 ${s.from.scene}）的状态。`,
    invalid: "输入无效，没有计算：", json: "粘贴自定义 JSON（chip、gcell、nets、positions）", load: "载入", jsonErr: "JSON 无法解析：", stepInfo: (i, n) => `net ${n}：${i.pins.join("–")}，HPWL ${R.num(i.hpwl)}，${i.tiles ? i.tiles.length + " 格，每格 +" + R.fracText(i.share) : i.parts.length + " 格（按面积）"}`,
    kbd: "键盘：Tab 选中 pin，方向键移动 0.5，Shift+方向键移动 0.1。",
  },
  en: {
    preset: "Preset", undo: "Undo", reset: "Reset", net: "Selected net", none: "(none)", model: "Model", modelP: "P: equal shares (teacher's classroom proxy)", modelA: "A: by overlap area (extension)",
    layer: "Heat map", lnone: "Off", ldemand: "Demand", lratio: "Demand/capacity", loverflow: "Overflow", cap: "Capacity C", show: "Show", fly: "Connection lines", bbox: "Bounding box", tiles: "Selected tiles", share: "One-net share", ids: "Tile ids",
    step: "Net by net", prev: "Previous", next: "Next", all: "All", partial: (k, n) => `Partial sum: first ${k} of ${n} nets (not the final demand)`, full: "Full demand (all nets)",
    metrics: "Metrics", sum: "Sum of demand", hpwl: "Total HPWL", total: "Total overflow", max: "Max overflow", count: "Tiles over capacity", top: "Mean ratio of the worst 25% tiles",
    grid: "Number grid (rows = y, top to bottom; columns = x)", breakdown: "Where the selected tile's demand comes from", clickTile: "Click a tile in the grid or heat map.", from: "from",
    pins: "Pin coordinates (type to edit)", clamped: (id) => `Pin ${id} left the chip and was clamped to the edge.`, snapA: "Keep as A", snapB: "Keep as B", compare: "Comparison (one shared legend)",
    fromFilm: (s) => `Loaded the film's ${s.from.cut} state at ${s.from.t.toFixed(2)} s (scene ${s.from.scene}).`,
    invalid: "Invalid input, nothing computed: ", json: "Paste custom JSON (chip, gcell, nets, positions)", load: "Load", jsonErr: "Could not parse JSON: ", stepInfo: (i, n) => `net ${n}: ${i.pins.join("–")}, HPWL ${R.num(i.hpwl)}, ${i.tiles ? i.tiles.length + " tiles, +" + R.fracText(i.share) + " each" : i.parts.length + " tiles (by area)"}`,
    kbd: "Keyboard: Tab to a pin, arrows move 0.5, Shift+arrows move 0.1.",
  },
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function createLab(root, fx, lang = "zh") {
  const L = T[lang];
  const SCALE = 46, GX = 52, GY = 16;
  const st = {
    problem: { chip: fx.chip, gcell: fx.gcell, capacity: fx.capacity, nets: fx.nets },
    positions: clone(fx.presets.spread.positions),
    model: "P", capacity: fx.capacity, layer: "demand", selectedNet: 0, upto: null, tile: null,
    show: { flylines: true, bbox: true, tiles: true, share: true, ids: true, values: true },
    note: "", snapA: null, snapB: null, fromFilm: null,
  };
  const history = [];
  const listeners = [];
  const push = () => { history.push(JSON.stringify({ positions: st.positions, capacity: st.capacity, problem: st.problem })); if (history.length > 100) history.shift(); };

  root.innerHTML = `
  <div class="lab-grid">
    <div class="lab-board">
      <div class="lab-banner" hidden></div>
      <svg class="board" role="application" aria-label="RUDY board"></svg>
      <div class="legend-wrap"><svg class="legend" viewBox="0 0 470 70"></svg></div>
      <p class="hint">${L.kbd}</p>
      <div class="note" aria-live="polite"></div>
    </div>
    <div class="lab-side">
      <fieldset><legend>${L.preset}</legend>
        ${Object.entries(fx.presets).map(([k, p]) => `<button type="button" data-preset="${k}">${esc(p[lang])}</button>`).join("")}
        <button type="button" data-act="undo">${L.undo}</button><button type="button" data-act="reset">${L.reset}</button>
      </fieldset>
      <fieldset><legend>${L.model}</legend>
        <label><input type="radio" name="model" value="P" checked> ${L.modelP}</label>
        <label><input type="radio" name="model" value="A"> ${L.modelA}</label>
      </fieldset>
      <fieldset><legend>${L.layer}</legend>
        ${["none", "demand", "ratio", "overflow"].map((k) => `<label><input type="radio" name="layer" value="${k}" ${k === "demand" ? "checked" : ""}> ${L["l" + k]}</label>`).join("")}
        <label class="cap">${L.cap} <input type="number" name="cap" value="2" step="0.5" min="0.1"></label>
      </fieldset>
      <fieldset><legend>${L.show}</legend>
        ${[["flylines", L.fly], ["bbox", L.bbox], ["tiles", L.tiles], ["share", L.share], ["ids", L.ids]].map(([k, t]) => `<label><input type="checkbox" data-show="${k}" checked> ${t}</label>`).join("")}
        <label>${L.net} <select name="net"><option value="">${L.none}</option>${fx.nets.map((n, k) => `<option value="${k}" ${k === 0 ? "selected" : ""}>${k + 1}: ${n.join("–")}</option>`).join("")}</select></label>
      </fieldset>
      <fieldset class="stepper"><legend>${L.step}</legend>
        <button type="button" data-step="-1">${L.prev}</button><button type="button" data-step="1">${L.next}</button><button type="button" data-step="all">${L.all}</button>
        <div class="step-info" aria-live="polite"></div>
        <pre class="code" tabindex="0"></pre>
      </fieldset>
    </div>
  </div>
  <div class="lab-lower">
    <section><h3>${L.metrics}</h3><table class="metrics"></table>
      <button type="button" data-snap="A">${L.snapA}</button> <button type="button" data-snap="B">${L.snapB}</button></section>
    <section><h3>${L.grid}</h3><table class="numgrid"></table><h3>${L.breakdown}</h3><div class="breakdown">${L.clickTile}</div></section>
    <section><h3>${L.pins}</h3><table class="pins"></table>
      <details><summary>${L.json}</summary><textarea rows="6" class="json" aria-label="JSON"></textarea><button type="button" data-act="json">${L.load}</button></details></section>
  </div>
  <section class="compare" hidden><h3>${L.compare}</h3><div class="cmp"></div></section>`;

  const $ = (s) => root.querySelector(s);
  const svg = $("svg.board");
  const G0 = R.gridOf(fx);
  svg.setAttribute("viewBox", `0 0 ${G0.W * SCALE + GX + 24} ${G0.H * SCALE + GY + 30}`);

  function compute() {
    const prob = { ...st.problem, capacity: st.capacity };
    const v = R.validate(prob, st.positions, st.capacity);
    if (!v.ok) return { error: v.errors };
    const c = R.computeDemand(prob, st.positions, { model: st.model, upto: st.upto ?? undefined });
    const m = R.metrics(c.demand, st.capacity);
    return { c, m };
  }

  function render() {
    const res = compute();
    const prob = st.problem;
    const b = boardMarkup({ problem: prob, positions: st.positions, model: st.model, capacity: st.capacity > 0 ? st.capacity : 1, layer: res.error ? "none" : st.layer, upto: st.upto ?? undefined, selectedNet: st.selectedNet, show: st.show, highlightTile: st.tile, lang, showDims: true }, { x: GX, y: GY, scale: SCALE });
    svg.innerHTML = b.markup;
    svg.querySelectorAll("g.pin").forEach((g) => { g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", `pin ${g.dataset.pin} (${st.positions[g.dataset.pin].x}, ${st.positions[g.dataset.pin].y})`); });
    $("svg.legend").innerHTML = st.layer !== "none" ? legendMarkup(st.layer, 10, 20, 440, lang, st.layer === "ratio" ? 1 : st.layer === "demand" && st.capacity <= LEGENDS.demand.max ? st.capacity : null) : "";
    $(".note").textContent = res.error ? L.invalid + res.error.map((e) => e.msg).join("; ") : st.note;
    $(".note").classList.toggle("err", !!res.error);
    const ban = $(".lab-banner");
    ban.hidden = !st.fromFilm; if (st.fromFilm) ban.textContent = L.fromFilm(st.fromFilm);
    // stepper
    const n = prob.nets.length;
    const k = st.upto ?? n;
    let info = "";
    if (!res.error) {
      info = (st.upto === null ? L.full : L.partial(k, n));
      if (st.upto !== null && k > 0) info += "<br>" + esc(L.stepInfo(res.c.nets[k - 1], k));
      info += `<br>Σ = ${R.fracText(res.c.demand.flat().reduce((a, v) => a + v, 0))}`;
    }
    $(".step-info").innerHTML = info;
    const hl = st.upto === null ? -1 : 6;
    $(".code").innerHTML = CODE[lang].map((l, i) => `<span class="${i === hl ? "hl" : ""}">${i + 1}  ${esc(l)}</span>`).join("\n");
    // metrics
    if (!res.error) {
      const m = res.m;
      $(".metrics").innerHTML = [[L.sum, R.fracText(m.sumDemand)], [L.hpwl, R.num(R.totalHpwl(prob, st.positions))], [L.total, R.fracText(m.total)], [L.max, R.fracText(m.max)], [L.count, m.count], [L.top, R.num(m.topAvgRatio, 3)]].map(([a, v]) => `<tr><th>${a}</th><td>${v}</td></tr>`).join("") + (res.c.partial ? `<tr><td colspan="2" class="warn">${L.partial(k, n)}</td></tr>` : "");
      const D = res.c.demand, G = res.c.G;
      let g = `<tr><th><span class="sr-only">y \\ x</span></th>${Array.from({ length: G.nx }, (_, i) => `<th>x=${i}</th>`).join("")}</tr>`;
      for (let j = G.ny - 1; j >= 0; j--) g += `<tr><th>y=${j}</th>${Array.from({ length: G.nx }, (_, i) => `<td data-i="${i}" data-j="${j}" class="${st.tile && st.tile.i === i && st.tile.j === j ? "sel" : ""} ${D[i][j] - st.capacity > 1e-9 ? "over" : ""}" tabindex="0">${R.fracText(D[i][j])}</td>`).join("")}</tr>`;
      $(".numgrid").innerHTML = g;
      if (st.tile) {
        const list = res.c.contrib[st.tile.i][st.tile.j];
        $(".breakdown").innerHTML = `<b>demand[${st.tile.i}][${st.tile.j}] = ${R.fracText(D[st.tile.i][st.tile.j])}</b><ul>${list.map((c) => `<li style="color:${NET_COLORS[c.net % 8]}">net ${c.net + 1} (${prob.nets[c.net].join("–")}): +${R.fracText(c.amount)}</li>`).join("") || "<li>0</li>"}</ul>`;
      } else $(".breakdown").textContent = L.clickTile;
    } else { $(".metrics").innerHTML = ""; $(".numgrid").innerHTML = ""; }
    $(".pins").innerHTML = `<tr><th>pin</th><th>x</th><th>y</th></tr>` + Object.keys(st.positions).map((id) => `<tr><th>${esc(id)}</th><td><input type="number" step="0.1" data-pin="${esc(id)}" data-ax="x" aria-label="${esc(id)} x" value="${st.positions[id].x}"></td><td><input type="number" step="0.1" data-pin="${esc(id)}" data-ax="y" aria-label="${esc(id)} y" value="${st.positions[id].y}"></td></tr>`).join("");
    renderCompare();
    listeners.forEach((f) => f(api.state()));
  }

  function renderCompare() {
    const sec = root.querySelector(".compare");
    if (!st.snapA && !st.snapB) { sec.hidden = true; return; }
    sec.hidden = false;
    const kind = st.layer === "none" ? "demand" : st.layer;
    const cards = [["A", st.snapA], ["B", st.snapB]].filter(([, s]) => s).map(([name, s]) => {
      const prob = { ...s.problem, capacity: s.capacity };
      const b = boardMarkup({ problem: prob, positions: s.positions, model: s.model, capacity: s.capacity, layer: kind, show: { ids: false, tiles: false, bbox: false }, selectedNet: null, lang }, { x: 30, y: 10, scale: 22 });
      const m = b.met;
      return `<figure><svg viewBox="0 0 320 200">${b.markup}</svg><figcaption>${name} · ${s.model} · C=${s.capacity}<br>${L.total} ${R.fracText(m.total)} · ${L.max} ${R.fracText(m.max)} · ${L.count} ${m.count} · ${L.sum} ${R.fracText(m.sumDemand)}</figcaption></figure>`;
    });
    sec.querySelector(".cmp").innerHTML = cards.join("") + `<svg viewBox="0 0 470 70" class="legend">${legendMarkup(kind, 10, 20, 440, lang)}</svg>`;
  }

  // ----- interaction -----
  function toChip(evt) {
    const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const G = R.gridOf(st.problem);
    return { x: (p.x - GX) / SCALE, y: G.H - (p.y - GY) / SCALE };
  }
  function setPin(id, x, y) {
    const G = R.gridOf(st.problem);
    const cx = Math.min(G.W, Math.max(0, x)), cy = Math.min(G.H, Math.max(0, y));
    st.note = cx !== x || cy !== y ? L.clamped(id) : "";
    st.positions[id] = { x: Math.round(cx * 100) / 100, y: Math.round(cy * 100) / 100 };
    st.fromFilm = null;
  }
  let drag = null;
  svg.addEventListener("pointerdown", (e) => {
    const g = e.target.closest("g.pin");
    if (g) { push(); drag = g.dataset.pin; svg.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    const p = toChip(e); const G = R.gridOf(st.problem);
    if (p.x >= 0 && p.x <= G.W && p.y >= 0 && p.y <= G.H) { st.tile = R.tileIndex(p.x, p.y, G); render(); }
  });
  svg.addEventListener("pointermove", (e) => { if (!drag) return; const p = toChip(e); setPin(drag, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10); render(); });
  const end = () => { drag = null; };
  svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
  svg.addEventListener("keydown", (e) => {
    const g = e.target.closest("g.pin"); if (!g) return;
    const d = e.shiftKey ? 0.1 : 0.5; const id = g.dataset.pin; const p = st.positions[id];
    const mv = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key];
    if (!mv) return;
    e.preventDefault(); push(); setPin(id, Math.round((p.x + mv[0]) * 100) / 100, Math.round((p.y + mv[1]) * 100) / 100); render();
    svg.querySelector(`g.pin[data-pin="${CSS.escape(id)}"]`)?.focus();
  });
  root.addEventListener("click", (e) => {
    const t = e.target;
    if (t.dataset.preset) { push(); st.positions = clone(fx.presets[t.dataset.preset].positions); st.problem = { chip: fx.chip, gcell: fx.gcell, capacity: fx.capacity, nets: fx.nets }; st.note = ""; st.fromFilm = null; render(); }
    if (t.dataset.act === "undo" && history.length) { const h = JSON.parse(history.pop()); Object.assign(st, h); st.note = ""; render(); }
    if (t.dataset.act === "reset") { push(); st.positions = clone(fx.presets.spread.positions); st.problem = { chip: fx.chip, gcell: fx.gcell, capacity: fx.capacity, nets: fx.nets }; st.capacity = 2; st.model = "P"; st.upto = null; st.selectedNet = 0; st.note = ""; st.fromFilm = null; root.querySelector('input[name=cap]').value = 2; render(); }
    if (t.dataset.step) {
      const n = st.problem.nets.length;
      if (t.dataset.step === "all") st.upto = null;
      else { const cur = st.upto ?? n; st.upto = Math.max(0, Math.min(n, cur + Number(t.dataset.step))); if (st.upto === n) st.upto = null; }
      if (st.upto) st.selectedNet = st.upto - 1;
      root.querySelector("select[name=net]").value = st.selectedNet ?? "";
      render();
    }
    if (t.dataset.snap) { st["snap" + t.dataset.snap] = clone({ problem: st.problem, positions: st.positions, model: st.model, capacity: st.capacity }); render(); }
    if (t.dataset.act === "json") {
      try {
        const j = JSON.parse(root.querySelector("textarea.json").value);
        push();
        st.problem = { chip: j.chip, gcell: j.gcell, capacity: j.capacity ?? 2, nets: j.nets };
        st.positions = j.positions || {}; st.selectedNet = null; st.upto = null; st.note = "";
      } catch (err) { st.note = L.jsonErr + err.message; }
      render();
    }
    const td = t.closest && t.closest("td[data-i]");
    if (td) { st.tile = { i: Number(td.dataset.i), j: Number(td.dataset.j) }; render(); }
  });
  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "model") st.model = t.value;
    if (t.name === "layer") st.layer = t.value;
    if (t.name === "cap") { const v = Number(t.value); st.capacity = v; }
    if (t.name === "net") st.selectedNet = t.value === "" ? null : Number(t.value);
    if (t.dataset.show) st.show[t.dataset.show] = t.checked;
    if (t.dataset.pin) { push(); const v = Number(t.value); const p = st.positions[t.dataset.pin]; setPin(t.dataset.pin, t.dataset.ax === "x" ? v : p.x, t.dataset.ax === "y" ? v : p.y); if (!Number.isFinite(v)) st.positions[t.dataset.pin][t.dataset.ax] = NaN; }
    render();
  });

  const api = {
    state: () => clone({ problem: st.problem, positions: st.positions, model: st.model, capacity: st.capacity, selectedNet: st.selectedNet, upto: st.upto, layer: st.layer }),
    computed: () => compute(),
    loadSnapshot(s) {
      push();
      st.problem = clone(s.problem); st.positions = clone(s.positions); st.model = s.model; st.capacity = s.capacity;
      st.selectedNet = s.selectedNet; st.upto = s.upto ?? null; st.layer = s.layer && s.layer !== "none" ? s.layer : "demand"; st.fromFilm = s; st.note = "";
      root.querySelector(`input[name=model][value=${st.model}]`).checked = true;
      root.querySelector(`input[name=layer][value=${st.layer}]`).checked = true;
      root.querySelector("input[name=cap]").value = st.capacity;
      root.querySelector("select[name=net]").innerHTML = `<option value="">${L.none}</option>` + st.problem.nets.map((n, k) => `<option value="${k}">${k + 1}: ${n.join("–")}</option>`).join("");
      root.querySelector("select[name=net]").value = st.selectedNet ?? "";
      render();
    },
    onChange(f) { listeners.push(f); },
    setPositions(p) { push(); st.positions = clone(p); render(); },
  };
  render();
  return api;
}
