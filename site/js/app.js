// Page wiring: figures, film player with "Try this frame", lab, challenges, slides.
// SPDX-License-Identifier: MIT
import * as R from "./rudy.js";
import * as F from "./film.js";
import { boardMarkup, legendMarkup } from "./board.js";
import { createLab } from "./lab.js";
import { mountChallenges } from "./challenges.js";
import { slides, slideSVG } from "./slides.js";

const lang = document.documentElement.lang.startsWith("zh") ? "zh" : "en";
const msg = {
  zh: { fxErr: "示例数据加载失败（data/fixture.json）。请刷新，或从仓库本地运行 npm run serve。", vidErr: "视频文件缺失或无法播放。可在上方直接播放代码绘制的版本。", play: "播放", pause: "暂停", tryFrame: "试试这一帧", tried: "已把这一帧带进实验室 ↓", full: "正片", sample: "小样" },
  en: { fxErr: "Could not load the example data (data/fixture.json). Reload, or run npm run serve from the repository.", vidErr: "The video file is missing or cannot play. The code-drawn version above still works.", play: "Play", pause: "Pause", tryFrame: "Try this frame", tried: "Frame sent to the lab ↓", full: "Full film", sample: "Sample" },
}[lang];

let fx;
try {
  fx = await (await fetch(new URL("../data/fixture.json", import.meta.url))).json();
  F.setFixture(fx);
} catch (e) {
  document.querySelectorAll("[data-needs-fixture]").forEach((el) => { el.innerHTML = `<p class="err">${msg.fxErr}</p>`; });
  throw e;
}

// ---- static figures: <figure data-fig='{"preset":"spread","layer":"demand",...}'> ----
document.querySelectorAll("[data-fig]").forEach((el) => {
  const o = JSON.parse(el.dataset.fig);
  const problem = o.nets ? { ...fx, nets: o.nets } : fx;
  const positions = o.positions || fx.presets[o.preset || "spread"].positions;
  const b = boardMarkup({ problem, positions, model: o.model || "P", capacity: o.capacity ?? 2, layer: o.layer || "none", upto: o.upto, selectedNet: o.net ?? null, onlySelectedFly: !!o.only, showDims: !!o.dims, show: o.show, lang }, { x: 46, y: 12, scale: 40 });
  const leg = o.layer && o.layer !== "none" ? `<svg class="legend" viewBox="0 0 470 70">${legendMarkup(o.layer, 10, 20, 440, lang, o.layer === "ratio" ? 1 : o.layer === "demand" ? o.capacity ?? 2 : null)}</svg>` : "";
  el.insertAdjacentHTML("afterbegin", `<svg class="fig" viewBox="0 0 540 370" role="img" aria-label="${el.querySelector("figcaption")?.textContent || "board"}">${b.markup}</svg>${leg}`);
});

// ---- lab ----
const labRoot = document.getElementById("lab");
const lab = labRoot ? createLab(labRoot, fx, lang) : null;
window.lab = lab; // exposed for the automated site checks

// ---- film player (code-drawn, same renderer as the MP4) ----
const film = document.getElementById("film");
if (film) {
  const stage = film.querySelector(".stage");
  const range = film.querySelector("input[type=range]");
  const btn = film.querySelector("[data-film=play]");
  const time = film.querySelector(".time");
  const cutSel = film.querySelector("select[name=cut]");
  let cut = "full", t = 0, playing = false, last = 0;
  const draw = () => {
    stage.innerHTML = F.frameMarkup(t, cut, lang);
    range.max = F.duration(cut); range.value = t;
    time.textContent = `${t.toFixed(1)} / ${F.duration(cut).toFixed(1)} s`;
  };
  const loop = (now) => {
    if (!playing) return;
    t = Math.min(F.duration(cut), t + (now - last) / 1000); last = now;
    if (t >= F.duration(cut)) { playing = false; btn.textContent = msg.play; }
    draw();
    if (playing) requestAnimationFrame(loop);
  };
  btn.addEventListener("click", () => { playing = !playing; btn.textContent = playing ? msg.pause : msg.play; if (playing) { if (t >= F.duration(cut)) t = 0; last = performance.now(); requestAnimationFrame(loop); } });
  range.addEventListener("input", () => { t = Number(range.value); draw(); });
  cutSel.addEventListener("change", () => { cut = cutSel.value; t = 0; draw(); });
  film.querySelector("[data-film=try]").addEventListener("click", () => {
    playing = false; btn.textContent = msg.play;
    lab.loadSnapshot(F.labSnapshot(t, cut));
    film.querySelector(".tried").textContent = msg.tried;
    labRoot.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  // expose for tests: same contract as the renderer
  window.filmPlayer = { seek: (s) => { t = s; draw(); }, snapshot: () => F.labSnapshot(t, cut), setCut: (c) => { cut = c; cutSel.value = c; t = 0; draw(); } };
  draw();
}
document.querySelectorAll("video").forEach((v) => v.addEventListener("error", () => v.insertAdjacentHTML("afterend", `<p class="err">${msg.vidErr}</p>`), true));

// ---- challenges ----
const chRoot = document.getElementById("challenge-list");
if (chRoot && lab) mountChallenges(chRoot, fx, lang, lab);

// ---- slides viewer ----
const sv = document.getElementById("slides-viewer");
if (sv) {
  const all = slides(fx);
  let k = 0;
  const show = () => {
    sv.querySelector(".slide").innerHTML = slideSVG(fx, k, lang);
    sv.querySelector(".notes").textContent = all[k].notes[lang];
    sv.querySelector(".pageno").textContent = `${k + 1} / ${all.length}`;
  };
  sv.querySelector("[data-s=prev]").addEventListener("click", () => { k = Math.max(0, k - 1); show(); });
  sv.querySelector("[data-s=next]").addEventListener("click", () => { k = Math.min(all.length - 1, k + 1); show(); });
  show();
}
window.lessonReady = true;
