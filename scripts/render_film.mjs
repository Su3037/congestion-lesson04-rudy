// Render the film deterministically: open render.html, call renderAt(i / fps)
// for every frame, screenshot, pipe PNGs into FFmpeg.
//   node scripts/render_film.mjs --cut sample|full [--lang zh|en] [--stills]
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import * as F from "../site/js/film.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const cut = arg("--cut", "full"), lang = arg("--lang", "zh");
const stills = process.argv.includes("--stills");
const out = path.join(root, "media/out"); fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(path.join(root, "dist/film/render.html"))) execFileSync("node", [path.join(root, "scripts/build_site.mjs")], { stdio: "inherit" });

const port = 8800 + Math.floor(Math.random() * 100);
const srv = await serve(port);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${port}/congestion-lesson04-rudy/film/render.html?cut=${cut}&lang=${lang}`);
await page.evaluate(() => window.ready);
const clock = await page.evaluate(() => window.clock);
await F.loadFixture();
const stage = page.locator("#stage");

if (stills) {
  // one still per cue midpoint + a contact sheet
  const dir = path.join(root, "media/stills", `${cut}-${lang}`); fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const sc of F.timeline(cut).scenes) for (const c of sc.cues) {
    const t = (c.start + c.end) / 2 + 0.4;
    await page.evaluate((tt) => window.renderAt(tt), t);
    await stage.screenshot({ path: path.join(dir, `${String(n++).padStart(3, "0")}-${sc.id}.png`) });
  }
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-pattern_type", "glob", "-i", path.join(dir, "*.png"), "-vf", "scale=426:240,tile=6x" + Math.ceil(n / 6), "-frames:v", "1", path.join(out, `contact-${cut}-${lang}.jpg`)]);
  console.log(`${n} stills in ${dir}`);
} else {
  const nFrames = Math.round(clock.duration * clock.fps);
  const file = path.join(out, `rudy-${cut}.${lang}.mp4`);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(clock.fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-tune", "animation", "-movflags", "+faststart",
    "-metadata", `title=RUDY congestion estimate (${cut}, ${lang}, silent captioned)`, "-metadata", "comment=Code-drawn; see docs/REPRODUCIBILITY.md", file], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let i = 0; i < nFrames; i++) {
    await page.evaluate((tt) => window.renderAt(tt), i / clock.fps);
    const png = await stage.screenshot({ type: "png" });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 900 === 0) console.log(`frame ${i}/${nFrames} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  fs.writeFileSync(path.join(out, `rudy-${cut}.zh.vtt`), F.vtt(cut, "zh"));
  fs.writeFileSync(path.join(out, `rudy-${cut}.en.vtt`), F.vtt(cut, "en"));
  console.log("wrote", file, nFrames, "frames");
}
await browser.close();
srv.close();
