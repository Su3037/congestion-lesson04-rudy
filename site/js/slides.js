// Slide deck drawn from the same data and board as the film and the lab.
// Each slide: { title, draw(lang) -> SVG inner markup, notes }.
// SPDX-License-Identifier: MIT
import * as R from "./rudy.js";
import { boardMarkup, legendMarkup, NET_COLORS } from "./board.js";
import { CODE } from "./film.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 24}" fill="${o.color || "#dfe7fb"}" font-weight="${o.weight || 400}"${o.mono ? ' font-family="JetBrains Mono, Noto Sans SC, monospace"' : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
const lines = (x, y, arr, o = {}) => arr.map((s, n) => txt(x, y + n * (o.gap || 40), s, o)).join("");

export function slides(fx) {
  const spread = fx.presets.spread.positions, cluster = fx.presets.cluster.positions;
  const base = { problem: fx, positions: spread, model: "P", capacity: 2, layer: "none", selectedNet: null };
  const big = (st, lang, g = { x: 70, y: 150, scale: 46 }) => boardMarkup({ ...st, lang }, g).markup;
  const met = (pos, model, C) => R.metrics(R.computeDemand(fx, pos, { model }).demand, C);
  const S = [];
  S.push({ title: { zh: "RUDY 拥塞估计", en: "RUDY congestion estimate" }, draw: (l) => big({ ...base, layer: "demand", show: { ids: false } }, l) + lines(700, 260, l === "zh" ? ["拥塞估计 · 第四课", "矩形均匀布线密度", "课堂模型 P（等份）+ 扩展模型 A（按面积）"] : ["Congestion · Lesson 4", "Rectangular Uniform wire DensitY", "Classroom model P (equal) + extension model A (area)"], { size: 26 }),
    notes: { zh: "本课讲 RUDY：在布线之前，用每条 net 的外接框估计布线需求落在哪些格子里。主线是老师课程中的等份模型 P；模型 A 只作为对照的扩展。", en: "This lesson teaches RUDY: before routing, use each net's bounding box to estimate where routing demand lands. The main line is the teacher's equal-share model P; model A is a labelled comparison only." } });
  S.push({ title: { zh: "为什么只看 HPWL 不够", en: "Why HPWL alone is not enough" }, draw: (l) => big(base, l) + lines(700, 220, fx.nets.map((n) => { const b = R.bbox(n, spread); return `${n.join("–").padEnd(8)} ${R.num(b.w)} + ${R.num(b.h)} = ${R.num(b.w + b.h)}`; }), { mono: true, size: 22, gap: 34 }) + txt(700, 450, (l === "zh" ? "合计 34 —— 却不知道挤在哪里" : "Total 34 — but where does it crowd?"), { color: "#ffd27a", size: 24 }),
    notes: { zh: "HPWL = 框宽 + 框高，是总线长的下界式估计。它是一个总数，不带位置信息。虚线只表示连接关系，不是走线。", en: "HPWL = box width + box height, a lower-bound style wirelength estimate. It is a total with no location. Dashed lines show connections, not routes." } });
  S.push({ title: { zh: "GCell 网格与存储顺序", en: "GCell grid and storage order" }, draw: (l) => big({ ...base, show: { flylines: false }, highlightTile: { i: 2, j: 1 } }, l) + lines(700, 220, l === "zh" ? ["4 列 × 2 行，每格 3 × 4", "格号 = (floor(x/3), floor(y/4))，夹回网格", "demand[x][y]：先列后行", "高亮格 = demand[2][1]", "容量 C = 2（教学单位）"] : ["4 columns × 2 rows, each 3 × 4", "tile = (floor(x/3), floor(y/4)), clamped", "demand[x][y]: column first", "Highlighted = demand[2][1]", "Capacity C = 2 (teaching units)"], { size: 23 }),
    notes: { zh: "注意矩阵顺序：demand[x][y]，不是屏幕的行优先。x=12 这样的右边界坐标会被夹回第 3 列。", en: "Mind the order: demand[x][y], not screen row-major. A coordinate on the far edge such as x=12 is clamped into column 3." } });
  S.push({ title: { zh: "一条 net：框、格、份额", en: "One net: box, tiles, share" }, draw: (l) => big({ ...base, selectedNet: 0, onlySelectedFly: true, showDims: true }, l) + lines(700, 210, ["hpwl = 7 + 0 = 7", "floor(1/3) = 0, floor(8/3) = 2", "tiles = (0,0) (1,0) (2,0)", "share = 7 ÷ 3 = 7/3"], { mono: true, size: 22 }),
    notes: { zh: "选格规则：两个角各自 floor 取格号，再取中间所有格（含两端）。这是老师源码的规则，不是“按面积相交”。", en: "Tile rule: floor each corner to a tile index, then take every tile between them, inclusive. This is the teacher's source rule, not area intersection." } });
  S.push({ title: { zh: "伪代码", en: "Pseudocode" }, draw: (l) => CODE[l].map((c, n) => txt(110, 200 + n * 50, `${n + 1}  ${c}`, { mono: true, size: 26, color: n === 5 ? "#ffd27a" : "#dfe7fb" })).join("") + txt(110, 640, l === "zh" ? "每次计算都从全零开始；容量只出现在最后一行。" : "Every computation starts from zero; capacity appears only in the last line.", { size: 22, color: "#9fb0d3" }),
    notes: { zh: "第 6 行是课堂模型的关键：除以格数，而不是除以面积。重合 pin 时 hpwl=0，份额也是 0。", en: "Line 6 is the classroom model's key step: divide by the tile count, not by area. Coincident pins give hpwl = 0 and a zero share." } });
  S.push({ title: { zh: "边界规则", en: "The boundary rule" }, draw: (l) => big({ problem: { ...fx, nets: [["A", "B"]] }, positions: { A: { x: 1, y: 1 }, B: { x: 3, y: 1 } }, model: "P", capacity: 2, layer: "demand", selectedNet: 0, showDims: true }, l) + lines(700, 220, l === "zh" ? ["(1,1) 到 (3,1)：HPWL 2", "floor(3/3)=1 → 选 2 格，每格 1", "按面积：x=3 那格重叠 0", "重合 pin：HPWL 0 → 加 0"] : ["(1,1) to (3,1): HPWL 2", "floor(3/3)=1 → 2 tiles, 1 each", "By area: the x=3 tile overlaps 0", "Coincident pins: HPWL 0 → add 0"], { size: 23 }),
    notes: { zh: "pin 跨过边界时，选中格会离散跳变，这是规则本身的结果，不是显示误差。", en: "When a pin crosses a boundary, the selected tiles jump discretely. That is the rule itself, not a display artefact." } });
  S.push({ title: { zh: "累加：完整需求图", en: "Accumulation: the full demand map" }, draw: (l) => big({ ...base, layer: "demand" }, l) + lines(700, 220, ["x=0: [37/6, 37/6]", "x=1: [14/3, 25/6]", "x=2: [20/3, 37/6]", "x=3: [0, 0]", "Σ = 34 = Σ HPWL"], { mono: true, size: 22 }) + legendMarkup("demand", 700, 520, 440, l, 2),
    notes: { zh: "这是全部六条 net 加完的结果；只加了一部分时必须标为部分累加。模型 P 的需求总和等于 HPWL 总和。", en: "This is after all six nets; a partial sum must be labelled partial. In model P the sum of demand equals the sum of HPWL." } });
  S.push({ title: { zh: "容量：只改比值和溢出", en: "Capacity changes ratio and overflow only" }, draw: (l) => {
      const m2 = met(spread, "P", 2), m1 = met(spread, "P", 1);
      const h = l === "zh" ? ["", "C = 2", "C = 1"] : ["", "C = 2", "C = 1"];
      const rows = [h, [l === "zh" ? "需求总和" : "Sum of demand", "34", "34"], [l === "zh" ? "总溢出" : "Total overflow", R.fracText(m2.total), R.fracText(m1.total)], [l === "zh" ? "最大溢出" : "Max overflow", R.fracText(m2.max), R.fracText(m1.max)], [l === "zh" ? "溢出格数" : "Tiles over", String(m2.count), String(m1.count)]];
      return big({ ...base, layer: "overflow" }, l) + rows.map((r, n) => txt(700, 230 + n * 44, r[0], { size: 22, color: n ? "#9fb0d3" : "#8fb5ff" }) + txt(990, 230 + n * 44, r[1], { size: 22, anchor: "end", weight: 700 }) + txt(1140, 230 + n * 44, r[2], { size: 22, anchor: "end", weight: 700 })).join("") + legendMarkup("overflow", 700, 520, 440, l);
    }, notes: { zh: "ratio = demand / C，overflow = max(0, demand − C)。容量从 2 改到 1，需求矩阵完全不变。", en: "ratio = demand / C, overflow = max(0, demand − C). From C = 2 to C = 1 the demand matrix is unchanged." } });
  S.push({ title: { zh: "聚集 vs 展开：同一色尺", en: "Cluster vs spread: one legend" }, draw: (l) => {
      const a = met(cluster, "P", 2), b = met(spread, "P", 2);
      const rows = [[l === "zh" ? "C=2" : "C=2", l === "zh" ? "聚集" : "Cluster", l === "zh" ? "展开" : "Spread"], [l === "zh" ? "总 HPWL" : "Total HPWL", "7", "34"], [l === "zh" ? "总溢出" : "Total overflow", R.fracText(a.total), R.fracText(b.total)], [l === "zh" ? "最大溢出" : "Max overflow", R.fracText(a.max), R.fracText(b.max)], [l === "zh" ? "溢出格数" : "Tiles over", String(a.count), String(b.count)], [l === "zh" ? "最挤 25% 平均比值" : "Worst-25% mean ratio", R.num(a.topAvgRatio, 2), R.num(b.topAvgRatio, 2)]];
      return boardMarkup({ ...base, positions: cluster, layer: "overflow", show: { ids: false }, lang: l }, { x: 60, y: 150, scale: 24 }).markup + boardMarkup({ ...base, layer: "overflow", show: { ids: false }, lang: l }, { x: 60, y: 430, scale: 24 }).markup +
        txt(60, 138, l === "zh" ? "聚集" : "Cluster", { size: 20, weight: 700 }) + txt(60, 418, l === "zh" ? "展开" : "Spread", { size: 20, weight: 700 }) +
        rows.map((r, n) => txt(520, 220 + n * 46, r[0], { size: 22, color: n ? "#9fb0d3" : "#8fb5ff" }) + txt(900, 220 + n * 46, r[1], { size: 22, anchor: "end", weight: 700 }) + txt(1100, 220 + n * 46, r[2], { size: 22, anchor: "end", weight: 700 })).join("") +
        txt(520, 540, l === "zh" ? "只有最大溢出偏向展开；其余指标都偏向聚集。" : "Only max overflow favours the spread; every other metric favours the cluster.", { size: 20, color: "#ffd27a" }) + legendMarkup("overflow", 520, 600, 440, l);
    }, notes: { zh: "不要说展开布局“全面更好”。在模型 P 中总需求等于总 HPWL，所以总溢出很大程度上是在量线长。说“更好”之前，先说按哪个指标。", en: "Do not call the spread 'better overall'. In model P total demand equals total HPWL, so total overflow largely measures wirelength. Name the metric before saying 'better'." } });
  S.push({ title: { zh: "模型 P vs 模型 A", en: "Model P vs model A" }, draw: (l) => {
      const p = met(spread, "P", 2), a = met(spread, "A", 2);
      return boardMarkup({ ...base, layer: "demand", show: { ids: false }, lang: l }, { x: 60, y: 150, scale: 24 }).markup + boardMarkup({ ...base, model: "A", layer: "demand", show: { ids: false }, lang: l }, { x: 60, y: 430, scale: 24 }).markup +
        txt(60, 138, l === "zh" ? "P：hpwl ÷ 格数" : "P: hpwl ÷ tiles", { size: 20, weight: 700 }) + txt(60, 418, l === "zh" ? "A：hpwl × 重叠面积 ÷ 框面积" : "A: hpwl × overlap ÷ box area", { size: 20, weight: 700 }) +
        lines(520, 220, l === "zh" ? [`展开，C=2：最大溢出 P ${R.fracText(p.max)}，A ${R.num(a.max, 3)}`, "聚集：两种模型最大溢出都是 5", "→ 按模型 A，最大溢出也偏向聚集", "A 与 DREAMPlace、OpenROAD 的原始代码", "逐格核对一致（非退化框）", "线状 net：P 给正值，A 沿线分配，", "DREAMPlace 给 0，OpenROAD 跳过"] : [`Spread, C=2: max overflow P ${R.fracText(p.max)}, A ${R.num(a.max, 3)}`, "Cluster: max overflow 5 in both models", "→ Under model A, max overflow also favours the cluster", "Model A matches DREAMPlace and OpenROAD code", "tile by tile (non-degenerate boxes)", "Line nets: P positive, A along the line,", "DREAMPlace 0, OpenROAD skips them"], { size: 21, gap: 38 }) + legendMarkup("demand", 520, 600, 440, l, 2);
    }, notes: { zh: "RUDY 是一族方法，离散化方式决定边界情况。DREAMPlace 还会按 pin 数乘 RISA 系数（4 pin 为 1.0828）。", en: "RUDY is a family; the discretisation decides the edge cases. DREAMPlace also multiplies by a RISA factor by pin count (1.0828 for 4 pins)." } });
  S.push({ title: { zh: "能做什么，不能做什么", en: "What it can and cannot do" }, draw: (l) => lines(110, 220, l === "zh" ? ["✓ 毫秒级，适合放进布局循环做反馈", "✗ 不是布线器，不是签核", "✗ 没分水平 / 垂直方向，没分金属层", "✗ 多 pin net 未乘 RISA 系数", "✗ 教学单位，不是轨道数；没校准的物理模型", "✗ 和真实布线拥塞的相关性需要用布线器验证"] : ["✓ Milliseconds: fits in a placement loop as feedback", "✗ Not a router, not sign-off", "✗ No horizontal/vertical split, no metal layers", "✗ No RISA factor for multi-pin nets", "✗ Teaching units, not tracks; no calibrated physical model", "✗ Correlation with routed congestion needs a router to check"], { size: 28, gap: 62 }),
    notes: { zh: "下一步若想验证预测质量：把同一布局交给全局布线器（如 OpenROAD global_route），比较每格的 RUDY 与布线后的使用率。", en: "To test prediction quality: route the same placement with a global router (e.g. OpenROAD global_route) and compare per-tile RUDY with routed usage." } });
  S.push({ title: { zh: "实验与练习", en: "Lab and practice" }, draw: (l) => big({ ...base, layer: "ratio", show: { ids: false } }, l) + lines(700, 220, l === "zh" ? ["实验室：拖动 pin、逐条累加、改容量", "切换模型 P / A，对比同一色尺", "7 道挑战：按实际状态评分", "Python：starter + 参考实现 + 检查器", "参考：Spindler & Johannes, DATE 2007"] : ["Lab: drag pins, step through nets, change capacity", "Switch model P / A on one legend", "7 challenges graded on real state", "Python: starter + reference + checker", "Reference: Spindler & Johannes, DATE 2007"], { size: 23, gap: 46 }) + legendMarkup("ratio", 700, 520, 440, l, 1),
    notes: { zh: "课程素材改编自 yongfu-li/eda-learning（CC BY 4.0，Yongfu Li）。论文图片未转载。", en: "Adapted from yongfu-li/eda-learning (CC BY 4.0, Yongfu Li). No figures from the paper are reproduced." } });
  return S;
}

export function slideSVG(fx, k, lang) {
  const all = slides(fx);
  const s = all[k];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" font-family="Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"><rect width="1280" height="720" fill="#0b1020"/>` +
    `<text x="60" y="90" font-size="40" font-weight="700" fill="#fff">${esc(s.title[lang])}</text>` + s.draw(lang) +
    `<text x="1220" y="690" text-anchor="end" font-size="20" fill="#8fa0c2">${k + 1} / ${all.length}</text>` +
    `<text x="60" y="690" font-size="16" fill="#5b6b8c">${lang === "zh" ? "拥塞估计 · 第四课 · RUDY" : "Congestion · Lesson 4 · RUDY"}</text></svg>`;
}
