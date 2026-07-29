/* Offline frame capture: drives render/index.html through the flight and saves PNGs.
   Usage:
     node capture.mjs --scout 0,0.09,0.18,0.27        # single frames for art direction
     node capture.mjs --out frames --frames 936 --w 1920 --h 1080
     node capture.mjs --out frames-m --frames 936 --w 720 --h 1280 --fov 55 */
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) =>
  a.startsWith("--") ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true] : null).filter(Boolean));

const W = +(args.w || 1920), H = +(args.h || 1080), FOV = +(args.fov || 42);
const OUT = args.out || "frames";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };

// tiny static server so the CDN import and module graph behave exactly like prod
const server = createServer(async (req, res) => {
  try {
    const path = join(import.meta.dirname, req.url.split("?")[0] === "/" ? "index.html" : req.url.split("?")[0]);
    const data = await readFile(path);
    res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--use-angle=default", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
page.on("pageerror", (e) => console.error("PAGE ERROR:", String(e)));
await page.goto(`http://127.0.0.1:${port}/index.html?w=${W}&h=${H}&fov=${FOV}`, { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForFunction("window.__ready === true", { timeout: 30000 });

await mkdir(OUT, { recursive: true });

if (args.scout) {
  for (const t of String(args.scout).split(",").map(Number)) {
    const data = await page.evaluate((t) => window.__render(t), t);
    const name = `${OUT}/scout-${String(t).replace(".", "_")}.png`;
    await writeFile(name, Buffer.from(data.split(",")[1], "base64"));
    console.log(name);
  }
} else {
  const N = +(args.frames || 936);
  const from = +(args.from || 0), to = +(args.to || N - 1);
  const t0 = Date.now();
  for (let i = from; i <= to; i++) {
    const t = i / (N - 1);
    const data = await page.evaluate((t) => window.__render(t), t);
    await writeFile(`${OUT}/${String(i).padStart(5, "0")}.png`, Buffer.from(data.split(",")[1], "base64"));
    if (i % 50 === 0) console.log(`${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}

await browser.close();
server.close();
