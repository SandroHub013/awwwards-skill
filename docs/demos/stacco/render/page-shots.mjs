/* Screenshot the built page at one scroll stop per shot, desktop and portrait.
   This is the check that the ENGINE agrees with the EDIT: at stop N the visible
   figure must be shot N, the slate must say shot N, and the copy must be shot
   N's copy. Anything else is the cut engine lying. */
import puppeteer from "puppeteer-core";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = join(import.meta.dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".avif": "image/avif", ".mp4": "video/mp4", ".json": "application/json", ".png": "image/png" };

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

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"],
});

await mkdir(join(import.meta.dirname, "page"), { recursive: true });
const errors = [];

for (const view of [{ n: "d", w: 1440, h: 900 }, { n: "m", w: 390, h: 844 }]) {
  const page = await browser.newPage();
  await page.setViewport({ width: view.w, height: view.h, deviceScaleFactor: 1,
    isMobile: view.n === "m", hasTouch: view.n === "m" });
  page.on("pageerror", (e) => errors.push(`${view.n}: ${String(e)}`));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("wheel")));
  await new Promise((r) => setTimeout(r, 600));

  const stops = await page.evaluate(() => {
    // pause autoplay so a stop is a stop
    window.dispatchEvent(new WheelEvent("wheel"));
    return null;
  });

  const n = 9;
  for (let i = 0; i < n; i++) {
    const y = await page.evaluate((i) => {
      const total = document.querySelector("[data-film]").offsetHeight - window.innerHeight;
      const secs = [5, 4.5, 5, 4, 3.5, 5, 4, 4.5, 5.5];
      const sum = secs.reduce((a, b) => a + b, 0);
      let acc = 0;
      for (let k = 0; k < i; k++) acc += secs[k];
      const t = (acc + secs[i] * 0.45) / sum;
      const target = Math.round(t * (total + window.innerHeight) * (sum * 0.25) / (sum * 0.25 + 1));
      window.scrollTo(0, target);
      return target;
    }, i);
    await new Promise((r) => setTimeout(r, 700));
    const state = await page.evaluate(() => ({
      slate: document.querySelector("[data-slate-shot]").textContent,
      lens: document.querySelector("[data-slate-lens]").textContent,
      tc: document.querySelector("[data-slate-tc]").textContent,
      on: document.querySelector(".shot.is-on")?.dataset.shot,
      clip: !!document.querySelector(".shot.is-on.has-clip"),
      videos: document.querySelectorAll("video").length,
    }));
    console.log(`${view.n} stop${i + 1} y=${y} ${state.slate} ${state.lens} ${state.tc} → ${state.on}${state.clip ? " [clip]" : " [still]"} (${state.videos} videos)`);
    await page.screenshot({ path: join(import.meta.dirname, "page", `${view.n}-${i + 1}.png`) });
  }
  await page.close();
}

console.log("page errors:", errors.length ? errors : "none");
await browser.close();
server.close();
