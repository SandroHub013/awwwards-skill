/* Measure the demo like the skill says to: real numbers, not vibes.
   - first-view transfer + LCP on a cold load
   - prefers-reduced-motion: zero video elements, stills carry the journey
   - keyboard: tab to a route dot, Enter, page must move
   Usage: node measure.mjs */
import puppeteer from "puppeteer-core";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DOCS = join(import.meta.dirname, "..", "..", "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".avif": "image/avif", ".mp4": "video/mp4", ".json": "application/json" };

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

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--use-angle=default", "--hide-scrollbars"],
});
const out = {};

// ── 1. cold load: transfer + LCP ──
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setCacheEnabled(false);
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  let bytes = 0; const byType = {};
  cdp.on("Loading finished".replace(" ", ""), () => {});
  cdp.on("Network.loadingFinished", (e) => {
    bytes += e.encodedDataLength;
    byType[e.type] = (byType[e.type] || 0) + e.encodedDataLength;
  });
  await page.evaluateOnNewDocument(() => {
    window.__lcp = 0;
    new PerformanceObserver((l) => {
      const e = l.getEntries().at(-1);
      if (e) window.__lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/demos/soglia/index.html`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  out.coldLoad = {
    lcpMs: await page.evaluate(() => Math.round(window.__lcp)),
    wallMs: Date.now() - t0,
    transferBytes: bytes,
    byType,
    videoElements: await page.evaluate(() => document.querySelectorAll("video").length),
  };
  await page.close();
}

// ── 2. reduced motion ──
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(`http://127.0.0.1:${port}/demos/soglia/index.html`, { waitUntil: "networkidle2", timeout: 60000 });
  for (const p of [0.3, 0.6, 1]) {
    await page.evaluate((p) => {
      const f = document.querySelector("[data-flight]");
      scrollTo(0, (f.offsetHeight - innerHeight) * p);
    }, p);
    await new Promise((r) => setTimeout(r, 600));
  }
  out.reducedMotion = {
    videoElements: await page.evaluate(() => document.querySelectorAll("video").length),
    scenesVisible: await page.evaluate(() =>
      [...document.querySelectorAll(".scene")].filter((s) => +s.style.opacity > 0.3).length),
  };
  await page.close();
}

// ── 3. keyboard ──
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${port}/demos/soglia/index.html`, { waitUntil: "networkidle2", timeout: 60000 });
  const before = await page.evaluate(() => scrollY);
  let focused = null;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    focused = await page.evaluate(() => document.activeElement && document.activeElement.dataset
      ? document.activeElement.dataset.jump ?? document.activeElement.tagName : null);
    if (focused === "3") break;
  }
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 1600));
  out.keyboard = {
    reachedDot: focused,
    yBefore: before,
    yAfter: await page.evaluate(() => Math.round(scrollY)),
  };
  await page.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
server.close();
