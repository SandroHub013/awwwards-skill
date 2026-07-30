/* colophon / no-JS / 320px / reduced-motion-zoom checks */
import puppeteer from "../docs/demos/stacco/render/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { readFile, mkdir } from "node:fs/promises";
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

// 1. colophon desktop: scroll past the journey
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL_, { waitUntil: "networkidle0" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 1400));
  const st = await page.evaluate(() => ({
    past: document.documentElement.classList.contains("is-past"),
    hudOpacity: getComputedStyle(document.querySelector(".hud")).opacity,
  }));
  console.log("colophon:", JSON.stringify(st));
  await page.screenshot({ path: join(OUT, "d-colophon.png") });
  await page.close();
}
// 2. no-JS
{
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL_, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: join(OUT, "nojs-top.png") });
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.screenshot({ path: join(OUT, "nojs-mid.png") });
  await page.close();
}
// 3. 320px + landscape phone overflow
{
  const page = await browser.newPage();
  for (const [w, h] of [[320, 568], [844, 390], [768, 1024], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h });
    await page.goto(URL_, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 500));
    const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`overflow ${w}x${h}:`, ov);
    if (w === 320) await page.screenshot({ path: join(OUT, "w320.png") });
    if (w === 1920) await page.screenshot({ path: join(OUT, "w1920.png") });
  }
  await page.close();
}
// 4. reduced motion: basoli beat must not zoom
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(URL_, { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    const max = document.querySelector("[data-journey]").offsetHeight - window.innerHeight;
    window.scrollTo(0, 0.62 * max);
  });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: join(OUT, "d-rm-basoli.png") });
  await page.close();
}
await browser.close();
server.close();
