/* Drive the demo in headless Chrome: scroll through the flight, screenshot,
   and report console errors + clip state. Usage: node drive.mjs [mobile] */
import puppeteer from "puppeteer-core";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const MOBILE = process.argv.includes("mobile");
const DOCS = join(import.meta.dirname, "..", "..", "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".avif": "image/avif", ".mp4": "video/mp4", ".png": "image/png", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".json": "application/json" };

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
  args: ["--no-sandbox", "--use-angle=default", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport(MOBILE ? { width: 390, height: 844, isMobile: true, hasTouch: true }
                              : { width: 1440, height: 900 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("requestfailed", (r) => errors.push(`REQ FAIL ${r.url()}`));

await page.goto(`http://127.0.0.1:${port}/demos/soglia/index.html`, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

await mkdir("shots", { recursive: true });
const tag = MOBILE ? "m" : "d";
const stops = [0, 0.12, 0.22, 0.35, 0.5, 0.62, 0.78, 0.9, 1.0];
for (const p of stops) {
  await page.evaluate((p) => {
    const f = document.querySelector("[data-flight]");
    const max = f.offsetHeight - innerHeight;
    scrollTo(0, Math.min(max * p, document.body.scrollHeight - innerHeight));
  }, p);
  await new Promise((r) => setTimeout(r, 900));
  const state = await page.evaluate(() => {
    const scenes = [...document.querySelectorAll(".scene")];
    return {
      y: Math.round(scrollY),
      clips: scenes.filter((s) => s.classList.contains("has-clip")).length,
      videos: scenes.filter((s) => s.querySelector("video")).length,
      visible: scenes.filter((s) => +s.style.opacity > 0.5).map((s) => s.dataset.scene || "s0-porta"),
    };
  });
  console.log(`p=${p}`, JSON.stringify(state));
  await page.screenshot({ path: `shots/${tag}-${String(p).replace(".", "_")}.png` });
}

// epilogue
await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: `shots/${tag}-epilogo.png` });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
server.close();
