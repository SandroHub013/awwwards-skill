import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://127.0.0.1:8932/index.html";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: "networkidle0", timeout: 60000 });

const stops = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
const bgs = [];
for (const p of stops) {
  await page.evaluate((p) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p), p);
  await new Promise((r) => setTimeout(r, 1200)); // let the lerp settle
  bgs.push({
    scroll: p,
    bg: await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  });
  await page.screenshot({ path: `site-${Math.round(p * 100)}.png` });
}
console.log(JSON.stringify(bgs, null, 2));
console.log("console errors:", errors.length ? errors : "none");
await browser.close();
