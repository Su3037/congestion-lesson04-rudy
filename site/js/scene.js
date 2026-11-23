// Film scene composition: board(s) + panel + caption for one semantic state. Used by render.html
// (frame export) and by the in-page scene preview. Pure string output from state; no timing logic here.
import {Board, escapeText as E, netColor, cellColor} from './board.js';
import {fmt, frac} from './domain.js';

const TXT = {
  zh: {
    brand: 'Su3037 · Congestion Lesson 04', titleSub: '矩形均匀布线密度：布线之前，先估计哪里会挤', titleWords: ['R', 'U', 'D', 'Y'],
    notes: {
      problem: ['布局：决定每个引脚的位置', '布线：画出真实导线（慢，代价高）', 'RUDY：布线之前，估计哪里会挤'],
      limits: ['估计，不是布线结果', '容量分方向、分金属层', '多引脚线网更长（RISA 系数）', '长处：快，适合布局时的反馈'],
    },
    grid: ['芯片 12 × 8，切成 4 × 2 个格（GCell）', '每格宽 3、高 4；存成 demand[x][y]', '容量 C = 2：每格能承受的布线量'],
    total: '总和', hpwl: 'HPWL', tiles: '格', share: '每格', w: '宽', h: '高', lo: '左下角 → 格', hi: '右上角 → 格', count: '选中',
    deposit: {rule: '格下标 = 向下取整，再夹到网格内', edge: 'x = 3 压在边线上：⌊3 ÷ 3⌋ = 1，归右边一格'},
    accum: {net: '线网', add: '每格加', n: '格', partial: '部分累加，还不是最终需求', sum: '八格之和 = HPWL 总和'},
    m: {cap: '容量', total: '总溢出', max: '最大溢出', count: '溢出格数', sum: '需求总和', ref: '对比', was: '原来'},
    compare: {spread: '展开', cluster: '聚集', P: '模型 P', A: '模型 A', verdictP: '按总量：聚集更好；按最挤一格：展开更好', verdictA: '换成模型 A：最挤一格也是聚集更好——排序反过来了'},
    edge: {inside: 'Q 在格 0 内：1 格', online: 'Q 压在 x = 3：2 格', rightEdge: 'Q 在 x = 12：夹回最后一列', len: '长度', each: '每格'},
    modelA: ['按重叠面积分：份额 = HPWL × 重叠 / 盒子面积', '盒子中间分得多，边角分得少', '水平 = 宽 × 重叠 / 面积；垂直 = 高 × 重叠 / 面积'],
    code: ['validate(grid, C, nets, pins)     // 网格、容量、引脚都要合法', 'demand ← 0（nx × ny）', 'for net in nets:', '    box ← 包围盒；lo, hi ← 两个角所在的格', '    for 格 in lo..hi:  demand[格] += HPWL / 格数', 'ratio ← demand / C；overflow ← max(0, demand − C)'],
    summary: ['一个线网，一个盒子：盒子里的格子平分它的 HPWL', '需求守恒：图的总和 = HPWL 总和；容量只改变比值与溢出', '模型 P 与按面积的模型 A 结论可能不同：报告时写明模型'],
    story: {
      hook: ['还没有路，只有出行', '每趟出行：一个起点，一个终点', '哪里会堵？'],
      box: ['一趟出行 → 一个矩形', '平均摊进它盖住的每个街区'],
      chip: ['约 160 个线网（示意）', '每走一步重算一次', '每个线网只看一个盒子', '不布线，不分层', '布线前的预报', '布线后，热点还在吗？'],
    },
    end: {lab: '实验台 · 挑战 · Python 练习', site: 'su3037.github.io/congestion-lesson04-rudy', credit: '音乐：We Never (Remix)（若如初见）· Hi Noise / 秋成 · 不属于本课程授权'},
  },
  en: {
    brand: 'Su3037 · Congestion Lesson 04', titleSub: 'Rectangular Uniform wire DensitY: estimate the crowding before routing', titleWords: ['R', 'U', 'D', 'Y'],
    notes: {
      problem: ['Placement: where each pin goes', 'Routing: draws the real wires (slow, costly)', 'RUDY: estimates the crowding before routing'],
      limits: ['an estimate, not a routing result', 'real capacity: per direction and layer', 'multi-pin nets run longer (RISA)', 'its strength: fast feedback for placement'],
    },
    grid: ['chip 12 × 8, cut into 4 × 2 tiles (GCells)', 'each tile 3 wide, 4 tall; stored demand[x][y]', 'capacity C = 2: what one tile can carry'],
    total: 'total', hpwl: 'HPWL', tiles: 'tiles', share: 'each', w: 'width', h: 'height', lo: 'lower-left → tile', hi: 'upper-right → tile', count: 'selected',
    deposit: {rule: 'tile index = round down, then clamp into the grid', edge: 'x = 3 sits on an edge: ⌊3 ÷ 3⌋ = 1, the tile on the right'},
    accum: {net: 'net', add: 'adds', n: 'tiles', partial: 'partial sum, not the final demand', sum: 'sum of 8 tiles = total HPWL'},
    m: {cap: 'capacity', total: 'total overflow', max: 'max overflow', count: 'tiles over', sum: 'sum of demand', ref: 'vs.', was: 'was'},
    compare: {spread: 'spread', cluster: 'cluster', P: 'model P', A: 'model A', verdictP: 'By total, cluster wins; by the worst tile, spread wins', verdictA: 'Under model A the worst tile also favours cluster: the ranking flips'},
    edge: {inside: 'Q inside tile 0: 1 tile', online: 'Q on x = 3: 2 tiles', rightEdge: 'Q at x = 12: clamped into the last column', len: 'length', each: 'each'},
    modelA: ['share by overlap: HPWL × overlap / box area', 'middle tiles get more, corners less', 'horizontal = w × overlap / area; vertical = h × overlap / area'],
    code: ['validate(grid, C, nets, pins)     // grid, capacity and pins must be valid', 'demand ← 0 (nx × ny)', 'for net in nets:', '    box ← bounding box; lo, hi ← tiles of its corners', '    for tile in lo..hi:  demand[tile] += HPWL / #tiles', 'ratio ← demand / C;  overflow ← max(0, demand − C)'],
    summary: ['One net, one box: its tiles share its HPWL equally', 'Demand is conserved: the map sums to total HPWL; capacity only changes ratio and overflow', 'Model P and area-weighted model A can disagree: always state the model'],
    story: {
      hook: ['no roads yet, only trips', 'each trip: one start, one end', 'where will it jam?'],
      box: ['one trip → one rectangle', 'spread evenly over the blocks it covers'],
      chip: ['about 160 nets (illustration)', 'redrawn at every step', 'one box per net', 'no routing, no layers', 'a forecast before routing', 'after routing: still hot?'],
    },
    end: {lab: 'Lab · Challenges · Python practice', site: 'su3037.github.io/congestion-lesson04-rudy', credit: 'Music: We Never (Remix) · Hi Noise / Qiucheng · not covered by the course licence'},
  },
};

const tag = (id, i) => `<span class="nettag" style="--c:${netColor(id, i)}">${E(id)}</span>`;
const ctag = id => `<span class="celltag" style="--c:${cellColor(id)}">${E(id)}</span>`;
const num = v => `<b class="num">${E(v)}</b>`;
const ORDER = ['AB', 'CD', 'AC', 'BD', 'ABCD', 'EF'];
const idx = id => ORDER.indexOf(id);

const WALK = {zh: {step: (i, n) => `第 ${i} 步，共 9 步`, missing: '（实验台截图尚未录制：运行 scripts/record-walk.mjs）'}, en: {step: (i, n) => `Step ${i} of 9`, missing: '(Lab screenshots not recorded yet: run scripts/record-walk.mjs)'}};
const CURSOR = '<path d="M0 0 L0 30 L8 23 L13.5 35 L18.5 33 L13 21.5 L23 21.5 Z" fill="#fffdf8" stroke="#0b1b1f" stroke-width="2" stroke-linejoin="round"/>';
function walkStage(state, lang) {
  const w = state.walk;
  if (!w) return `<div class="walk-stage"><div class="walk-missing">${E(WALK[lang].missing)}</div></div>`;
  const W = 1380, H = Math.round(W * w.viewport.h / w.viewport.w), k = W / w.viewport.w;
  const [cx, cy] = w.cursor ?? [w.viewport.w / 2, w.viewport.h / 2];
  const ring = w.click == null ? '' : `<circle cx="${(cx * k).toFixed(1)}" cy="${(cy * k).toFixed(1)}" r="${(10 + 34 * w.click).toFixed(1)}" fill="none" stroke="#ddbd78" stroke-width="3" opacity="${(1 - w.click).toFixed(3)}"/>`;
  return `<div class="walk-stage"><div class="walk-chrome"><i></i><i></i><i></i><span>su3037.github.io/congestion-lesson04-rudy/${lang === 'en' ? '?lang=en' : ''}</span></div>
    <div class="walk-shot" style="width:${W}px;height:${H}px"><img src="${E(w.img)}" width="${W}" height="${H}" alt="">
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${ring}<g transform="translate(${(cx * k).toFixed(1)} ${(cy * k).toFixed(1)})">${CURSOR}</g></svg></div></div>`;
}

function metricRows(t, m, ref, refLabel) {
  const row = (k, v, r) => `<tr class="on"><td>${E(t.m[k])}</td>${ref ? `<td>${E(r)}</td>` : ''}<td>${num(v)}</td></tr>`;
  return `<table class="tbl">${ref ? `<tr><th></th><th>${E(refLabel)}</th><th>${t.total === '总和' ? '现在' : 'now'}</th></tr>` : ''}
    ${row('cap', fmt(m.capacity), ref && fmt(ref.metrics.capacity))}${row('sum', frac(m.sumDemand), ref && frac(ref.metrics.sumDemand))}
    ${row('total', frac(m.total), ref && frac(ref.metrics.total))}${row('max', frac(m.max), ref && frac(ref.metrics.max))}${row('count', String(m.count), ref && String(ref.metrics.count))}</table>`;
}

const PANELS = {
  walk: (s, t) => `<p class="walk-step num">${E(WALK[s.lang].step(Number(s.panel.step.slice(1)), 9))}</p>`,
  title(s, t) {
    const n = s.panel.shown === undefined ? Infinity : s.panel.shown;
    const head = t.titleWords.map((w, i) => `<span class="${i < n ? 'on' : 'off'}">${E(w)}</span>`).join('');
    const on = i => (n > i ? 1 : 0);
    return `<div class="title-card"><div class="kicker">${E(s.filmTitle)}</div><h1 class="latin">${head}</h1><div class="hpwl" style="opacity:${on(4)}">${s.lang === 'zh' ? '拥塞估计 · 第 4 课' : 'Congestion · Lesson 4'}</div>
    <p style="opacity:${on(5)}">${E(t.titleSub)}</p></div>`;
  },
  story(s, t) {
    let out = `<ul class="story">${t.story[s.panel.set].map((x, i) => `<li class="${i < s.panel.reveal ? 'on' : 'off'}">${E(x)}</li>`).join('')}</ul>`;
    const sel = s.metrics.selected;
    if (s.panel.set === 'box' && s.panel.reveal >= 2 && sel) out += `<div class="eq big">${fmt(sel.hpwl)} ÷ ${sel.tiles.length} = ${num(frac(sel.share))}</div>`;
    return out;
  },
  end: (s, t) => `<div class="end-card"><div class="kicker">${E(s.filmTitle)}</div><h1>${E(t.end.lab)}</h1><p class="site">${E(t.end.site)}</p><p class="credit ${s.panel.credit ? 'on' : 'off'}">${E(t.end.credit)}</p></div>`,
  notes: (s, t) => `<ul class="notes">${t.notes[s.panel.set].map((x, i) => `<li class="${i < s.panel.reveal ? 'on' : 'off'}">${E(x)}</li>`).join('')}</ul>${s.panel.set === 'problem' && s.panel.reveal >= 2 && s.metrics.totalHpwl !== undefined ? `<div class="eq">HPWL ${t.total} = ${s.metrics.nets.map(n => fmt(n.hpwl)).join(' + ')} = ${num(fmt(s.metrics.totalHpwl))}</div>` : ''}`,
  grid: (s, t) => `<ul class="notes">${t.grid.map((x, i) => `<li class="${i < s.panel.reveal ? 'on' : 'off'}">${E(x)}</li>`).join('')}</ul>${s.panel.reveal >= 2 ? `<div class="eq">demand[2][1] → x ∈ [6, 9], y ∈ [4, 8]</div>` : ''}`,
  net(s, t) {
    const n = s.metrics.nets.find(x => x.id === s.panel.net), b = n.bbox;
    let out = `<div class="pinlist">${n.pins.map(p => `${ctag(p)} (${fmt(s.board.positions[p].x)}, ${fmt(s.board.positions[p].y)})`).join('<br>')}</div>`;
    out += `<div class="eq">${t.w} = ${fmt(b.x1)} − ${fmt(b.x0)} = ${num(fmt(b.w))}</div><div class="eq">${t.h} = ${fmt(b.y1)} − ${fmt(b.y0)} = ${num(fmt(b.h))}</div><div class="eq big">HPWL = ${num(fmt(n.hpwl))}</div>`;
    if (s.panel.step >= 1) out += `<div class="kv"><span>${E(t.lo)} (${n.lo.i}, ${n.lo.j})</span><span>${E(t.hi)} (${n.hi.i}, ${n.hi.j})</span></div>`;
    if (s.panel.step >= 2) out += `<div class="eq">${t.count}: ${n.hi.i - n.lo.i + 1} × ${n.hi.j - n.lo.j + 1} = ${num(String(n.tiles.length))} ${t.tiles}</div>`;
    return out;
  },
  deposit(s, t) {
    const n = s.metrics.nets.find(x => x.id === s.panel.net);
    let out = `<div class="sub">${tag(n.id, idx(n.id))} HPWL ${fmt(n.hpwl)} · ${n.tiles.length} ${t.tiles}</div><div class="eq big">${fmt(n.hpwl)} ÷ ${n.tiles.length} = ${num(frac(n.share))}</div>`;
    out += `<table class="tbl">${n.tiles.map(tl => `<tr class="on"><td>(${tl.i}, ${tl.j})</td><td>+${frac(n.share)}</td></tr>`).join('')}</table>`;
    if (s.panel.rule) out += `<div class="note on">${E(t.deposit.rule)}</div>`;
    if (s.panel.edge) out += `<div class="warn on">${E(t.deposit.edge)}</div>`;
    return out;
  },
  accum(s, t) {
    const rows = s.metrics.nets.map((n, i) => `<tr class="${i < s.panel.upto ? (i === s.panel.upto - 1 && !s.panel.sum ? 'cur' : 'on') : 'off'}"><td>${tag(n.id, i)}</td><td>${fmt(n.hpwl)}</td><td>${n.tiles.length}</td><td>+${frac(n.share)}</td></tr>`).join('');
    const foot = s.panel.sum ? `<div class="eq big">${t.accum.sum}: ${num(frac(s.metrics.metrics.sumDemand))}</div>` : `<div class="warn on">${E(t.accum.partial)}</div>`;
    return `<table class="tbl"><tr><th>${t.accum.net}</th><th>HPWL</th><th>${t.accum.n}</th><th>${t.accum.add}</th></tr>${rows}</table>${foot}`;
  },
  metrics(s, t) {
    const m = s.metrics.metrics;
    const ref = s.reference ?? null;
    const label = s.panel.compareTo ? `${t.m.was} (${s.panel.compareTo})` : `${t.m.cap} ${ref ? fmt(ref.metrics.capacity) : ''}`;
    let out = metricRows(t, m, ref, label);
    if (s.panel.show >= 3) out += `<div class="eq big">${t.m.sum} = ${num(frac(m.sumDemand))} = HPWL ${t.total}</div>`;
    return out;
  },
  compare(s, t) {
    const [a, b] = s.boardsMetrics;
    const key = {sum: 'sumDemand', total: 'total', max: 'max', count: 'count'};
    const r = (k, f) => `<tr class="on"><td>${E(t.m[k])}</td><td>${num(f(a.metrics[key[k]]))}</td><td>${num(f(b.metrics[key[k]]))}</td></tr>`;
    const f = s.panel.model === 'A' ? (v => fmt(v)) : frac;
    return `<div class="sub">${E(t.compare[s.panel.model])}</div><table class="tbl"><tr><th></th><th>${t.compare.spread}</th><th>${t.compare.cluster}</th></tr>${r('sum', f)}${r('total', f)}${r('max', f)}${r('count', String)}</table>
    <div class="note ${s.panel.verdict ? 'on' : 'off'}">${E(s.panel.model === 'A' ? t.compare.verdictA : t.compare.verdictP)}</div>`;
  },
  edge(s, t) {
    const n = s.metrics.nets[0];
    return `<div class="pinlist">${n.pins.map(p => `${ctag(p)} (${fmt(s.board.positions[p].x)}, ${fmt(s.board.positions[p].y)})`).join('<br>')}</div>
    <div class="kv"><span>${t.edge.len} ${num(fmt(n.hpwl))}</span><span>${n.tiles.length} ${t.tiles}</span><span>${t.edge.each} ${num(frac(n.share))}</span></div>
    <div class="note on">${E(t.edge[s.panel.which])}</div>${s.panel.which === 'online' ? `<div class="eq">⌊3 ÷ 3⌋ = ${num('1')}</div>` : s.panel.which === 'rightEdge' ? `<div class="eq">⌊12 ÷ 3⌋ = 4 → min(4, 3) = ${num('3')}</div>` : `<div class="eq">⌊2.5 ÷ 3⌋ = ${num('0')}</div>`}`;
  },
  modelA(s, t) {
    let out = `<ul class="notes">${t.modelA.map((x, i) => `<li class="${i <= s.panel.step ? 'on' : 'off'}">${E(x)}</li>`).join('')}</ul>`;
    if (s.panel.step === 1) {
      const n = s.metrics.nets.find(x => x.id === s.panel.net);
      out += `<table class="tbl">${n.parts.map(q => `<tr class="on"><td>(${q.i}, ${q.j})</td><td>${fmt(n.hpwl)} × ${fmt(q.overlap)} / ${fmt(n.bbox.w * n.bbox.h)}</td><td>${num(fmt(q.total))}</td></tr>`).join('')}</table>`;
    } else out += `<div class="eq">${t.m.sum} = ${num(fmt(s.metrics.metrics.sumDemand))}</div>`;
    return out;
  },
  code(s, t) {
    const active = {0: [0], 2: [2, 3, 4], 5: [5]}[s.panel.line];
    const code = t.code.map((line, i) => `<div class="${active.includes(i) ? 'hl' : ''}"><i>${i + 1}</i>${E(line)}</div>`).join('');
    const run = s.panel.upto ? `<div class="eq">Σ demand = ${num(frac(s.metrics.metrics.sumDemand))}</div>` : '';
    return `<pre class="code">${code}</pre>${run}`;
  },
  summary: (s, t) => `<ol class="summary">${t.summary.map((x, i) => `<li class="${i < s.panel.reveal ? 'on' : 'off'}">${E(x)}</li>`).join('')}</ol>`,
};

export function Scene(state, script, {lang = 'zh', captions = true} = {}) {
  const t = TXT[lang];
  const cue = script.cues[state.cueIndex];
  const chapter = script.chapters[state.chapter][lang];
  const s = {...state, lang, filmTitle: script.title[lang]};
  let boards;
  if (state.panel.kind === 'walk') {
    boards = walkStage(state, lang);
  } else if (state.boards) {
    const names = state.panel.kind === 'modelA' ? [t.compare.A + ' · H', t.compare.A + ' · V'] : [t.compare.spread, t.compare.cluster];
    boards = `<div class="boards two">${state.boards.map((b, i) => `<figure><figcaption>${E(names[i])}</figcaption>${Board(b, {width: 560, height: 470, id: `film-board-${i}`, lang, compact: true})}</figure>`).join('')}</div>`;
  } else if (state.layout === 'wide') {
    boards = `<div class="boards wide">${Board(state.board, {width: 1160, height: 820, id: 'film-board', lang})}</div>`;
  } else {
    boards = `<div class="boards one ${state.layout === 'title' ? 'faded' : ''}">${Board(state.board, {width: 840, height: 640, id: 'film-board', lang})}</div>`;
  }
  const panel = PANELS[state.panel.kind](s, t);
  const cap = captions && state.caption ? `<div class="caption"><div class="shade"></div><p class="main">${E(state.caption[lang])}</p>${lang === 'zh' && state.caption.en ? `<p class="second">${E(state.caption.en)}</p>` : ''}</div>` : '';
  const narrow = state.boards || state.layout === 'wide';
  const walkLayout = state.panel.kind === 'walk' ? ' walk' : '';
  return `<section class="film-frame layout-${state.layout}" data-cue="${state.cueId}" lang="${lang === 'zh' ? 'zh-CN' : 'en'}"><header><span class="brand">${E(t.brand)}</span><span class="chap">${E(chapter)}</span><span class="film">${E(script.title[lang].split(' · ')[0])}</span></header>${boards}<div class="panel ${narrow ? 'narrow' : ''}${walkLayout}"><h2>${E(cue.title[lang])}</h2>${panel}</div>${cap}</section>`;
}
