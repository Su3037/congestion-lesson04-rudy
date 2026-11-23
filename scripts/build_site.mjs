// Build the static site into dist/. Deterministic: no timestamps, no network.
// Every URL in the site is relative, so it works at /congestion-lesson04-rudy/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, process.env.DIST || "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, "site"), dist, { recursive: true });

// Fonts (SIL OFL 1.1): woff2 subsets + a rewritten stylesheet.
const fontOut = path.join(dist, "fonts"); fs.mkdirSync(fontOut, { recursive: true });
let css = "/* Noto Sans SC and JetBrains Mono, SIL Open Font License 1.1, via @fontsource (see fonts/LICENSE-*.txt) */\n";
for (const [pkg, weights] of [["noto-sans-sc", [400, 700]], ["jetbrains-mono", [400, 700]]]) {
  const dir = path.join(root, "node_modules/@fontsource", pkg);
  for (const w of weights) {
    let c = fs.readFileSync(path.join(dir, `${w}.css`), "utf8");
    c = c.replace(/, url\([^)]*\.woff\) format\('woff'\)/g, "");
    for (const m of c.matchAll(/url\(\.\/files\/([^)]+\.woff2)\)/g)) fs.copyFileSync(path.join(dir, "files", m[1]), path.join(fontOut, m[1]));
    css += c.replace(/url\(\.\/files\//g, "url(./") + "\n";
  }
  fs.copyFileSync(path.join(dir, "LICENSE"), path.join(fontOut, `LICENSE-${pkg}.txt`));
}
fs.writeFileSync(path.join(fontOut, "fonts.css"), css);

// Downloads: Python practice kit and fixtures.
const dl = path.join(dist, "downloads"); fs.mkdirSync(dl, { recursive: true });
for (const f of ["rudy_ref.py", "starter.py", "check.py", "fixture.json", "expected.json", "README.md"]) {
  const src = path.join(root, "python", f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dl, f));
}
// Media (rendered separately, committed under media/out).
const media = path.join(root, "media/out");
if (fs.existsSync(media)) fs.cpSync(media, path.join(dist, "media"), { recursive: true });
for (const f of ["slides/rudy-slides.zh.pdf", "slides/rudy-slides.en.pdf"]) if (fs.existsSync(path.join(root, f))) { fs.mkdirSync(path.join(dist, "slides"), { recursive: true }); fs.copyFileSync(path.join(root, f), path.join(dist, f)); }
fs.writeFileSync(path.join(dist, ".nojekyll"), "");
console.log("built", dist);
