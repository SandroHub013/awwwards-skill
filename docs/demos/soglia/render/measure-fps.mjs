import puppeteer from "puppeteer-core";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { createStaticHandler, summariseFrames, formatFrames } from "./lib.mjs";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DOCS = join(import.meta.dirname, "..", "..", "..");
const server = createServer(createStaticHandler({ root: DOCS, readFile }));
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
  console.log(formatFrames(cfg.name, summariseFrames(res.deltas, { trim: 2 })));
  await page.close();
}
await browser.close(); server.close();
