// Record the lab walkthrough: drive the real page with Playwright and save one screenshot per step, with the
// pointer position at that moment. The film (scene "walk" in site/js/timeline.js) draws these screenshots, a
// cursor gliding between the recorded positions, and a click ring, so the walkthrough shows the actual site.
//   node scripts/record-walk.mjs            -> site/data/walk/<lang>.json + site/data/walk/<lang>-wNN-K.jpg
// Shots record only what the page really showed; nothing is painted in afterwards.
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync, readdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {startServer} from './serve.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(ROOT, 'site/data/walk');
const VIEW = {w: 1440, h: 810};

async function record(browser, url, lang) {
  const ctx = await browser.newContext({viewport: {width: VIEW.w, height: VIEW.h}, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: lang === 'zh' ? 'zh-CN' : 'en-US'});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${url}?lang=${lang}`);
  await page.waitForFunction(() => window.appReady === true || window.appError, null, {timeout: 30000});
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({content: '*{caret-color:transparent!important} .skip{display:none}'});
  const shots = {};
  let cursor = [VIEW.w / 2, VIEW.h / 2];
  const center = async sel => {
    const b = await page.locator(sel).first().boundingBox();
    if (!b) throw new Error(`no box for ${sel}`);
    const c = [b.x + b.width / 2, b.y + b.height / 2];
    if (c[0] < 0 || c[1] < 0 || c[0] > VIEW.w || c[1] > VIEW.h) throw new Error(`${sel} is off screen at ${c}`);
    return c;
  };
  const top = async (sel, offset = 132) => { await page.evaluate(([s, o]) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o); }, [sel, offset]); await page.waitForTimeout(120); };
  const shot = async (cue, at, {click = false} = {}) => {
    await page.waitForTimeout(150);
    (shots[cue] ??= []);
    const k = shots[cue].length;
    const name = `${lang}-${cue}-${k}.jpg`;
    await page.screenshot({path: join(OUT, name), type: 'jpeg', quality: 88});
    shots[cue].push({img: `data/walk/${name}`, at, cursor: cursor.map(v => Math.round(v)), click});
  };
  const point = async (sel, {clickIt = true} = {}) => { cursor = await center(sel); await page.mouse.move(...cursor); if (clickIt) await page.mouse.click(...cursor); };
  // grid -> screen, measured from the spread layout's pins A (1,1) and D (8,5)
  const grid = async () => {
    const [ax, ay] = await center('#lab [data-cell="A"] circle'), [dx, dy] = await center('#lab [data-cell="D"] circle');
    return (x, y) => [ax + (dx - ax) * (x - 1) / 7, ay + (dy - ay) * (y - 1) / 4];
  };
  const tryAt = await page.evaluate(async () => {
    const r = await fetch('data/films/advanced.clock.' + (document.documentElement.lang.startsWith('zh') ? 'zh' : 'en') + '.json').then(x => x.json());
    const s = r.segments.find(x => x.id === 'a03'); return (s.start + s.sceneEnd) / 2 + 2;
  });

  // w01: the lab opens on the teacher's spread layout
  await top('#lab .lab-controls', 150);
  cursor = await center('#lab .lab-total'); await page.mouse.move(...cursor);
  await shot('w01', 0);
  // w02: pick a net: its box, tiles and share light up
  await point('#lab .lab-nets button[data-net="AB"]'); await shot('w02', 0.12, {click: true});
  await point('#lab .lab-nets button[data-net="ABCD"]'); await shot('w02', 0.55, {click: true});
  // w03: drag A from (1, 1) to (3, 1)
  const g = await grid();
  cursor = g(1, 1); await page.mouse.move(...cursor); await shot('w03', 0.08);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { const p = g(1 + 2 * i / 12, 1); await page.mouse.move(...p, {steps: 2}); if (i === 6) { cursor = p; await shot('w03', 0.3); } }
  cursor = g(3, 1); await page.mouse.up(); await shot('w03', 0.55);
  // w04: keyboard: focus E, two arrow presses, then undo twice (back to the spread layout)
  await point('#lab [data-cell="E"] circle'); await shot('w04', 0.06, {click: true});
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await shot('w04', 0.35);
  await point('#lab [data-a="undo"]'); await shot('w04', 0.6, {click: true});
  await page.mouse.click(...cursor); await page.mouse.click(...cursor); await page.waitForTimeout(100);
  await point('#lab [data-a="reset"]'); await shot('w04', 0.85, {click: true});
  // w05: add the nets one by one
  for (let i = 0; i < 4; i++) { await point('#lab [data-a="step"]'); await shot('w05', 0.05 + i * 0.2, {click: true}); }
  await point('#lab [data-a="all"]'); await shot('w05', 0.88, {click: true});
  // w06: overflow layer, then capacity 1
  cursor = await center('#lab [data-k="layer"]'); await page.mouse.move(...cursor);
  await page.selectOption('#lab [data-k="layer"]', 'overflow'); await shot('w06', 0.08, {click: true});
  cursor = await center('#lab [data-k="cap"]'); await page.mouse.move(...cursor);
  await page.fill('#lab [data-k="cap"]', '1'); await page.dispatchEvent('#lab [data-k="cap"]', 'change'); await shot('w06', 0.5, {click: true});
  await page.fill('#lab [data-k="cap"]', '2'); await page.dispatchEvent('#lab [data-k="cap"]', 'change');
  await page.selectOption('#lab [data-k="layer"]', 'demand');
  // w07: from the film: pause the advanced film on the edge-rule frame and hand it to the lab
  await page.evaluate(async t => {
    const P = window.rudyPlayer; await P.load('advanced', document.documentElement.lang.startsWith('zh') ? 'zh' : 'en');
    await new Promise(r => { const v = P.video; const go = () => { v.currentTime = t; }; v.addEventListener('seeked', r, {once: true}); if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, {once: true}); setTimeout(r, 4000); });
    if (P.video.error || P.video.readyState < 2) { const live = document.querySelector('[data-k="live"]'); if (!live.checked) live.click(); }
  }, tryAt);
  await top('#films .player-tools', VIEW.h - 150);
  await page.waitForFunction(() => { const v = window.rudyPlayer.video; return v.error || (!v.seeking && v.readyState >= 3) || document.querySelector('[data-k="live"]')?.checked; }, null, {timeout: 15000});
  await page.waitForTimeout(600);
  cursor = await center('#films [data-a="try"]'); await page.mouse.move(...cursor); await shot('w07', 0.06);
  await page.mouse.click(...cursor); await page.waitForTimeout(300);
  await top('#lab .lab-controls', 150);
  cursor = await center('#lab .lab-banner'); await page.mouse.move(...cursor); await shot('w07', 0.45, {click: true});
  // w08: a challenge: count ABCD's tiles and its share
  await top('#c1-tiles', 140);
  await page.fill('#c1-tiles [name="c1-tiles-count"]', '6'); await page.fill('#c1-tiles [name="c1-tiles-share"]', '11/6');
  cursor = await center('#c1-tiles [name="c1-tiles-share"]'); await page.mouse.move(...cursor); await shot('w08', 0.06);
  await point('#c1-tiles button[type="submit"]'); await shot('w08', 0.4, {click: true});
  // w09: Python practice
  await top('#python', 140);
  cursor = await center('#python a[download]'); await page.mouse.move(...cursor); await shot('w09', 0.1);
  if (errors.length) throw new Error(`page errors while recording ${lang}: ${errors.join(' | ')}`);
  await ctx.close();
  return {viewport: VIEW, lang, shots};
}

mkdirSync(OUT, {recursive: true});
for (const f of readdirSync(OUT)) rmSync(join(OUT, f));
const srv = await startServer({prefix: '/congestion-lesson04-rudy/'});
const browser = await chromium.launch({args: ['--hide-scrollbars', '--font-render-hinting=none']});
try {
  for (const lang of ['zh', 'en']) {
    const data = await record(browser, srv.url, lang);
    writeFileSync(join(OUT, `${lang}.json`), JSON.stringify(data, null, 1));
    console.log(`${lang}: ${Object.values(data.shots).flat().length} shots`);
  }
} finally { await browser.close(); await srv.close(); }
