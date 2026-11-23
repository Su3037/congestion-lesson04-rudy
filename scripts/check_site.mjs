// Browser acceptance checks for the built site (local or deployed).
//   node scripts/check_site.mjs                       # serves dist/ locally
//   BASE_URL=https://su3037.github.io/congestion-lesson04-rudy/ node scripts/check_site.mjs
// Writes verification/site-check.json and screenshots under verification/screens/.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { serve } from "./serve.mjs";
import * as F from "../site/js/film.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "verification"); fs.mkdirSync(path.join(outDir, "screens"), { recursive: true });
let base = process.env.BASE_URL, srv = null;
if (!base) { const port = 8900 + Math.floor(Math.random() * 90); srv = await serve(port); base = `http://localhost:${port}/congestion-lesson04-rudy/`; }
const remote = !!process.env.BASE_URL;
await F.loadFixture();
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = []; const fail = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); if (!ok) fail.push(name); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

async function open(url, opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [], bad = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("favicon.ico")) bad.push(`${r.status()} ${r.url()}`); });
  await page.goto(url, { waitUntil: "load" });
  return { ctx, page, errors, bad };
}

for (const [lang, sub] of [["zh", ""], ["en", "en/"]]) {
  const { ctx, page, errors, bad } = await open(base + sub, { viewport: { width: 1440, height: 900 } });
  await page.waitForFunction(() => window.lessonReady === true, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  check(`${lang}: page loads with no console errors`, errors.length === 0, errors.join(" | "));
  check(`${lang}: no failed requests on load`, bad.length === 0, bad.join(" | "));
  const figs = await page.locator("figure[data-fig] svg.fig").count();
  check(`${lang}: all reading figures drawn`, figs >= 14, `${figs} figures`);

  // Film → lab transfer at out-of-order times, compared field by field with the pure timeline.
  for (const [cut, t] of [["full", 200.5], ["full", 61.2], ["sample", 20], ["full", 95.0], ["full", 7.3]]) {
    await page.evaluate(([c, tt]) => { window.filmPlayer.setCut(c); window.filmPlayer.seek(tt); }, [cut, t]);
    await page.click("[data-film=try]");
    const got = await page.evaluate(() => window.lab.state());
    const want = F.labSnapshot(t, cut);
    const same = JSON.stringify(got.positions) === JSON.stringify(want.positions) && got.model === want.model && got.capacity === want.capacity && got.selectedNet === want.selectedNet && JSON.stringify(got.problem.nets) === JSON.stringify(want.problem.nets) && (got.upto ?? null) === (want.upto ?? null);
    check(`${lang}: "Try this frame" at ${cut} ${t}s transfers the exact state`, same, same ? want.from.scene : JSON.stringify({ got, want }));
  }
  // Lab: capacity change keeps demand; keyboard moves a pin by 0.5.
  await page.click("[data-preset=spread]");
  const d1 = await page.evaluate(() => window.lab.computed().c.demand);
  await page.fill("input[name=cap]", "1"); await page.locator("input[name=cap]").dispatchEvent("change");
  const st = await page.evaluate(() => ({ d: window.lab.computed().c.demand, m: window.lab.computed().m }));
  check(`${lang}: capacity 2→1 leaves demand unchanged, total overflow 28`, JSON.stringify(d1) === JSON.stringify(st.d) && Math.abs(st.m.total - 28) < 1e-9);
  await page.fill("input[name=cap]", "0"); await page.locator("input[name=cap]").dispatchEvent("change");
  const capErr = await page.locator("#lab .note.err").count();
  check(`${lang}: capacity 0 shows an error instead of numbers`, capErr === 1);
  await page.fill("input[name=cap]", "2"); await page.locator("input[name=cap]").dispatchEvent("change");
  await page.locator('#lab g.pin[data-pin="E"]').focus();
  await page.keyboard.press("ArrowRight");
  const ex = await page.evaluate(() => window.lab.state().positions.E.x);
  check(`${lang}: keyboard moves a pin 0.5`, Math.abs(ex - 5.5) < 1e-9, `E.x = ${ex}`);
  // Pointer drag
  const pin = page.locator('#lab g.pin[data-pin="F"] circle');
  const bb = await pin.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2 + 120, bb.y + bb.height / 2, { steps: 5 }); await page.mouse.up();
  const fx2 = await page.evaluate(() => window.lab.state().positions.F.x);
  check(`${lang}: dragging a pin moves it`, fx2 > 7, `F.x = ${fx2}`);
  // Selected-tile breakdown
  await page.click("[data-preset=spread]");
  await page.click('#lab .numgrid td[data-i="1"][data-j="0"]');
  const bd = await page.locator("#lab .breakdown li").count();
  check(`${lang}: tile (1,0) breakdown lists its 3 nets`, bd === 3, `${bd} items`);
  // Step-through shows partial
  await page.click("[data-step='-1']");
  const partial = await page.evaluate(() => window.lab.computed().c.partial);
  check(`${lang}: stepping back marks the map partial`, partial === true);
  await page.click("[data-step=all]");
  // Malformed JSON and invalid problem
  await page.locator("#lab details summary").click();
  await page.fill("#lab textarea.json", "{oops");
  await page.click("[data-act=json]");
  const jsonErr = await page.locator("#lab .note").textContent();
  check(`${lang}: malformed JSON reports an error`, /JSON/.test(jsonErr), jsonErr);
  await page.fill("#lab textarea.json", JSON.stringify({ chip: { W: 12, H: 8 }, gcell: { nx: 4, ny: 2, cellW: 3, cellH: 4 }, nets: [["A", "Z"]], positions: { A: { x: 1, y: 1 } } }));
  await page.click("[data-act=json]");
  const invErr = await page.locator("#lab .note.err").count();
  check(`${lang}: unknown pin is rejected visibly`, invErr === 1);
  await page.click("[data-act=reset]");
  // Challenges: reference solutions graded correct, wrong states graded wrong.
  const sols = { "c1-tile": { F: { x: 10, y: 2 } }, "c7-boundary": { B: { x: 9, y: 1 } }, "c6-both": { A: { x: 2, y: 2 }, B: { x: 5, y: 2 }, C: { x: 2, y: 5 }, D: { x: 5, y: 5 }, E: { x: 3, y: 3.5 }, F: { x: 4, y: 3.5 } } };
  for (const [id, delta] of Object.entries(sols)) {
    await page.click("[data-act=reset]");
    await page.evaluate((d) => window.lab.setPositions({ ...window.lab.state().positions, ...d }), delta);
    await page.click(`[data-ch="${id}"] button[data-a=check]`);
    const cls = await page.locator(`[data-ch="${id}"] .fb`).getAttribute("class");
    check(`${lang}: challenge ${id} accepts a valid solution`, cls.includes("ok"));
  }
  await page.click("[data-act=reset]");
  await page.click(`[data-ch="c6-both"] button[data-a=check]`);
  check(`${lang}: challenge c6 rejects the untouched start`, (await page.locator(`[data-ch="c6-both"] .fb`).getAttribute("class")).includes("no"));
  await page.fill("input[name=cap]", "5"); await page.locator("input[name=cap]").dispatchEvent("change");
  await page.click(`[data-ch="c5-capacity"] button[data-a=check]`);
  check(`${lang}: challenge c5 accepts C=5`, (await page.locator(`[data-ch="c5-capacity"] .fb`).getAttribute("class")).includes("ok"));
  await page.fill(`[data-ch="c3-sum"] input.ans`, "14/3"); await page.click(`[data-ch="c3-sum"] button[data-a=check]`);
  check(`${lang}: challenge c3 accepts 14/3`, (await page.locator(`[data-ch="c3-sum"] .fb`).getAttribute("class")).includes("ok"));
  await page.click(`[data-ch="c2-share"] button[data-a=sol]`);
  await page.fill(`[data-ch="c2-share"] input.ans`, "2"); await page.click(`[data-ch="c2-share"] button[data-a=check]`);
  const status = await page.locator(`[data-ch="c2-share"] .ch-status`).getAttribute("class");
  check(`${lang}: solving after viewing the solution is tracked separately`, status.includes("viewed"));
  // Slides viewer page numbers
  await page.click("#slides-viewer [data-s=next]");
  const pn = await page.locator("#slides-viewer .pageno").textContent();
  const svgPn = await page.locator("#slides-viewer .slide svg text").last().textContent().catch(() => "");
  check(`${lang}: slide page number matches the slide`, pn.trim() === "2 / 12", pn);
  // Accessibility audit (axe-core)
  await page.addScriptTag({ path: path.join(root, "node_modules/axe-core/axe.min.js") });
  const axe = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length })));
  const serious = axe.filter((v) => v.impact === "serious" || v.impact === "critical");
  check(`${lang}: axe-core has no serious/critical violations`, serious.length === 0, JSON.stringify(axe));
  await page.screenshot({ path: path.join(outDir, "screens", `${remote ? "live" : "local"}-${lang}-1440.png`), fullPage: false });
  await ctx.close();

  // Mobile 375 px
  const m = await open(base + sub, { ...devices["iPhone 13"], viewport: { width: 375, height: 800 } });
  await m.page.waitForFunction(() => window.lessonReady === true, null, { timeout: 30000 });
  const sw = await m.page.evaluate(() => document.documentElement.scrollWidth);
  check(`${lang}: no horizontal scroll at 375 px`, sw <= 375, `scrollWidth ${sw}`);
  await m.page.locator("#lab-sec").scrollIntoViewIfNeeded();
  await m.page.screenshot({ path: path.join(outDir, "screens", `${remote ? "live" : "local"}-${lang}-375-lab.png`) });
  // touch drag on the board
  const tb = await m.page.locator('#lab g.pin[data-pin="E"] circle').boundingBox();
  await m.page.touchscreen.tap(tb.x + tb.width / 2, tb.y + tb.height / 2);
  check(`${lang}: touch tap on the board leaves the lab working`, m.errors.length === 0, m.errors.join(" | "));
  await m.ctx.close();

  // Reduced motion
  const r = await open(base + sub, { viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await r.page.waitForFunction(() => window.lessonReady === true, null, { timeout: 30000 });
  check(`${lang}: loads with reduced motion`, r.errors.length === 0);
  await r.ctx.close();
}

// Renderer contract: random, repeated, out-of-order and fresh-page access give identical frames.
{
  const hashAt = async (page, t) => { await page.evaluate((tt) => window.renderAt(tt), t); return crypto.createHash("sha256").update(await page.locator("#stage").screenshot()).digest("hex"); };
  const a = await open(base + "film/render.html?cut=full&lang=zh", { viewport: { width: 1280, height: 720 } });
  await a.page.evaluate(() => window.ready);
  const clock = await a.page.evaluate(() => window.clock);
  check("renderer exposes window.clock", clock.fps === 30 && Math.abs(clock.duration - F.duration("full")) < 1e-9, JSON.stringify(clock));
  const h1 = await hashAt(a.page, 123.4), h2 = await hashAt(a.page, 5), h3 = await hashAt(a.page, 123.4);
  const b = await open(base + "film/render.html?cut=full&lang=zh", { viewport: { width: 1280, height: 720 } });
  await b.page.evaluate(() => window.ready);
  const h4 = await hashAt(b.page, 123.4);
  check("renderAt is repeatable, order-independent and fresh-page stable", h1 === h3 && h1 === h4 && h1 !== h2);
  const snap = await a.page.evaluate(() => window.renderAt(150));
  check("renderAt returns a snapshot matching stateAt", snap.scene === F.stateAt(150).scene && snap.cue === F.stateAt(150).cueIndex, snap.scene);
  await a.ctx.close(); await b.ctx.close();
}
// Assets that must exist and not be LFS pointers
for (const p of ["media/rudy-full.zh.mp4", "media/rudy-full.en.mp4", "media/rudy-sample.zh.mp4", "media/rudy-full.zh.vtt", "media/rudy-full.en.vtt", "slides/rudy-slides.zh.pdf", "slides/rudy-slides.en.pdf", "downloads/check.py", "downloads/fixture.json", "fonts/fonts.css", "data/fixture.json", "media/poster.zh.jpg"]) {
  const res = await fetch(base + p);
  const buf = Buffer.from(await res.arrayBuffer());
  const lfs = buf.slice(0, 40).toString().startsWith("version https://git-lfs");
  check(`asset ${p}`, res.ok && buf.length > 100 && !lfs, `${res.status} ${buf.length} bytes`);
}
const nf = await fetch(base + "nope/missing.html");
check("missing page returns 404 with a page", nf.status === 404 && (await nf.text()).includes("RUDY"));

fs.writeFileSync(path.join(outDir, remote ? "site-check-live.json" : "site-check-local.json"), JSON.stringify({ base, passed: results.filter((r) => r.ok).length, failed: fail, results }, null, 1));
console.log(`\n${results.length - fail.length}/${results.length} checks passed`);
await browser.close(); if (srv) srv.close();
process.exit(fail.length ? 1 : 0);
