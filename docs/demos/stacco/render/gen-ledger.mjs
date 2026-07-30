/* Generate ledger.json from the files on disk — a figure in the epilogue cannot
   drift from the file it describes. Durations and lenses come from the same
   shot table the renderer used. Run after encode.sh. */
import { stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { timeline } from "./shots.js";

const MEDIA = join(import.meta.dirname, "..", "media");
const size = async (p) => (await stat(p)).size;
const { rows, totalSecs, totalFrames } = timeline();

const shots = [];
for (const r of rows) {
  shots.push({
    id: r.id, n: r.n, title: r.title,
    lens_mm: r.lens, move: r.move, secs: r.secs, frames: r.frames, fps: 24,
    bytes: {
      av1: await size(join(MEDIA, `${r.id}.av1.mp4`)),
      h264: await size(join(MEDIA, `${r.id}.h264.mp4`)),
      mobile_h264: await size(join(MEDIA, "m", `${r.id}.h264.mp4`)),
      poster: await size(join(MEDIA, `${r.id}.poster.avif`)),
      poster_mobile: await size(join(MEDIA, "m", `${r.id}.poster.avif`)),
    },
  });
}
const totals = {};
for (const s of shots) for (const [k, v] of Object.entries(s.bytes)) totals[k] = (totals[k] || 0) + v;

const ledger = {
  demo: "stacco — the cut is the storyteller",
  subject: "Cappuccetto Rosso, told in nine shots",
  footage: "none — no filming, no stock, no AI generation",
  renderer: {
    scene: "render/scene.js + render/actors.js — one seeded world (mulberry32, seed 1697, the year Perrault published the tale)",
    shots: "render/shots.js — nine camera setups; the lens on screen is the field of view it was rendered through",
    engine: "three.js 0.185.1 (MIT) via CDN, headless Chrome (puppeteer-core)",
    capture: "render/capture.mjs — deterministic per-shot bake, window.__renderFrame(shot, u)",
    passes: [
      { name: "desktop", size: "1920x804", aspect: "2.39:1 scope", frames: totalFrames },
      { name: "mobile", size: "720x900", aspect: "4:5 re-frame", frames: totalFrames,
        note: "re-framed shot by shot with its own field and lateral offset — never a crop" },
    ],
  },
  encoder: "ffmpeg 8.1.2 — SVT-AV1 (desktop, -g 8), libx264 (desktop -g 8, mobile -g 4), AVIF stills via libaom",
  cutting: "one shot, one clip. No seam frame is shipped twice and no crossfade exists in the engine, because no cut here is hidden",
  film: { shots: shots.length, cuts: shots.length - 1, secs: +totalSecs.toFixed(1), frames: totalFrames, fps: 24 },
  cost_usd: 0,
  shots,
  totals_bytes: totals,
  technique_credit: "scroll-scrub segment chain (blob-loaded clips, seek coalescing, iOS priming) adapted from oso95/scroll-world (MIT); the hard-cut engine, the asymmetric look-ahead and the slate are this build's own",
  generated: new Date().toISOString().slice(0, 10),
};
await writeFile(join(import.meta.dirname, "..", "ledger.json"), JSON.stringify(ledger, null, 2) + "\n");
console.log("ledger.json written,", JSON.stringify(totals));
