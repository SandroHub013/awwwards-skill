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
  args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.setCacheEnabled(false);
const cdp = await page.createCDPSession();
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
let bytes = 0;
cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength; });
await page.evaluateOnNewDocument(() => {
  window.__lcp = 0; window.__fcp = 0;
  new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__lcp = e.startTime; })
    .observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => { const e = l.getEntries().find(x => x.name === "first-contentful-paint"); if (e) window.__fcp = e.startTime; })
    .observe({ type: "paint", buffered: true });
});
await page.goto(`http://127.0.0.1:${port}/demos/soglia/index.html`, { waitUntil: "networkidle2", timeout: 90000 });
await new Promise((r) => setTimeout(r, 2000));
console.log(JSON.stringify({
  fcpMs: await page.evaluate(() => Math.round(window.__fcp)),
  lcpMs: await page.evaluate(() => Math.round(window.__lcp)),
  transferBytes: bytes,
  cls: await page.evaluate(() => new Promise((res) => {
    let cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; res(cls); })
      .observe({ type: "layout-shift", buffered: true });
    setTimeout(() => res(cls), 1000);
  })),
}));
await browser.close(); server.close();
