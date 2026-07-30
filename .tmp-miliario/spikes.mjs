import puppeteer from "../docs/demos/stacco/render/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = join(import.meta.dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try { let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
    const data = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "shell", args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto(`http://127.0.0.1:${port}/docs/demos/miliario/`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 500));
const res = await page.evaluate(() => new Promise((done) => {
  const max = document.querySelector("[data-journey]").offsetHeight - window.innerHeight;
  const deltas = []; let last = performance.now(), start = last;
  (function frame(t) {
    const p = Math.min((t - start) / 10000, 1);
    deltas.push([t - last, p]); last = t;
    window.scrollTo(0, p * max);
    if (p < 1) requestAnimationFrame(frame);
    else {
      const zones = {};
      for (const [d, pr] of deltas) { const z = (Math.floor(pr * 10) / 10).toFixed(1); (zones[z] ??= []).push(d); }
      const out = {};
      for (const [z, arr] of Object.entries(zones)) { arr.sort((a,b)=>a-b); out[z] = { n: arr.length, med: Math.round(arr[arr.length>>1]), max: Math.round(arr[arr.length-1]) }; }
      done(out);
    }
  })(last);
}));
console.log(JSON.stringify(res, null, 1));
await browser.close(); server.close();
