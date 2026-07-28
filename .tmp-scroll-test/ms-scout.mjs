import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "https://www.microsoft.com/en-us/windows/";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox", "--hide-scrollbars", "--disable-blink-features=AutomationControlled"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36");

await page.goto(URL, { waitUntil: "networkidle2", timeout: 90000 });
await new Promise((r) => setTimeout(r, 4000)); // let hero settle / cookies banner appear

// dismiss cookie/consent banner if present
await page.evaluate(() => {
  for (const b of document.querySelectorAll("button")) {
    const t = (b.textContent || "").toLowerCase();
    if (t.includes("accept") || t.includes("accetta") || t.includes("reject all")) { b.click(); break; }
  }
});
await new Promise((r) => setTimeout(r, 1000));

const meta = await page.evaluate(() => ({
  title: document.title,
  height: document.documentElement.scrollHeight,
  pinned: [...document.querySelectorAll("*")].filter((e) => {
    const p = getComputedStyle(e).position;
    return p === "fixed" || p === "sticky";
  }).length,
  canvases: document.querySelectorAll("canvas").length,
  videos: document.querySelectorAll("video").length,
}));
console.log(JSON.stringify(meta));

for (const p of [0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 0.9]) {
  await page.evaluate((p) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p), p);
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `ms-${Math.round(p * 100)}.png` });
}
await browser.close();
console.log("done");
