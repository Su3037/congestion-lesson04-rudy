// Browser tests in headless Chromium (Playwright). Serves site/ at the GitHub Pages subpath and at "/".
//   node tests/browser.mjs [--base https://su3037.github.io/congestion-lesson04-rudy/]   (--base tests a deployed site)
// Writes build/browser-report.json. Exit code 1 on any failure.
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {startServer} from '../scripts/serve.mjs';
import * as D from '../site/js/domain.js';
import {stateAt, frameAt, frameTime} from '../site/js/timeline.js';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const ROOT = new URL('../', import.meta.url);
const fixtures = D.prepareFixtures(JSON.parse(readFileSync(new URL('fixtures/rudy-fixtures.json', ROOT))));
// The player opens on the first film (科普 story, music clock); its zh clock drives the handoff and caption checks.
const readJ = p => JSON.parse(readFileSync(new URL(p, ROOT)));
const storyScript = readJ('site/data/films/story.json'), clock = readJ('site/data/films/story.clock.zh.json');
const index = readJ('site/data/films/index.json');
const baseArg = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : null;
const results = [];
const check = (name, ok, detail = '') => { results.push({name, ok: Boolean(ok), detail: String(detail).slice(0, 300)}); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail && !ok ? ' :: ' + detail : ''}`); };

const srv = baseArg ? null : await startServer({prefix: '/congestion-lesson04-rudy/'});
const srvRoot = baseArg ? null : await startServer({prefix: '/'});
const BASE = baseArg ?? srv.url;
const browser = await chromium.launch();

async function open(url, opts = {}) {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 1000}, ...opts});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(url);
  await page.waitForFunction(() => window.appReady || window.appError || window.ready || window.renderError, null, {timeout: 30000});
  return {ctx, page, errors};
}
const labTotal = page => page.evaluate(() => window.rudyLab.getState()).then(st => D.analyse(st).metrics.total);
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;
const shownTotal = page => page.evaluate(() => document.querySelector('#lab .lab-total b')?.textContent ?? '');
const labState = page => page.evaluate(() => window.rudyLab.getState());

try {
  // 1. Load at the Pages subpath, Chinese, desktop
  {
    const {ctx, page, errors} = await open(BASE);
    check('subpath load without errors', errors.length === 0 && await page.evaluate(() => window.appReady === true), errors.join('; '));
    const ids = await page.evaluate(() => [...document.querySelectorAll('main section')].map(s => s.id));
    check('all ten numbered sections present in house order', JSON.stringify(ids) === JSON.stringify(['goals', 'films', 'lesson', 'slides', 'lab', 'challenges', 'quiz', 'python', 'mistakes', 'repro']), ids);
    check('lesson has its six parts', await page.evaluate(() => ['background', 'definitions', 'worked', 'capacity', 'compare', 'pseudocode'].every(id => document.querySelector(`#lesson #${id}`))));
    check('four film cards in order 科普 → 精讲 → 进阶 → 实验演示', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#films .film-card')].map(b => b.dataset.film))) === '["story","concise","advanced","lab"]');
    const worked = await page.evaluate(() => [...document.querySelectorAll('#worked tfoot b')].map(b => b.textContent));
    check('worked table total HPWL 34', worked[0] === '34', worked);
    check('lesson parts: worked, capacity and compare tables present', await page.evaluate(() => ['worked', 'capacity', 'compare'].every(id => document.querySelector(`#lesson #${id} table`))));
    check('lab starts on the spread layout: total overflow 22, max 14/3', near(await labTotal(page), 22) && (await shownTotal(page)) === '22', await shownTotal(page));

    // net selection
    await page.click('#lab .lab-nets button[data-net="EF"]');
    check('net selector selects EF', (await labState(page)).selectedNet === 'EF');

    // keyboard move of B, then the shown numbers equal an independent evaluation of the lab state
    await page.focus('#lab [data-cell="B"]');
    await page.keyboard.press('ArrowLeft');
    let s = await labState(page);
    check('keyboard moves B by the snap step', s.positions.B.x === 7.5 && s.positions.B.y === 1, JSON.stringify(s.positions.B));
    check('keyboard focus stays on B after re-render', await page.evaluate(() => document.activeElement?.dataset.cell) === 'B');
    check('shown total overflow = domain value of the lab state', (await shownTotal(page)) === D.frac(D.analyse(s).metrics.total), await shownTotal(page));
    await page.click('#lab [data-a="undo"]');

    // mouse drag of A from (1,1) to (3,1): the boundary case
    await page.locator('#lab .lab-board svg').scrollIntoViewIfNeeded();
    const pin = async c => { const b = await page.locator(`#lab [data-cell="${c}"] circle`).first().boundingBox(); return {x: b.x + b.width / 2, y: b.y + b.height / 2}; };
    const pA = await pin('A'), pD = await pin('D');
    const toPx = (x, y) => ({x: pA.x + (pD.x - pA.x) * (x - 1) / 7, y: pA.y + (pD.y - pA.y) * (y - 1) / 4});
    const a1 = toPx(3, 1);
    await page.mouse.move(pA.x, pA.y); await page.mouse.down(); await page.mouse.move(a1.x, a1.y, {steps: 8}); await page.mouse.up();
    s = await labState(page);
    check('mouse drag moves A to (3,1)', s.positions.A.x === 3 && s.positions.A.y === 1, JSON.stringify(s.positions.A));
    check('after the drag max overflow is 29/6 and demand still sums to 34', near(D.analyse(s).metrics.max, 29 / 6) && near(D.analyse(s).metrics.sumDemand, 34));
    check('undo restores A', (await page.click('#lab [data-a="undo"]'), (await labState(page)).positions.A.x === 1));

    // touch-style pointer drag (pointerType touch) of E
    const e0 = await pin('E'), e1 = toPx(7, 3);
    await page.evaluate(([a, b]) => {
      const el = document.querySelector('#lab [data-cell="E"]'), board = document.querySelector('#lab .lab-board');
      const ev = (t, p, target) => target.dispatchEvent(new PointerEvent(t, {bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: p.x, clientY: p.y}));
      ev('pointerdown', a, el); ev('pointermove', b, board); ev('pointerup', b, board);
    }, [e0, e1]);
    s = await labState(page);
    check('touch pointer drag moves E', s.positions.E.x === 7 && s.positions.E.y === 3, JSON.stringify(s.positions.E));

    // presets, model, layer, capacity
    await page.click('#lab button[data-preset="cluster"]');
    check('cluster preset: total overflow 5', near(await labTotal(page), 5));
    await page.click('#lab button[data-preset="spread"]');
    await page.check('#lab input[name="lab-model"][value="A"]');
    s = await labState(page);
    check('model A switch keeps coordinates; max overflow 5.536', s.model === 'A' && s.positions.A.x === 1 && near(D.analyse(s).metrics.max, 5.535714285714286));
    check('H and V layers offered under model A', await page.evaluate(() => [...document.querySelectorAll('#lab [data-k="layer"] option')].map(o => o.value).includes('H')));
    await page.check('#lab input[name="lab-model"][value="P"]');
    await page.fill('#lab [data-k="cap"]', '1'); await page.dispatchEvent('#lab [data-k="cap"]', 'change');
    s = await labState(page);
    check('capacity 1: total overflow 28, demand unchanged', s.capacity === 1 && near(D.analyse(s).metrics.total, 28) && near(D.analyse(s).metrics.sumDemand, 34));
    await page.fill('#lab [data-k="cap"]', '2'); await page.dispatchEvent('#lab [data-k="cap"]', 'change');

    // add nets one by one
    await page.click('#lab [data-a="reset"]');
    for (let i = 0; i < 2; i++) await page.click('#lab [data-a="step"]');
    s = await labState(page);
    check('step adds nets one at a time (2 of 6, sum 14)', s.upto === 2 && near(D.analyse(s).metrics.sumDemand, 14), JSON.stringify(s.upto));
    await page.click('#lab [data-a="all"]');

    // challenges: c1 answer (independent), c4 state (fail, then pass), c6 studied answer, two-stage hints
    await page.fill('[name="c1-tiles-count"]', '6'); await page.fill('[name="c1-tiles-share"]', '11/6');
    await page.click('#c1-tiles button[type="submit"]');
    check('c1 passes with the right numbers', await page.getAttribute('#c1-tiles [data-k="result"]', 'class') === 'ch-result ok');
    check('c1 tracked as independent', /独立/.test(await page.textContent('#c1-tiles [data-k="progress"]')));
    await page.click('#c4-move-a [data-a="start"]');
    await page.fill('[name="c4-move-a-predict"]', '34');
    await page.click('#c4-move-a button[type="submit"]');
    check('c4 fails before A is moved', await page.getAttribute('#c4-move-a [data-k="result"]', 'class') === 'ch-result bad');
    await page.click('#c4-move-a [data-a="answer"]');
    await page.click('#lab button[data-preset="boundary"]');
    await page.click('#c4-move-a button[type="submit"]');
    check('c4 passes on the real lab state with A at x = 3', await page.getAttribute('#c4-move-a [data-k="result"]', 'class') === 'ch-result ok');
    check('c4 tracked as studied answer', /学习答案/.test(await page.textContent('#c4-move-a [data-k="progress"]')));
    await page.click('#c3-sum [data-a="hint"]'); await page.click('#c3-sum [data-a="hint"]');
    check('two-stage hints', await page.locator('#c3-sum .hint').count() === 2);

    // quiz feedback
    await page.check('[name="quiz-0"][value="1"]');
    check('quiz gives feedback', /✓/.test(await page.textContent('#quiz .quiz-item .fb')));

    // film: frame-to-lab handoff (only when the full film exists)
    if (existsSync(new URL('site/media/story.zh.mp4', ROOT))) {
      await page.waitForFunction(() => document.querySelector('#films video').readyState >= 1, null, {timeout: 20000});
      const sg = seg('cluster_story');
      let t = sg.start;
      while (t < sg.sceneEnd && !stateAt(frameTime(frameAt(t, 30), 30), fixtures, storyScript, clock).intermediate) t += 1 / 30;
      t += 0.5;
      await page.evaluate(t => new Promise(r => { const v = document.querySelector('#films video'); v.addEventListener('seeked', r, {once: true}); v.currentTime = t; }), t);
      const cur = await page.evaluate(() => { const c = window.rudyPlayer.current(); return {f: c.f, t: c.t, pos: c.state.board.positions, cue: c.state.cueId, inter: c.state.intermediate}; });
      await page.click('#films [data-a="try"]');
      s = await labState(page);
      check('try-this-frame transfers the exact interpolated coordinates', JSON.stringify(s.positions) === JSON.stringify(cur.pos) && cur.cue === sg.id && cur.inter, JSON.stringify({cur, lab: s.positions}));
      check('handoff keeps fixture and model', s.fixtureId === 'teacher' && s.model === 'P');
      check('lab shows the intermediate-frame notice', /中间帧/.test(await page.textContent('#lab .lab-banner')));
      const fx = seg('modelA_story');
      await page.evaluate(t => new Promise(r => { const v = document.querySelector('#films video'); v.addEventListener('seeked', r, {once: true}); v.currentTime = t; }), fx.sceneEnd - 0.2);
      await page.click('#films [data-a="try"]');
      s = await labState(page);
      check('handoff of a model-A frame carries the model', s.model === 'A');
      await page.selectOption('#films [data-k="capsel"]', 'en');
      const capL = fx.lines.find((L, i) => storyScript.cues.find(c => c.id === fx.id).lines[i].en);
      const capT = (capL.start + capL.end) / 2;
      await page.evaluate(t => new Promise(r => { const v = document.querySelector('#films video'); v.addEventListener('seeked', r, {once: true}); v.currentTime = t; }), capT);
      const capWant = await page.evaluate(() => window.rudyPlayer.current().state.caption?.en || '');
      check('English caption bar follows the frame', capWant.length > 10 && (await page.textContent('#films .caption-bar')) === capWant, capWant);
      await page.evaluate(t => new Promise(r => { const v = document.querySelector('#films video'); v.addEventListener('seeked', r, {once: true}); v.currentTime = t; }), fx.sceneEnd - 0.2);
      check('caption bar is empty in the silent tail after a cue', (await page.textContent('#films .caption-bar')) === '');
      const dur = await page.evaluate(() => document.querySelector('#films video').duration);
      check('video duration matches the clock (±1 frame)', Math.abs(dur - clock.duration) <= 1 / 30 + 1e-3, `${dur} vs ${clock.duration}`);
          // switching films: the advanced card loads its own video, clock and chapters
      await page.click('#films .film-card[data-film="advanced"]');
      await page.waitForFunction(() => window.rudyPlayer.current()?.film === 'advanced');
      const adv = index.find(e => e.id === 'advanced');
      check('film card switches video and chapters', (await page.getAttribute('#films video source', 'src')) === adv.langs.zh.video &&
        await page.locator('#films .chapters li').count() === readJ('site/data/films/advanced.clock.zh.json').segments.length);
      for (const e of index) for (const l of ['zh', 'en']) check(`film ${e.id}.${l} rendered`, existsSync(new URL(`site/${e.langs[l].video}`, ROOT)));
    } else check('full film present', false, 'site/media/story.zh.mp4 missing');

    // refresh at a hash
    await page.goto(BASE + '#lab'); await page.waitForFunction(() => window.appReady);
    check('refresh with #lab works', await page.evaluate(() => window.appReady === true));
    // slides viewer
    const slideSrc = await page.getAttribute('#slides .slide-img', 'src');
    check('slide viewer shows page 1 with notes', Boolean(slideSrc) && (await page.textContent('#slides .slide-notes')).length > 10, slideSrc);
    check('no page errors after interaction', errors.length === 0, errors.join('; '));
    await ctx.close();
  }

  // 2. English, phone width, reduced motion, touch
  {
    const {ctx, page, errors} = await open(BASE + '?lang=en', {viewport: {width: 390, height: 844}, reducedMotion: 'reduce', hasTouch: true, isMobile: true, deviceScaleFactor: 1});
    check('English page loads at 390 px', errors.length === 0 && await page.evaluate(() => document.documentElement.lang === 'en'), errors.join('; '));
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    check('no horizontal page overflow at 390 px', sw[0] <= sw[1], sw);
    const fontPx = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    check('body text at least 16 px on phone', fontPx >= 16, fontPx);
    const bw = await page.evaluate(() => document.querySelector('#lab .lab-board svg').getBoundingClientRect().width);
    check('lab board fits the phone width', bw <= 390 && bw > 300, bw);
    check('English page plays the English version of the film', await page.evaluate(() => document.querySelector('#films [data-k="vlang"]').value === 'en' && window.rudyPlayer.current().vlang === 'en'));
    await page.screenshot({path: new URL('build/page-en-390.png', ROOT).pathname, fullPage: false});
    await ctx.close();
  }

  // 3. Root path also works (no hard-coded /congestion-lesson04-rudy/)
  if (!baseArg) {
    const {ctx, page, errors} = await open(srvRoot.url);
    check('root path load without errors', errors.length === 0 && await page.evaluate(() => window.appReady === true), errors.join('; '));
    await ctx.close();
  }

  // 4. Missing resource: the film fails visibly, the rest of the page still works
  {
    const ctx = await browser.newContext({viewport: {width: 1200, height: 900}});
    const page = await ctx.newPage();
    await page.route('**/media/story.zh.mp4', r => r.fulfill({status: 404, body: 'missing'}));
    await page.goto(BASE); await page.waitForFunction(() => window.appReady);
    await page.waitForFunction(() => !document.querySelector('#films [data-k="err"]').hidden, null, {timeout: 10000}).catch(() => {});
    check('missing film shows an explicit error', await page.evaluate(() => !document.querySelector('#films [data-k="err"]').hidden));
    check('lab still works without the film', near(await labTotal(page), 22));
    await ctx.close();
    const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
    await p2.route('**/data/films/index.json', r => r.fulfill({status: 404, body: 'missing'}));
    await p2.goto(BASE); await p2.waitForFunction(() => window.appReady || window.appError);
    check('missing data shows a load error instead of a blank page', /index\.json/.test(await p2.textContent('#app')));
    await ctx2.close();
  }

  // 5. renderAt determinism: fresh 12.3 vs after 2 -> 27 -> 12.3, pixel-identical in this environment
  {
    const shot = async seq => {
      const {ctx, page} = await open(`${BASE}render.html?film=story&lang=zh`, {viewport: {width: 1920, height: 1080}});
      let snap;
      for (const t of seq) snap = await page.evaluate(t => window.renderAt(t), t);
      const png = await page.screenshot({clip: {x: 0, y: 0, width: 1920, height: 1080}});
      await ctx.close();
      return {png, snap};
    };
    for (const t of [12.3, seg('cluster_story').start, seg('cluster_story').lines.at(-1).start + 1.234, seg('modelA_story').start - 1e-3, clock.track.hits[2] + 0.01]) {
      const a = await shot([t]), b = await shot([2, 27, clock.duration, t]), c = await shot([t, 100, t]);
      check(`renderAt(${t.toFixed(3)}) same semantic state in any order`, JSON.stringify(a.snap) === JSON.stringify(b.snap) && JSON.stringify(a.snap) === JSON.stringify(c.snap));
      check(`renderAt(${t.toFixed(3)}) pixel-identical in any order`, a.png.equals(b.png) && a.png.equals(c.png));
    }
  }
} catch (e) {
  check('browser test harness', false, e.stack);
} finally {
  await browser.close();
  if (srv) await srv.close();
  if (srvRoot) await srvRoot.close();
}
function seg(scene) { return clock.segments[storyScript.cues.findIndex(c => (c.scene ?? c.id) === scene)]; }
mkdirSync(new URL('build/', ROOT), {recursive: true});
const passed = results.filter(r => r.ok).length;
writeFileSync(new URL('build/browser-report.json', ROOT), JSON.stringify({base: BASE, passed, total: results.length, results}, null, 1));
console.log(`\n${passed}/${results.length} browser checks passed`);
process.exit(passed === results.length ? 0 : 1);
