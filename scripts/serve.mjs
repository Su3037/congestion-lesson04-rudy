// Tiny static server that mounts dist/ at /congestion-lesson04-rudy/ like GitHub Pages.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", process.env.SERVE_DIR || "dist");
const BASE = "/congestion-lesson04-rudy/";
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".mp4": "video/mp4", ".vtt": "text/vtt; charset=utf-8", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".py": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".csv": "text/csv" };
export function serve(port = Number(process.env.PORT || 8765)) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (!u.startsWith(BASE)) { res.writeHead(404); return res.end("outside base path"); }
    let f = path.join(root, u.slice(BASE.length));
    if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) { const nf = path.join(root, "404.html"); res.writeHead(404, { "content-type": types[".html"] }); return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "not found"); }
    res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(port, () => r(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) serve().then(() => console.log("http://localhost:" + (process.env.PORT || 8765) + BASE));
