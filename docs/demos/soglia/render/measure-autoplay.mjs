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
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/demos/soglia/index.html`, { waitUntil: "networkidle2", timeout: 60000 });
await page.evaluate(() => new Promise((r) => { if (document.readyState === "complete") r(); else addEventListener("load", r); }));

// rAF deltas during 12s of autoplay
await page.evaluate(() => {
  window.__d = [];
  let last = performance.now();
  (function tick(now) {
    window.__d.push(now - last); last = now;
    requestAnimationFrame(tick);
  })();
});
await new Promise((r) => setTimeout(r, 12000));
const out = await page.evaluate(() => {
  const d = window.__d.slice(5, -5);
  const actives = [...document.querySelectorAll(".scene video")].map((v) => ({
    paused: v.paused, t: +v.currentTime.toFixed(2), dur: +(v.duration || 0).toFixed(2),
    rate: +v.playbackRate.toFixed(3),
  }));
  return { deltas: d, actives, y: Math.round(scrollY) };
});
const fps = out.deltas.map((x) => 1000 / x);
const avg = fps.reduce((a, b) => a + b, 0) / fps.length;
const long = out.deltas.filter((x) => x > 33).length;
console.log(`autoplay 12s: avg ${avg.toFixed(1)} fps, long frames ${long}/${out.deltas.length} (${(100 * long / out.deltas.length).toFixed(1)}%), y=${out.y}`);
console.log("videos:", JSON.stringify(out.actives));
console.log("errors:", errors.length ? errors : "none");
await browser.close(); server.close();
