/* Offline frame capture. Drives render/index.html shot by shot and writes PNGs
   into one directory per shot — because in this film the shot IS the file, the
   capture has no global frame numbering to get wrong.

   Usage:
     node capture.mjs --scout                       # 3 frames per shot, for art direction
     node capture.mjs --scout --shot 04 --at 0.6    # one frame, one shot
     node capture.mjs --out frames   --w 1920 --h 804
     node capture.mjs --out frames-m --w 720  --h 900     # the portrait re-frame */
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) =>
  a.startsWith("--") ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true] : null)
  .filter(Boolean));

const W = +(args.w || 1920), H = +(args.h || 804);
const OUT = args.out || "frames";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };

// a tiny static server, so the CDN import and the module graph behave as in prod
const server = createServer(async (req, res) => {
  try {
    const p = req.url.split("?")[0];
    const path = join(import.meta.dirname, p === "/" ? "index.html" : p);
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
page.on("console", (m) => { if (m.type() === "error") console.error("CONSOLE:", m.text()); });
await page.goto(`http://127.0.0.1:${port}/index.html?w=${W}&h=${H}`,
  { waitUntil: "networkidle0", timeout: 90000 });
await page.waitForFunction("window.__ready === true", { timeout: 60000 });

const shots = await page.evaluate(() => window.__shots);
const meta = await page.evaluate(() => window.__meta);
console.log(`${shots.length} shots · ${meta.totalFrames} frames · ${meta.totalSecs.toFixed(1)}s @ ${W}x${H}`);

const png = (data) => Buffer.from(data.split(",")[1], "base64");
const only = args.shot ? String(args.shot) : null;

if (args.scout) {
  await mkdir("scout", { recursive: true });
  const ats = args.at ? [+args.at] : [0.04, 0.5, 0.96];
  for (let i = 0; i < shots.length; i++) {
    if (only && !shots[i].id.startsWith(only)) continue;
    for (const at of ats) {
      const data = await page.evaluate((i, u) => window.__renderFrame(i, u), i, at);
      const name = `scout/${shots[i].id}-${String(at).replace(".", "_")}.png`;
      await writeFile(name, png(data));
      console.log(name);
    }
  }
} else {
  const t0 = Date.now();
  let done = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (only && !s.id.startsWith(only)) { done += s.frames; continue; }
    const dir = join(OUT, s.id);
    await mkdir(dir, { recursive: true });
    for (let f = 0; f < s.frames; f++) {
      // u = f / frames, not f / (frames - 1): every frame is one 24th of a
      // second wide, and no frame is rendered twice
      const data = await page.evaluate((i, u) => window.__renderFrame(i, u), i, f / s.frames);
      await writeFile(join(dir, `${String(f).padStart(5, "0")}.png`), png(data));
      done++;
      if (done % 40 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${meta.totalFrames}  ${el.toFixed(0)}s  eta ${(el / done * (meta.totalFrames - done)).toFixed(0)}s`);
      }
    }
    console.log(`== ${s.id} done (${s.frames} frames)`);
  }
}

await browser.close();
server.close();
