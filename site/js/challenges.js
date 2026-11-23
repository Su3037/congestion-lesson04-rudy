// Challenges graded on actual lab state or on a computed answer. Several
// answers can be correct; grading checks the property, not one coordinate set.
// SPDX-License-Identifier: MIT
import * as R from "./rudy.js";

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const parseNum = (s) => {
  s = String(s).trim().replace(/[，,\s]/g, "");
  const m = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  return s === "" ? NaN : Number(s);
};
const same = (p, q) => Object.keys(q).every((k) => p[k] && near(p[k].x, q[k].x) && near(p[k].y, q[k].y));
const minSep = (pos) => { const v = Object.values(pos); let m = Infinity; for (let a = 0; a < v.length; a++) for (let b = a + 1; b < v.length; b++) m = Math.min(m, Math.hypot(v[a].x - v[b].x, v[a].y - v[b].y)); return m; };

export function challenges(fx) {
  const spread = fx.presets.spread.positions;
  const G = R.gridOf(fx);
  const std = (s) => s.problem.nets.length === fx.nets.length && JSON.stringify(s.problem.nets) === JSON.stringify(fx.nets) && JSON.stringify(s.problem.gcell) === JSON.stringify(fx.gcell);
  return [
    {
      id: "c1-tile", kind: "lab", cat: { zh: "格号", en: "Tile index" }, diff: 1,
      goal: { zh: "会用 floor 和夹紧求 pin 所在的格。", en: "Find a pin's tile with floor and clamping." },
      task: { zh: "在实验室里把 pin F 放进格 (3,0)，其他 pin 保持展开参考的位置。", en: "In the lab, put pin F in tile (3,0); keep the other pins at the spread reference." },
      hints: [{ zh: "格 (3,0) 是 x 从 9 到 12、y 从 0 到 4 的那一格。", en: "Tile (3,0) covers x 9–12, y 0–4." }, { zh: "x=12 也算第 3 列（越界夹回），但 y=4 已经是第 1 行。", en: "x=12 still counts as column 3 (clamped), but y=4 is already row 1." }],
      solution: { zh: "例如 F=(10,2)。任何 9≤x≤12、0≤y<4 都对。", en: "For example F=(10,2). Any 9≤x≤12, 0≤y<4 works." },
      grade: (s) => {
        if (!std(s)) return { ok: false, msg: { zh: "请先载入老师的展开参考预设。", en: "Load the spread reference preset first." } };
        const others = Object.fromEntries(Object.entries(spread).filter(([k]) => k !== "F"));
        if (!same(s.positions, others)) return { ok: false, msg: { zh: "除 F 外的 pin 被移动了。", en: "A pin other than F moved." } };
        const t = R.tileIndex(s.positions.F.x, s.positions.F.y, G);
        return t.i === 3 && t.j === 0 ? { ok: true, msg: { zh: "对：F 在格 (3,0)。", en: "Right: F is in tile (3,0)." } } : { ok: false, msg: { zh: `F 现在在格 (${t.i},${t.j})。`, en: `F is in tile (${t.i},${t.j}).` } };
      },
    },
    {
      id: "c2-share", kind: "answer", cat: { zh: "单条份额", en: "One net's share" }, diff: 1,
      goal: { zh: "手算一条 net 的 HPWL、选中格数和每格份额。", en: "Hand-compute one net's HPWL, tile count and share." },
      task: { zh: "展开参考中，net A–C（A=(1,1)，C=(1,5)）给每个选中格加多少？", en: "In the spread reference, how much does net A–C (A=(1,1), C=(1,5)) add to each selected tile?" },
      hints: [{ zh: "框宽 0，框高 4，HPWL = 4。", en: "Box width 0, height 4, HPWL = 4." }, { zh: "y=1 在第 0 行，y=5 在第 1 行，都在第 0 列：2 格。", en: "y=1 is row 0, y=5 is row 1, both column 0: 2 tiles." }],
      solution: { zh: "4 ÷ 2 = 2。", en: "4 ÷ 2 = 2." },
      grade: (_, ans) => near(parseNum(ans), 2) ? { ok: true, msg: { zh: "对：4÷2 = 2。", en: "Right: 4 ÷ 2 = 2." } } : { ok: false, msg: { zh: "再算一次：先 HPWL，再数格。", en: "Try again: HPWL first, then count tiles." } },
    },
    {
      id: "c3-sum", kind: "answer", cat: { zh: "多条累加", en: "Adding nets" }, diff: 2,
      goal: { zh: "把多条 net 在同一格的份额加起来。", en: "Add several nets' shares in one tile." },
      task: { zh: "展开参考中，demand[1][0] 等于多少？（可写分数）", en: "In the spread reference, what is demand[1][0]? (fractions allowed)" },
      hints: [{ zh: "哪些 net 的选中格包含 (1,0)？A–B、A–B–C–D、E–F。", en: "Which nets select (1,0)? A–B, A–B–C–D, E–F." }, { zh: "7/3 + 11/6 + 1/2。", en: "7/3 + 11/6 + 1/2." }],
      solution: { zh: "7/3 + 11/6 + 1/2 = 14/3 ≈ 4.667。", en: "7/3 + 11/6 + 1/2 = 14/3 ≈ 4.667." },
      grade: (_, ans) => near(parseNum(ans), 14 / 3, 0.002) ? { ok: true, msg: { zh: "对：14/3。在实验室点这一格可看到三条来源。", en: "Right: 14/3. Click that tile in the lab to see the three sources." } } : { ok: false, msg: { zh: "不对。用实验室的“选中格的来源”核对。", en: "Not yet. Check with the lab's tile breakdown." } },
    },
    {
      id: "c4-overflow", kind: "answer", cat: { zh: "溢出", en: "Overflow" }, diff: 2,
      goal: { zh: "由需求和容量算总溢出。", en: "Compute total overflow from demand and capacity." },
      task: { zh: "中心聚集预设，容量 C=1 时，总溢出是多少？", en: "Centre-cluster preset, capacity C=1: what is the total overflow?" },
      hints: [{ zh: "聚集时只有一格有需求：7。", en: "Only one tile has demand: 7." }, { zh: "max(0, 7 − 1)，其他格都是 max(0, 0 − 1) = 0。", en: "max(0, 7 − 1); every other tile is max(0, 0 − 1) = 0." }],
      solution: { zh: "6。", en: "6." },
      grade: (_, ans) => near(parseNum(ans), 6) ? { ok: true, msg: { zh: "对：6。", en: "Right: 6." } } : { ok: false, msg: { zh: "再看一次：溢出不会是负数。", en: "Look again: overflow is never negative." } },
    },
    {
      id: "c5-capacity", kind: "lab", cat: { zh: "容量不改需求", en: "Capacity leaves demand alone" }, diff: 2,
      goal: { zh: "理解容量只是阈值，改它不改需求。", en: "Capacity is a threshold; changing it does not change demand." },
      task: { zh: "保持展开参考的 pin 不动，只改容量，让恰好 4 格溢出。", en: "Keep the spread pins fixed and change only the capacity so that exactly 4 tiles overflow." },
      hints: [{ zh: "需求从大到小：20/3、37/6、37/6、37/6、14/3、25/6、0、0。", en: "Demand, largest first: 20/3, 37/6, 37/6, 37/6, 14/3, 25/6, 0, 0." }, { zh: "需要 C 比第 4 大的值小、但不小于第 5 大的值：14/3 ≤ C < 37/6。", en: "C must be below the 4th value but not below the 5th: 14/3 ≤ C < 37/6." }],
      solution: { zh: "例如 C=5。任何 14/3 ≤ C < 37/6 都对。", en: "For example C=5. Any 14/3 ≤ C < 37/6 works." },
      grade: (s) => {
        if (!std(s) || !same(s.positions, spread)) return { ok: false, msg: { zh: "pin 必须保持展开参考的位置。", en: "Pins must stay at the spread reference." } };
        if (s.model !== "P") return { ok: false, msg: { zh: "请用模型 P。", en: "Use model P." } };
        if (!(s.capacity > 0)) return { ok: false, msg: { zh: "容量必须大于 0。", en: "Capacity must be greater than 0." } };
        const m = R.metrics(R.computeDemand(fx, s.positions).demand, s.capacity);
        return m.count === 4 ? { ok: true, msg: { zh: `对：C=${s.capacity} 时 4 格溢出，需求矩阵一个数都没变。`, en: `Right: at C=${s.capacity}, 4 tiles overflow, and the demand matrix did not change.` } } : { ok: false, msg: { zh: `现在 ${m.count} 格溢出。`, en: `${m.count} tiles overflow now.` } };
      },
    },
    {
      id: "c6-both", kind: "lab", cat: { zh: "指标取舍", en: "Metric trade-off" }, diff: 3,
      goal: { zh: "同时改善总溢出和最大溢出，并说出两者为何会分歧。", en: "Improve total and max overflow together, and explain why they can disagree." },
      task: { zh: "从展开参考出发移动 pin，使 C=2 时总溢出 < 22 且最大溢出 < 14/3。约束（课堂规定，不是真实合法化）：pin 留在芯片内，任意两 pin 距离 ≥ 1。", en: "Starting from the spread reference, move pins so that at C=2 total overflow < 22 and max overflow < 14/3. Classroom constraints (not real legalization): pins stay on the chip, every two pins ≥ 1 apart." },
      hints: [{ zh: "总需求 = 总 HPWL，先把 net 变短。", en: "Total demand = total HPWL, so shorten nets first." }, { zh: "但别全挤进一格：聚集布局的最大溢出是 5。试把四个角 pin 收进 x 2–5、y 2–5。", en: "But don't pile into one tile: the cluster's max overflow is 5. Try the four corner pins within x 2–5, y 2–5." }],
      solution: { zh: "例如 A(2,2) B(5,2) C(2,5) D(5,5) E(3,3.5) F(4,3.5)：总溢出 11，最大 3.5。还有很多别的解。", en: "For example A(2,2) B(5,2) C(2,5) D(5,5) E(3,3.5) F(4,3.5): total 11, max 3.5. Many others work." },
      grade: (s) => {
        if (!std(s)) return { ok: false, msg: { zh: "请用老师的 net 和网格。", en: "Use the teacher's nets and grid." } };
        if (s.model !== "P" || s.capacity !== 2) return { ok: false, msg: { zh: "请用模型 P、容量 2。", en: "Use model P and capacity 2." } };
        const v = R.validate(fx, s.positions); if (!v.ok) return { ok: false, msg: { zh: "输入无效。", en: "Invalid input." } };
        if (Object.keys(s.positions).length !== 6) return { ok: false, msg: { zh: "需要全部 6 个 pin。", en: "All six pins are required." } };
        if (minSep(s.positions) < 1 - 1e-9) return { ok: false, msg: { zh: "有两个 pin 距离不到 1。", en: "Two pins are closer than 1." } };
        const m = R.metrics(R.computeDemand(fx, s.positions).demand, 2);
        const ok = m.total < 22 - 1e-9 && m.max < 14 / 3 - 1e-9;
        return ok ? { ok: true, msg: { zh: `对：总溢出 ${R.fracText(m.total)}，最大 ${R.fracText(m.max)}。`, en: `Right: total ${R.fracText(m.total)}, max ${R.fracText(m.max)}.` } } : { ok: false, msg: { zh: `现在总溢出 ${R.fracText(m.total)}，最大 ${R.fracText(m.max)}。`, en: `Now total ${R.fracText(m.total)}, max ${R.fracText(m.max)}.` } };
      },
    },
    {
      id: "c7-boundary", kind: "lab", cat: { zh: "边界规则", en: "Boundary rule" }, diff: 2,
      goal: { zh: "看懂“含两端格”规则在边界上的跳变。", en: "See the endpoint-tile rule jump at a boundary." },
      task: { zh: "从展开参考出发，只沿 y=1 移动 B，让 net A–B 选中 4 格，且 B 尽量靠左。", en: "From the spread reference, move only B along y=1 so that net A–B selects 4 tiles, with B as far left as possible." },
      hints: [{ zh: "第 3 列从 x=9 开始。", en: "Column 3 starts at x=9." }, { zh: "floor(9/3)=3，而 8.99 还在第 2 列。", en: "floor(9/3)=3, while 8.99 is still column 2." }],
      solution: { zh: "B=(9,1)。此时 x=9 那一列与框的重叠面积为 0，按面积的模型不会给它需求。", en: "B=(9,1). The x=9 column overlaps the box with zero area, so an area-weighted model would give it nothing." },
      grade: (s) => {
        if (!std(s)) return { ok: false, msg: { zh: "请用老师的 net 和网格。", en: "Use the teacher's nets and grid." } };
        const others = Object.fromEntries(Object.entries(spread).filter(([k]) => k !== "B"));
        if (!same(s.positions, others)) return { ok: false, msg: { zh: "只允许移动 B。", en: "Only B may move." } };
        if (!near(s.positions.B.y, 1)) return { ok: false, msg: { zh: "B 要留在 y=1。", en: "B must stay on y=1." } };
        const n = R.netInfoP(fx.nets[0], s.positions, G).tiles.length;
        if (n !== 4) return { ok: false, msg: { zh: `A–B 现在选中 ${n} 格。`, en: `A–B selects ${n} tiles now.` } };
        return near(s.positions.B.x, 9) ? { ok: true, msg: { zh: "对：B=(9,1) 正好落在边界上。", en: "Right: B=(9,1) sits exactly on the boundary." } } : { ok: false, msg: { zh: "选中 4 格了，但 B 还能更靠左。", en: "4 tiles now, but B can go further left." } };
      },
    },
  ];
}

export function mountChallenges(root, fx, lang, lab) {
  const list = challenges(fx);
  const KEY = "rudy-l04-progress";
  let prog = {};
  try { prog = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { prog = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch { /* storage blocked: progress stays in memory */ } };
  const stars = (n) => "●".repeat(n) + "○".repeat(3 - n);
  const L = lang === "zh" ? { check: "检查", hint: "提示", sol: "看答案", retry: "重试", indep: "独立完成", viaSol: "看过答案后完成", goal: "学习目标", diff: "难度", ans: "你的答案", fromLab: "按实验室当前状态评分", summary: (a, b, n) => `独立完成 ${a} / ${n}，看答案后完成 ${b}` } : { check: "Check", hint: "Hint", sol: "Show solution", retry: "Retry", indep: "Solved independently", viaSol: "Solved after viewing the solution", goal: "Goal", diff: "Difficulty", ans: "Your answer", fromLab: "Graded on the lab's current state", summary: (a, b, n) => `Independent ${a} / ${n}, after solution ${b}` };
  function paint() {
    const a = list.filter((c) => prog[c.id]?.done && !prog[c.id]?.viewed).length, b = list.filter((c) => prog[c.id]?.done && prog[c.id]?.viewed).length;
    root.querySelector(".ch-summary").textContent = L.summary(a, b, list.length);
    list.forEach((c) => {
      const el = root.querySelector(`[data-ch="${c.id}"] .ch-status`);
      const p = prog[c.id] || {};
      el.textContent = p.done ? (p.viewed ? L.viaSol : L.indep) : "";
      el.className = "ch-status " + (p.done ? (p.viewed ? "viewed" : "done") : "");
    });
  }
  root.innerHTML = `<p class="ch-summary"></p>` + list.map((c, n) => `
    <article class="challenge" data-ch="${c.id}">
      <header><span class="cat">${c.cat[lang]}</span> <span class="diff" title="${L.diff}">${stars(c.diff)}</span> <span class="ch-status"></span></header>
      <h3 class="ch-task">${n + 1}. ${c.task[lang]}</h3>
      <p class="goal"><b>${L.goal}：</b>${c.goal[lang]}</p>
      ${c.kind === "answer" ? `<label>${L.ans} <input type="text" inputmode="decimal" class="ans"></label>` : `<p class="small">${L.fromLab}</p>`}
      <div class="row"><button type="button" data-a="check">${L.check}</button><button type="button" data-a="hint">${L.hint}</button><button type="button" data-a="sol">${L.sol}</button><button type="button" data-a="retry">${L.retry}</button></div>
      <div class="fb" aria-live="polite"></div><ol class="hints"></ol><p class="sol" hidden>${c.solution[lang]}</p>
    </article>`).join("");
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-a]"); if (!b) return;
    const art = b.closest(".challenge"); const c = list.find((x) => x.id === art.dataset.ch);
    const p = (prog[c.id] = prog[c.id] || { hints: 0 });
    if (b.dataset.a === "check") {
      const r = c.grade(lab.state(), art.querySelector(".ans")?.value ?? "");
      art.querySelector(".fb").textContent = r.msg[lang];
      art.querySelector(".fb").className = "fb " + (r.ok ? "ok" : "no");
      if (r.ok) p.done = true;
    }
    if (b.dataset.a === "hint" && p.hints < 2) { p.hints++; art.querySelector(".hints").innerHTML = c.hints.slice(0, p.hints).map((h) => `<li>${h[lang]}</li>`).join(""); }
    if (b.dataset.a === "sol") { p.viewed = true; art.querySelector(".sol").hidden = false; }
    if (b.dataset.a === "retry") { p.done = false; art.querySelector(".fb").textContent = ""; art.querySelector(".fb").className = "fb"; if (art.querySelector(".ans")) art.querySelector(".ans").value = ""; }
    save(); paint();
  });
  paint();
  return list;
}
