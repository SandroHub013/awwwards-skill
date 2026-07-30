/* miliario verification: screenshots + console/network/weight + keyboard checks.
   Reuses the stacco puppeteer-core install via NODE_PATH. */
import puppeteer from "../docs/demos/stacco/render/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = join(import.meta.dirname, "..");
const OUT = join(import.meta.dirname, "shots");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".json": "application/json" };

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

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
await mkdir(OUT, { recursive: true });

async function run(name, { w, h, touch = false, reduce = false }) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1,
    isMobile: touch, hasTouch: touch });
  const feats = [];
  if (reduce) feats.push({ name: "prefers-reduced-motion", value: "reduce" });
  if (feats.length) await page.emulateMediaFeatures(feats);
  if (touch) await page.evaluateOnNewDocument(() => {
    // il puppeteer di casa non emula (pointer: coarse): forziamo la media query
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q) => q.includes("pointer: coarse")
      ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} }
      : orig(q);
  });

  const errors = [], failed = [];
  let bytes = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", async (r) => { try { bytes += (await r.buffer()).length; } catch {} });

  await page.goto(URL_, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 900));

  const mode = await page.evaluate(() => document.documentElement.dataset.mode);
  const stats = await page.evaluate(() => ({
    mode: document.documentElement.dataset.mode,
    maxOff: document.querySelector("[data-journey]").offsetHeight - window.innerHeight,
    scrollW: document.querySelector("[data-scene]").scrollWidth,
    clientW: document.querySelector("[data-scene]").clientWidth,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));

  const go = async (f) => {
    await page.evaluate((f) => {
      const scene = document.querySelector("[data-scene]");
      if (document.documentElement.dataset.mode === "touch")
        scene.scrollLeft = f * (scene.scrollWidth - scene.clientWidth);
      else {
        const max = document.querySelector("[data-journey]").offsetHeight - window.innerHeight;
        window.scrollTo(0, f * max);
      }
    }, f);
    await new Promise((r) => setTimeout(r, 1700));
  };

  const stops = [0, 0.08, 0.3, 0.42, 0.62, 0.97];
  for (const f of stops) {
    await go(f);
    const hud = await page.evaluate(() => ({
      mp: document.querySelector("[data-mp]").textContent,
      km: document.querySelector("[data-km]").textContent,
      stop: document.querySelector("[data-stop]").textContent,
      tabula: document.querySelector("[data-tabula-stop]").textContent,
    }));
    console.log(`${name} f=${f} MP ${hud.mp} km ${hud.km} — ${hud.stop} | tabula: ${hud.tabula}`);
    await page.screenshot({ path: join(OUT, `${name}-${String(f).replace(".", "p")}.png`) });
  }

  // keyboard
  let keys = {};
  if (!touch) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.press("End");
    await new Promise((r) => setTimeout(r, 300));
    const afterEnd = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Home");
    await new Promise((r) => setTimeout(r, 300));
    await page.keyboard.press("PageDown");
    await new Promise((r) => setTimeout(r, 300));
    const afterPg = await page.evaluate(() => window.scrollY);
    keys = { afterEnd, afterPg };
  } else {
    await page.evaluate(() => document.querySelector("[data-scene]").focus());
    await page.keyboard.press("ArrowRight");
    await new Promise((r) => setTimeout(r, 700));
    const sl = await page.evaluate(() => document.querySelector("[data-scene]").scrollLeft);
    keys = { arrowRightScrollLeft: sl };
  }

  console.log(`${name} mode=${mode} overflowX=${stats.overflowX} keys=${JSON.stringify(keys)} bytes=${(bytes / 1024).toFixed(1)}KB failed=${failed.length} errors=${errors.length ? JSON.stringify(errors) : "none"}`);
  await page.close();
}

await run("d", { w: 1440, h: 900 });
await run("d-rm", { w: 1440, h: 900, reduce: true });
await run("m", { w: 390, h: 844, touch: true });

await browser.close();
server.close();
