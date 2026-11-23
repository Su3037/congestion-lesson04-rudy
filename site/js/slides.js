// Slide deck renderer: each slide is HTML with a figure drawn by the shared Board() from the fixtures.
import {prepareFixtures, makeState} from './domain.js';
import {Board, escapeText as E} from './board.js';
import {TEXT} from './content.js';

let figN = 0;
export function slideFigure(fixtures, spec, lang) {
  const fx = fixtures[spec.fixture];
  const st = makeState(fx, spec.placement, {selectedNet: spec.selectedNet ?? null, layer: spec.layer ?? 'demand', model: spec.model ?? 'P', ...(spec.capacity ? {capacity: spec.capacity} : {}), ...(spec.upto !== undefined ? {upto: spec.upto} : {})});
  const view = {...st, showBoxes: spec.showBoxes ?? 'none', visibleNets: spec.visibleNets, highlights: spec.highlights ?? {}};
  return Board(view, {width: 680, height: 640, lang, id: `slide-fig-${spec.fixture}-${spec.placement}-${++figN}`});
}

export function renderDeck(root, {fixtures, slides, lang}) {
  const n = slides.length;
  root.innerHTML = slides.map((s, i) => {
    const t = s[lang];
    const fig = s.fig ? `<div class="s-fig">${slideFigure(fixtures, s.fig, lang)}</div>` : s.code ? `<pre class="s-code">${E(TEXT[lang].pseudo)}</pre>` : '';
    return `<section class="slide ${i === 0 ? 'title-slide' : ''}" data-i="${i + 1}"><h1>${E(t.title)}</h1><div class="s-body"><ul>${t.bullets.map(b => `<li>${E(b)}</li>`).join('')}</ul>${fig}</div>
      <footer><span>Congestion Lesson 04 · ${lang === 'zh' ? 'RUDY 拥塞估计' : 'RUDY congestion estimate'}</span><span class="pn">p${i + 1}/${n}</span></footer></section>`;
  }).join('');
}

export async function boot() {
  const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  const [fx, deck] = await Promise.all([fetch('data/fixtures.json').then(r => r.json()), fetch('data/slides.json').then(r => r.json())]);
  renderDeck(document.getElementById('deck'), {fixtures: prepareFixtures(fx), slides: deck.slides, lang});
  await document.fonts.ready;
  window.deck = deck; window.slidesReady = true;
}
