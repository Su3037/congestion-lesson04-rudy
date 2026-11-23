// Export the slide deck (site/js/slides.js) to PDF, one 1280×720 page per slide,
// plus Markdown speaker notes. Uses the same fonts as the site.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { setFixture } from "../site/js/film.js";
import { slides, slideSVG } from "../site/js/slides.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = process.env.SERVE_DIR || "dist";
const fx = JSON.parse(fs.readFileSync(path.join(root, "site/data/fixture.json"), "utf8"));
setFixture(fx);
fs.mkdirSync(path.join(root, "slides"), { recursive: true });
const port = 8700 + Math.floor(Math.random() * 90);
const srv = await serve(port);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const lang of ["zh", "en"]) {
  const all = slides(fx);
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../fonts/fonts.css"><style>@page{size:1280px 720px;margin:0}html,body{margin:0;background:#0b1020}.p{width:1280px;height:720px;page-break-after:always;overflow:hidden}.p:last-child{page-break-after:auto}svg{display:block}</style></head><body>${all.map((_, k) => `<div class="p">${slideSVG(fx, k, lang)}</div>`).join("")}</body></html>`;
  const tmp = path.join(root, dist, "slides", `_print.${lang}.html`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, html);
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/congestion-lesson04-rudy/slides/_print.${lang}.html`);
  await page.evaluate(async () => { await document.fonts.load("16px 'Noto Sans SC'", document.body.textContent); await document.fonts.load("700 16px 'Noto Sans SC'", document.body.textContent); await document.fonts.load("16px 'JetBrains Mono'", "abc"); await document.fonts.ready; });
  await page.pdf({ path: path.join(root, "slides", `rudy-slides.${lang}.pdf`), width: "1280px", height: "720px", printBackground: true });
  await page.close();
  fs.rmSync(tmp);
  const md = [`# ${lang === "zh" ? "RUDY 课件讲者备注" : "RUDY slides: speaker notes"}`, "", ...all.flatMap((s, k) => [`## ${k + 1}. ${s.title[lang]}`, "", s.notes[lang], ""])].join("\n");
  fs.writeFileSync(path.join(root, "slides", `notes.${lang}.md`), md);
  console.log("slides", lang, all.length);
}
await browser.close(); srv.close();
