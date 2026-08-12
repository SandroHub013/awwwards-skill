import puppeteer from "puppeteer-core";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { createStaticHandler, throttleProfile, totalEncodedBytes } from "./lib.mjs";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DOCS = join(import.meta.dirname, "..", "..", "..");
const server = createServer(createStaticHandler({ root: DOCS, readFile }));
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.setCacheEnabled(false);
const cdp = await page.createCDPSession();
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", throttleProfile({ downKbps: 1600, upKbps: 750, latencyMs: 150 }));
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const loaded = [];
cdp.on("Network.loadingFinished", (e) => loaded.push(e));
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
  transferBytes: totalEncodedBytes(loaded),
  cls: await page.evaluate(() => new Promise((res) => {
    let cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; res(cls); })
      .observe({ type: "layout-shift", buffered: true });
    setTimeout(() => res(cls), 1000);
  })),
}));
await browser.close(); server.close();
