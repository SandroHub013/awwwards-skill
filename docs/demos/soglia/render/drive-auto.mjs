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

const y = () => page.evaluate(() => Math.round(scrollY));
const pressed = () => page.evaluate(() => document.querySelector("[data-auto]").getAttribute("aria-pressed"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.evaluate(() => new Promise((r) => { if (document.readyState === "complete") r(); else addEventListener("load", r); }));
console.log("t=0    y:", await y(), "playing:", await pressed());
await sleep(4000);
console.log("t=4s   y:", await y(), "playing:", await pressed());

// wheel pauses
await page.mouse.move(720, 450);
await page.mouse.wheel({ deltaY: 120 });
await sleep(300);
const yPaused = await y();
console.log("wheel  y:", yPaused, "playing:", await pressed());
await sleep(1200);
console.log("still  y:", await y(), "(should not advance)");

// space resumes
await page.keyboard.press("Space");
await sleep(2000);
console.log("space  y:", await y(), "playing:", await pressed());

// click on empty stage pauses
await page.mouse.click(1100, 300);
await sleep(300);
console.log("click  y:", await y(), "playing:", await pressed());

// button resumes
await page.click("[data-auto]");
await sleep(1500);
console.log("button y:", await y(), "playing:", await pressed());

console.log("page errors:", errors.length ? errors : "none");
await browser.close(); server.close();
