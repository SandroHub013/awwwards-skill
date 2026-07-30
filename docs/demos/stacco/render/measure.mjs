/* The numbers in SCORE.md come out of here, not out of a guess.

   node measure.mjs 3g        first view on Fast 3G + 4× CPU: FCP, LCP, CLS, bytes
   node measure.mjs scrub     rAF deltas over a full manual sweep of the film
   node measure.mjs auto      rAF deltas while the film plays itself
   node measure.mjs reduce    prefers-reduced-motion: how many <video> ever exist
   node measure.mjs keys      the shot list under Tab and Enter */
import puppeteer from "puppeteer-core";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = join(import.meta.dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".avif": "image/avif", ".mp4": "video/mp4", ".json": "application/json" };

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
const URL_ = `http://127.0.0.1:${port}/index.html`;
const mode = process.argv[2] || "3g";

const launch = (extra = []) => puppeteer.launch({
  executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", ...extra],
});

if (mode === "3g") {
  // five runs, median reported — one cold load on a throttled link is noise
  const runs = [];
  for (let i = 0; i < 5; i++) {
    const browser = await launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setCacheEnabled(false);
    const cdp = await page.createCDPSession();
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 150,
      downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    /* The film autoplays from the top, so "total transferred" would just be the
       whole ladder streaming as it runs, and a cumulative total taken at an
       arbitrary moment of that is not a figure worth publishing. The number that
       matters is what it cost to SHOW the first frame, so bytes are stamped with
       the moment they finished and read back at the LCP. Per-clip weights come
       from ledger.json, which is generated from the files on disk. */
    let bytes = 0; const marks = [];
    const t0 = Date.now();
    cdp.on("Network.loadingFinished", (e) => {
      bytes += e.encodedDataLength;
      marks.push([Date.now() - t0, bytes]);
    });
    await page.evaluateOnNewDocument(() => {
      /* Every LCP candidate is kept, not just the last one. On a page whose film
         autoplays from the top, the clip eventually paints and takes the crown
         from the title — so "the LCP" is two different numbers depending on how
         long you sit there without touching anything, and both are worth
         printing. */
      window.__lcp = 0; window.__fcp = 0; window.__lcpEl = "?"; window.__lcpAll = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          const el = e.element ? `${e.element.tagName.toLowerCase()}.${e.element.className}` : "?";
          window.__lcpAll.push([Math.round(e.startTime), el]);
          window.__lcp = e.startTime;
          window.__lcpEl = el;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        const e = l.getEntries().find((x) => x.name === "first-contentful-paint");
        if (e) window.__fcp = e.startTime;
      }).observe({ type: "paint", buffered: true });
    });
    await page.goto(URL_, { waitUntil: "networkidle2", timeout: 120000 });
    await new Promise((r) => setTimeout(r, 2000));
    const lcpNow = await page.evaluate(() => window.__lcp);
    runs.push({
      fcpMs: await page.evaluate(() => Math.round(window.__fcp)),
      lcpMs: await page.evaluate(() => Math.round(window.__lcp)),
      lcpEl: await page.evaluate(() => window.__lcpEl),
      lcpAll: await page.evaluate(() => window.__lcpAll),
      lcpTextMs: await page.evaluate(() => {
        const first = (window.__lcpAll || []).find(([, el]) => !el.startsWith("video"));
        return first ? first[0] : null;
      }),
      bytes,
      bytesAtLcp: (marks.filter(([t]) => t <= lcpNow + 150).at(-1) || [0, 0])[1],
      cls: await page.evaluate(() => new Promise((res) => {
        let cls = 0;
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
          res(cls);
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => res(cls), 1000);
      })),
    });
    await browser.close();
  }
  const med = (k) => runs.map((r) => r[k]).sort((a, b) => a - b)[2];
  console.log(JSON.stringify({
    runs: runs.map((r) => ({ fcp: r.fcpMs, lcpNoInput: r.lcpMs, lcpNonVideo: r.lcpTextMs,
      firstViewKB: Math.round(r.bytesAtLcp / 1024), cls: +r.cls.toFixed(4) })),
    median: { fcpMs: med("fcpMs"), lcpNoInputMs: med("lcpMs"), lcpNonVideoMs: med("lcpTextMs"),
      firstViewKB: Math.round(med("bytesAtLcp") / 1024), cls: +med("cls").toFixed(4) },
    lastCandidate: runs[0].lcpEl,
    candidates: runs[0].lcpAll,
  }, null, 2));
} else if (mode === "scrub" || mode === "auto") {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL_, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 1200));

  if (mode === "scrub") {
    await page.evaluate(() => window.dispatchEvent(new WheelEvent("wheel")));  // hand control back
    await page.evaluate(() => { window.scrollTo(0, 0); });
  } else {
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await page.keyboard.press("Space");   // ensure it is running
  }
  await new Promise((r) => setTimeout(r, 400));

  await page.evaluate(() => {
    window.__d = []; let last = performance.now();
    const t = () => { const n = performance.now(); window.__d.push(n - last); last = n; requestAnimationFrame(t); };
    requestAnimationFrame(t);
  });

  if (mode === "scrub") {
    // a full sweep of the film in ~9 s of steady scrolling
    await page.evaluate(async () => {
      const total = document.querySelector("[data-film]").offsetHeight - window.innerHeight;
      const t0 = performance.now();
      await new Promise((res) => {
        const step = () => {
          const p = (performance.now() - t0) / 9000;
          window.scrollTo(0, Math.min(1, p) * total);
          if (p >= 1) return res();
          requestAnimationFrame(step);
        };
        step();
      });
    });
  } else {
    await new Promise((r) => setTimeout(r, 12000));
  }

  const d = await page.evaluate(() => window.__d.slice(4));
  const sorted = [...d].sort((a, b) => a - b);
  const long = d.filter((x) => x > 22).length;
  console.log(JSON.stringify({
    mode, frames: d.length,
    avgFps: +(1000 / (d.reduce((a, b) => a + b, 0) / d.length)).toFixed(1),
    p50ms: +sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
    p95ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    longFramePct: +(100 * long / d.length).toFixed(1),
    autoplayDrift: mode === "auto"
      ? await page.evaluate(() => {
        const v = [...document.querySelectorAll("video")].find((x) => !x.paused);
        return v ? +(v.playbackRate - 1).toFixed(4) : null;
      })
      : undefined,
  }, null, 2));
  await browser.close();
} else if (mode === "reduce") {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(URL_, { waitUntil: "networkidle2", timeout: 90000 });
  let mp4 = 0;
  page.on("response", (r) => { if (r.url().endsWith(".mp4")) mp4++; });
  const total = await page.evaluate(() => document.querySelector("[data-film]").offsetHeight - window.innerHeight);
  for (let i = 0; i <= 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * i / 20));
    await new Promise((r) => setTimeout(r, 180));
  }
  console.log(JSON.stringify({
    videosInDom: await page.evaluate(() => document.querySelectorAll("video").length),
    mp4Requests: mp4,
    autoplayRunning: await page.evaluate(() => document.body.classList.contains("is-auto")),
    postersLoaded: await page.evaluate(() =>
      [...document.querySelectorAll(".shot__still")].filter((i) => i.complete && i.naturalWidth > 0).length),
  }, null, 2));
  await browser.close();
} else if (mode === "keys") {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL_, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 900));
  await page.evaluate(() => window.dispatchEvent(new WheelEvent("wheel")));
  const seen = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    seen.push(await page.evaluate(() => {
      const a = document.activeElement;
      return a.getAttribute("aria-label") || a.textContent.trim().slice(0, 32) || a.tagName;
    }));
  }
  // land on the 6th shot and check the film agrees
  await page.evaluate(() => document.querySelector('[data-jump="5"]').focus());
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 1400));
  console.log(JSON.stringify({
    tabOrder: seen,
    afterEnter: await page.evaluate(() => ({
      slate: document.querySelector("[data-slate-shot]").textContent,
      on: document.querySelector(".shot.is-on")?.dataset.shot,
      scrolled: Math.round(window.scrollY),
    })),
  }, null, 2));
  await browser.close();
}

server.close();
