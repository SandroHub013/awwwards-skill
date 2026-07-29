import puppeteer from "puppeteer-core";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DOCS = join(import.meta.dirname, "..", "..", "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".avif": "image/avif", ".mp4": "video/mp4" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const data = await readFile(join(DOCS, p));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--use-angle=default", "--hide-scrollbars"] });

for (const cfg of [{ name: "desktop", w: 1440, h: 900 }, { name: "mobile-viewport", w: 390, h: 844, mob: true }]) {
  const page = await browser.newPage();
  await page.setViewport({ width: cfg.w, height: cfg.h, isMobile: !!cfg.mob, hasTouch: !!cfg.mob });
  await page.goto(`http://127.0.0.1:${port}/demos/soglia/index.html`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500)); // let s0+c0 finish loading
  const res = await page.evaluate(() => new Promise((done) => {
    const deltas = [];
    let last = performance.now();
    function tick(now) {
      deltas.push(now - last); last = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    const f = document.querySelector("[data-flight]");
    const max = f.offsetHeight - innerHeight;
    const T = 8000, t0 = performance.now();
    (function step() {
      const p = Math.min((performance.now() - t0) / T, 1);
      scrollTo(0, max * p);
      if (p < 1) setTimeout(step, 16);
      else setTimeout(() => done({ deltas }), 400);
    })();
  }));
  const d = res.deltas.slice(2, -2);
  const fps = d.map((x) => 1000 / x);
  const avg = fps.reduce((a, b) => a + b, 0) / fps.length;
  const p05 = fps.sort((a, b) => a - b)[Math.floor(fps.length * 0.05)];
  const longFrames = d.filter((x) => x > 33).length;
  console.log(`${cfg.name}: avg ${avg.toFixed(1)} fps, p5 ${p05.toFixed(1)} fps, frames>33ms ${longFrames}/${d.length} (${(100 * longFrames / d.length).toFixed(1)}%)`);
  await page.close();
}
await browser.close(); server.close();
