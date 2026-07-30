/* FPS under 4x CPU throttle + thumbnail/og captures */
import puppeteer from "../docs/demos/stacco/render/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = join(import.meta.dirname, "..");
const OUT = join(import.meta.dirname, "shots");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const data = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const URL_ = `http://127.0.0.1:${port}/docs/demos/miliario/`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--hide-scrollbars"] });
await mkdir(OUT, { recursive: true });

// FPS: 12s continuous scroll sweep, 4x CPU throttle
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(URL_, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  const res = await page.evaluate(() => new Promise((done) => {
    const max = document.querySelector("[data-journey]").offsetHeight - window.innerHeight;
    const deltas = [];
    let last = performance.now(), start = last;
    function frame(t) {
      deltas.push(t - last); last = t;
      const p = Math.min((t - start) / 12000, 1);
      window.scrollTo(0, p * max);
      if (p < 1) requestAnimationFrame(frame);
      else {
        deltas.sort((a, b) => a - b);
        const q = (f) => deltas[Math.floor(deltas.length * f)];
        done({ n: deltas.length, median: q(0.5), p95: q(0.95),
          worst: deltas[deltas.length - 1], over33: deltas.filter((d) => d > 33).length });
      }
    }
    requestAnimationFrame(frame);
  }));
  console.log("fps 4x:", JSON.stringify(res));
  await page.close();
}

// thumbnail candidates 960×540
{
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540 });
  await page.goto(URL_, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: join(OUT, "thumb-hero.png") });
  await page.evaluate(() => {
    const max = document.querySelector("[data-journey]").offsetHeight - window.innerHeight;
    window.scrollTo(0, 0.30 * max);
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: join(OUT, "thumb-road.png") });
  await page.close();
}
// og.jpg 1200×630 at hero
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.goto(URL_, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: join(ROOT, "docs/demos/miliario/og.jpg"), type: "jpeg", quality: 86 });
  await page.close();
}
await browser.close();
server.close();
console.log("done");
