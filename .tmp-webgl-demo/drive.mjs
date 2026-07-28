import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://127.0.0.1:8933/index.html";

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
// skip the preloader quickly
await page.evaluate(() => dispatchEvent(new PointerEvent("pointerdown")));
await new Promise((r) => setTimeout(r, 2500));

const state = await page.evaluate(() => {
  const c = document.querySelector("[data-gl-canvas]");
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const imgs = [...document.querySelectorAll("[data-gl] img")];
  return {
    webglUp: !!gl && !gl.isContextLost(),
    imgOpacities: imgs.map((i) => i.style.opacity || "(unset)"),
    canvasSize: [c.width, c.height],
  };
});
console.log("after init:", JSON.stringify(state));

// hover a card to exercise the shader, then shoot
await page.evaluate(() => scrollTo(0, document.querySelector("#work").offsetTop - 200));
await new Promise((r) => setTimeout(r, 1200));
const card = await page.$(".card__media");
const box = await card.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: "gl-hover.png" });

// context loss -> DOM fallback must come back (PR #10 behaviour)
await page.evaluate(() => {
  const c = document.querySelector("[data-gl-canvas]");
  const ext = (c.getContext("webgl2") || c.getContext("webgl")).getExtension("WEBGL_lose_context");
  ext.loseContext();
});
await new Promise((r) => setTimeout(r, 800));
const afterLoss = await page.evaluate(() =>
  [...document.querySelectorAll("[data-gl] img")].map((i) => i.style.opacity || "(unset)"));
console.log("after context loss, img opacities:", JSON.stringify(afterLoss));
await page.screenshot({ path: "gl-context-lost.png" });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
