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
  const d = window.__d;
  const actives = [...document.querySelectorAll(".scene video")].map((v) => ({
    paused: v.paused, t: +v.currentTime.toFixed(2), dur: +(v.duration || 0).toFixed(2),
    rate: +v.playbackRate.toFixed(3),
  }));
  return { deltas: d, actives, y: Math.round(scrollY) };
});
console.log(`${formatFrames("autoplay 12s", summariseFrames(out.deltas, { trim: 5 }))}, y=${out.y}`);
console.log("videos:", JSON.stringify(out.actives));
console.log("errors:", errors.length ? errors : "none");
await browser.close(); server.close();
