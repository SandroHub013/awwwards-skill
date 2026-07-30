/* Read real world positions back out of a staged frame. Used while art-directing:
   a shot that aims at an actor should be checked against where the actor is. */
import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const MIME = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer(async (req, res) => {
  try {
    const p = req.url.split("?")[0];
    const d = await readFile(join(import.meta.dirname, p === "/" ? "index.html" : p));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(d);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const b = await puppeteer.launch({ executablePath: CHROME, headless: "shell", args: ["--no-sandbox", "--use-angle=default"] });
const pg = await b.newPage();
await pg.setViewport({ width: 640, height: 268 });
pg.on("pageerror", (e) => console.error("ERR", String(e)));
await pg.goto(`http://127.0.0.1:${port}/index.html?w=640&h=268`, { waitUntil: "networkidle0" });
await pg.waitForFunction("window.__ready===true");
const si = +(process.argv[2] ?? 4), u = +(process.argv[3] ?? 0.5);
const out = await pg.evaluate((si, u) => {
  window.__renderFrame(si, u);
  return ["wolfRoot", "head", "snout", "eye", "girl", "cam"].map((n) => n + " " + window.__probe(n).join(", "));
}, si, u);
console.log(out.join("\n"));
await b.close(); server.close();
