import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://127.0.0.1:8931/index.html";

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

// wait for first frame to be drawn
await page.waitForFunction(
  () => document.getElementById("hud").textContent.includes("frame 0"),
  { timeout: 15000 }
);

const results = [];
for (const p of [0, 0.25, 0.5, 0.75, 1]) {
  await page.evaluate((p) => {
    const section = document.getElementById("seq-section");
    const total = section.offsetHeight - innerHeight;
    scrollTo(0, section.offsetTop + total * p);
  }, p);
  await new Promise((r) => setTimeout(r, 700)); // let decode + rAF settle

  const info = await page.evaluate(() => {
    const c = document.getElementById("seq");
    const ctx = c.getContext("2d");
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonBlack = 0, sum = 0;
    for (let i = 0; i < d.length; i += 4000) {
      const lum = d[i] + d[i + 1] + d[i + 2];
      if (lum > 30) nonBlack++;
      sum += lum;
    }
    return {
      hud: document.getElementById("hud").textContent,
      nonBlackRatio: nonBlack / (d.length / 4000),
      avgLum: sum / (d.length / 4000),
    };
  });
  results.push({ scroll: p, ...info });
  await page.screenshot({ path: `shot-${p * 100}.png` });
}

console.log(JSON.stringify(results, null, 2));
console.log("console errors:", errors.length ? errors : "none");
await browser.close();
