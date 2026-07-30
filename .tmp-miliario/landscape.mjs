import puppeteer from "../docs/demos/stacco/render/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { readFile, mkdir } from "node:fs/promises";
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
await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument(() => {
  const orig = window.matchMedia.bind(window);
  window.matchMedia = (q) => q.includes("pointer: coarse")
    ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : orig(q);
});
await page.goto(`http://127.0.0.1:${port}/docs/demos/miliario/`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: join(import.meta.dirname, "shots", "landscape.png") });
await browser.close(); server.close();
