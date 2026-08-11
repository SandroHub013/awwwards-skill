/* Offline frame capture: drives render/index.html through the flight and saves PNGs.
   Usage:
     node capture.mjs --scout 0,0.09,0.18,0.27        # single frames for art direction
     node capture.mjs --out frames --frames 936 --w 1920 --h 1080
     node capture.mjs --out frames-m --frames 936 --w 720 --h 1280 --fov 55 */
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  parseArgs, numArg, mimeFor, resolveRequestPath,
  frameName, scoutName, frameTime, frameRange, parseScoutStops, dataUrlToBuffer,
} from "./lib.mjs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const args = parseArgs(process.argv.slice(2));

const W = numArg(args, "w", 1920), H = numArg(args, "h", 1080), FOV = numArg(args, "fov", 42);
const OUT = typeof args.out === "string" ? args.out : "frames";

// tiny static server so the CDN import and module graph behave exactly like prod
const server = createServer(async (req, res) => {
  const rel = resolveRequestPath(req.url);
  if (rel === null) { res.writeHead(400); res.end(); return; }
  try {
    const path = join(import.meta.dirname, rel);
    const data = await readFile(path);
    res.writeHead(200, { "content-type": mimeFor(path) });
    res.end(data);
  } catch (err) {
    // ENOENT is the ordinary 404; anything else is a broken harness, and a
    // silent 404 there costs a debugging afternoon (the page just never readies)
    if (err.code !== "ENOENT") console.error(`static server: ${req.url} → ${err.code ?? err.message}`);
    res.writeHead(404); res.end();
  }
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
  for (const t of parseScoutStops(args.scout)) {
    const data = await page.evaluate((t) => window.__render(t), t);
    const name = `${OUT}/${scoutName(t)}`;
    await writeFile(name, dataUrlToBuffer(data));
    console.log(name);
  }
} else {
  const N = numArg(args, "frames", 936);
  const { from, to } = frameRange(args, N);
  const t0 = Date.now();
  for (let i = from; i <= to; i++) {
    const t = frameTime(i, N);
    const data = await page.evaluate((t) => window.__render(t), t);
    await writeFile(`${OUT}/${frameName(i)}`, dataUrlToBuffer(data));
    if (i % 50 === 0) console.log(`${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}

await browser.close();
server.close();
