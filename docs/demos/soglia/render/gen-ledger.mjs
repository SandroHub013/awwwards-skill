/* Generate ledger.json from the files on disk — a figure cannot drift from
   the file it describes. Run after encode.sh. */
import { readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MEDIA = join(import.meta.dirname, "..", "media");
const SEGMENTS = [
  { id: "s0-porta", kind: "scene", frames: [0, 168], secs: 7.0 },
  { id: "c0-arco", kind: "connector", frames: [168, 252], secs: 3.5 },
  { id: "s1-strada", kind: "scene", frames: [252, 420], secs: 7.0 },
  { id: "c1-vicolo", kind: "connector", frames: [420, 504], secs: 3.5 },
  { id: "s2-piazza", kind: "scene", frames: [504, 684], secs: 7.5 },
  { id: "c2-varco", kind: "connector", frames: [684, 768], secs: 3.5 },
  { id: "s3-bottega", kind: "scene", frames: [768, 935], secs: 7.0 },
];

const size = async (p) => (await stat(p)).size;
const segments = [];
for (const s of SEGMENTS) {
  const bytes = {
    av1: await size(join(MEDIA, `${s.id}.av1.mp4`)),
    h264: await size(join(MEDIA, `${s.id}.h264.mp4`)),
    mobile_h264: await size(join(MEDIA, "m", `${s.id}.h264.mp4`)),
  };
  if (s.kind === "scene") {
    bytes.poster = await size(join(MEDIA, `${s.id}.poster.avif`));
    bytes.poster_mobile = await size(join(MEDIA, "m", `${s.id}.poster.avif`));
  }
  segments.push({ ...s, fps: 24, bytes });
}

const totals = {};
for (const s of segments) for (const [k, v] of Object.entries(s.bytes))
  totals[k] = (totals[k] || 0) + v;

const ledger = {
  demo: "soglia — every seam is a doorway",
  footage: "none — no filming, no AI generation",
  renderer: {
    scene: "render/scene.js — one file, seeded PRNG (mulberry32, seed 1410)",
    engine: "three.js 0.185.1 (MIT) via CDN, headless Chrome (puppeteer-core)",
    capture: "render/capture.mjs — deterministic per-frame bake, window.__render(t01)",
    passes: [
      { name: "desktop", size: "1920x1080", fov: 42, frames: 936 },
      { name: "mobile", size: "720x1280", fov: 55, frames: 936 },
    ],
  },
  encoder: "ffmpeg 8.1.2 — SVT-AV1 (desktop, -g 8), libx264 (desktop -g 8, mobile 720p -g 4), AVIF stills via libaom",
  frameLock: "each connector's first/last frame is the neighbouring scenes' seam frame — the same PNG encoded into both clips",
  cost_usd: 0,
  segments,
  totals_bytes: totals,
  technique_credit: "scroll-scrub segment chain (dive/connector interleave, blob-loaded clips, seek coalescing, iOS priming) adapted from oso95/scroll-world (MIT)",
  generated: new Date().toISOString().slice(0, 10),
};
await writeFile(join(import.meta.dirname, "..", "ledger.json"), JSON.stringify(ledger, null, 2) + "\n");
console.log("ledger.json written,", JSON.stringify(totals));
