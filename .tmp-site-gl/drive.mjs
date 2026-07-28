import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://127.0.0.1:8934/index.html";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox", "--hide-scrollbars", "--use-gl=angle", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: "networkidle0", timeout: 90000 });
await new Promise((r) => setTimeout(r, 3000));

const state = await page.evaluate(() => {
  const c = document.querySelector("[data-gl-canvas]");
  const gl = c?.getContext("webgl2") || c?.getContext("webgl");
  const img = document.querySelector(".hero__gl img");
  return {
    webglUp: !!gl && !gl.isContextLost(),
    heroImgOpacity: img?.style.opacity || "(unset)",
    heroImgLoaded: img?.complete && img.naturalWidth > 0,
  };
});
console.log("state:", JSON.stringify(state));

// hover over the hero figure, screenshot
const fig = await page.$(".hero__gl");
const box = await fig.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: "site-gl-hero.png" });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
