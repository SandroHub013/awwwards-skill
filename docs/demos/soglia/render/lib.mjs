/* Pure helpers shared by the render harness (capture, drive, measure-*, gen-ledger).
   Nothing here touches the network, the filesystem or a browser: the scripts keep
   the I/O, this file keeps the arithmetic and the parsing, so both can be tested.

   Covered by ../../../../tests/render-lib.test.mjs. */
import { extname, posix } from "node:path";

/* ── CLI ──────────────────────────────────────────────────────────────────── */

/** Parse `--flag value` / `--flag` pairs. A flag with no value, or followed by
 *  another flag, is `true`. Later occurrences win. Non-flag stragglers are
 *  ignored, which is what the harness has always done. */
export function parseArgs(argv = []) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (typeof a !== "string" || !a.startsWith("--") || a === "--") continue;
    const next = argv[i + 1];
    out[a.slice(2)] = typeof next === "string" && !next.startsWith("--") ? next : true;
  }
  return out;
}

/** Read a numeric option, falling back when it is absent. A present-but-unparsable
 *  value is an error rather than a silent NaN: `--frames abc` used to bake a
 *  directory full of `NaN.png`. */
export function numArg(args, key, fallback) {
  const raw = args?.[key];
  if (raw === undefined || raw === true) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new TypeError(`--${key} expects a number, got ${JSON.stringify(raw)}`);
  return n;
}

/* ── static server ────────────────────────────────────────────────────────── */

export const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif",
  ".mp4": "video/mp4",
};

/** Content type for a path, defaulting to octet-stream. Extension match is
 *  case-insensitive: `.PNG` is still a PNG. */
export function mimeFor(path, table = MIME) {
  return table[extname(String(path)).toLowerCase()] ?? "application/octet-stream";
}

/** Turn a request URL into a repo-relative path, or null when it is not
 *  serveable. Strips the query, decodes escapes, appends index.html to a
 *  directory, and refuses anything that climbs out of the served root — the
 *  harness serves the whole docs/ tree to a browser it does not fully control. */
export function resolveRequestPath(url) {
  if (typeof url !== "string" || url === "") return null;
  let p;
  try {
    p = decodeURIComponent(url.split("?")[0]);
  } catch {
    return null; // malformed %-escape: unserveable, and the 404 says so
  }
  if (!p.startsWith("/")) return null;
  if (p.endsWith("/")) p += "index.html";
  if (p.includes("\0")) return null;
  // Walk the segments and track depth. posix.normalize is no use on its own:
  // it swallows a leading `..` against the root, so "/../../etc/passwd"
  // normalises to a perfectly innocent-looking "/etc/passwd".
  let depth = 0;
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") { if (--depth < 0) return null; continue; }
    depth++;
  }
  return posix.normalize(p);
}

/** Build the request handler the harness servers share. `readFile` and the
 *  logger are injected so the routing and the error classification can be
 *  exercised without a socket or a disk.
 *
 *  A missing file is a plain 404. Any other failure — a permission error, a
 *  directory where a file was expected, a bad mount — is still a 404 to the
 *  browser (there is nothing better to send) but is announced on stderr: an
 *  unexplained 404 here shows up as a page that simply never becomes ready. */
export function createStaticHandler({ root, readFile, log = console.error }) {
  return async function handle(req, res) {
    const rel = resolveRequestPath(req.url);
    if (rel === null) { res.writeHead(400); res.end(); return; }
    try {
      const data = await readFile(posix.join(root, rel));
      res.writeHead(200, { "content-type": mimeFor(rel) });
      res.end(data);
    } catch (err) {
      if (err?.code !== "ENOENT") log(`static server: ${req.url} → ${err?.code ?? err?.message ?? err}`);
      res.writeHead(404); res.end();
    }
  };
}

/* ── frame naming and timing (capture.mjs) ────────────────────────────────── */

export const frameName = (i) => `${String(i).padStart(5, "0")}.png`;
export const scoutName = (t) => `scout-${String(t).replace(".", "_")}.png`;
export const stopName = (tag, p) => `${tag}-${String(p).replace(".", "_")}.png`;

/** Normalised time in [0,1] for frame `i` of `n`. A one-frame bake has no
 *  interval to divide by, so it is rejected rather than yielding Infinity. */
export function frameTime(i, n) {
  if (!Number.isInteger(n) || n < 2) throw new RangeError(`frame count must be an integer >= 2, got ${n}`);
  return i / (n - 1);
}

/** Resolve --from/--to against a frame count, defaulting to the whole bake and
 *  rejecting ranges that run backwards or past the end. */
export function frameRange(args, n) {
  const from = numArg(args, "from", 0);
  const to = numArg(args, "to", n - 1);
  if (!Number.isInteger(from) || !Number.isInteger(to)) throw new RangeError(`--from/--to must be integers, got ${from}..${to}`);
  if (from < 0) throw new RangeError(`--from must be >= 0, got ${from}`);
  if (to > n - 1) throw new RangeError(`--to must be <= ${n - 1} for a ${n}-frame bake, got ${to}`);
  if (from > to) throw new RangeError(`--from ${from} is past --to ${to}`);
  return { from, to };
}

/** Comma-separated scout positions. Rejects unparsable entries instead of
 *  quietly baking a frame at NaN. */
export function parseScoutStops(spec) {
  const parts = String(spec).split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new RangeError("--scout needs at least one position");
  return parts.map((s) => {
    const t = Number(s);
    if (!Number.isFinite(t) || t < 0 || t > 1) throw new RangeError(`scout position must be a number in [0,1], got ${JSON.stringify(s)}`);
    return t;
  });
}

/** Decode the `data:image/png;base64,...` string page.evaluate hands back.
 *  A failed render used to return undefined and blow up inside Buffer.from. */
export function dataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== "string") throw new TypeError(`expected a data: URL string, got ${dataUrl === null ? "null" : typeof dataUrl}`);
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma === -1) throw new Error(`not a data: URL: ${JSON.stringify(dataUrl.slice(0, 32))}`);
  const payload = dataUrl.slice(comma + 1);
  if (!payload) throw new Error("data: URL carries an empty payload — the page rendered nothing");
  return Buffer.from(payload, "base64");
}

/* ── frame-timing metrics (measure-fps.mjs, measure-autoplay.mjs) ─────────── */

/** Drop `n` samples from each end. Warm-up and tear-down frames are not the
 *  thing being measured. Too short to trim means no usable samples. */
export function trimEnds(arr, n = 2) {
  if (!Array.isArray(arr)) return [];
  if (n <= 0) return arr.slice();
  return arr.length > 2 * n ? arr.slice(n, -n) : [];
}

/** Value at percentile `p` (0..1) of an ascending-sorted array. */
export function percentile(sortedAsc, p) {
  if (!Array.isArray(sortedAsc) || !sortedAsc.length) return null;
  const i = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor(sortedAsc.length * p)));
  return sortedAsc[i];
}

/** Frame-time deltas (ms) → the numbers the harness prints.
 *  Zero and non-finite deltas are discarded, not averaged: two rAF callbacks
 *  sharing a timestamp mean 1000/0 = Infinity, which poisons the mean and
 *  reports a flawless run. Returns nulls when nothing usable survives, so an
 *  empty capture reads as "no samples" instead of crashing on NaN.toFixed(). */
export function summariseFrames(deltas, { trim = 2, longMs = 33 } = {}) {
  const samples = trimEnds(deltas, trim).filter((d) => Number.isFinite(d) && d > 0);
  if (!samples.length) return { samples: 0, avgFps: null, p05Fps: null, long: 0, longPct: null };
  const fps = samples.map((d) => 1000 / d).sort((a, b) => a - b);
  const long = samples.filter((d) => d > longMs).length;
  return {
    samples: samples.length,
    avgFps: fps.reduce((a, b) => a + b, 0) / fps.length,
    p05Fps: percentile(fps, 0.05),
    long,
    longPct: (100 * long) / samples.length,
  };
}

/** One-line render of a summary, with an honest string when there is nothing
 *  to report. */
export function formatFrames(label, s) {
  if (!s.samples) return `${label}: no usable frame samples`;
  return `${label}: avg ${s.avgFps.toFixed(1)} fps, p5 ${s.p05Fps.toFixed(1)} fps, ` +
         `frames>33ms ${s.long}/${s.samples} (${s.longPct.toFixed(1)}%)`;
}

/* ── network emulation (measure-3g.mjs) ───────────────────────────────────── */

/** CDP Network.emulateNetworkConditions payload. Chrome wants bytes/second;
 *  the profile is quoted in kilobits, so the /8 is not decoration. */
export function throttleProfile({ downKbps = 1600, upKbps = 750, latencyMs = 150 } = {}) {
  for (const [k, v] of Object.entries({ downKbps, upKbps, latencyMs })) {
    if (!Number.isFinite(v) || v < 0) throw new RangeError(`${k} must be a non-negative number, got ${v}`);
  }
  return {
    offline: false,
    latency: latencyMs,
    downloadThroughput: (downKbps * 1024) / 8,
    uploadThroughput: (upKbps * 1024) / 8,
  };
}

/** Total encoded bytes across Network.loadingFinished events, ignoring entries
 *  that carry no length (redirects, served-from-cache replays). */
export function totalEncodedBytes(events = []) {
  return events.reduce((sum, e) => sum + (Number.isFinite(e?.encodedDataLength) ? e.encodedDataLength : 0), 0);
}

/** Cumulative layout shift over layout-shift entries, excluding shifts the user
 *  caused. */
export function cumulativeLayoutShift(entries = []) {
  return entries.reduce((sum, e) => (e?.hadRecentInput ? sum : sum + (Number(e?.value) || 0)), 0);
}

/* ── ledger (gen-ledger.mjs) ──────────────────────────────────────────────── */

/** Every media file a segment claims to have. Connectors ship no poster. */
export function requiredMediaPaths(segment) {
  const files = [
    { key: "av1", parts: [`${segment.id}.av1.mp4`] },
    { key: "h264", parts: [`${segment.id}.h264.mp4`] },
    { key: "mobile_h264", parts: ["m", `${segment.id}.h264.mp4`] },
  ];
  if (segment.kind === "scene") {
    files.push({ key: "poster", parts: [`${segment.id}.poster.avif`] });
    files.push({ key: "poster_mobile", parts: ["m", `${segment.id}.poster.avif`] });
  }
  return files;
}

/** Segment duration implied by its frame range. */
export function segmentSeconds(segment, fps) {
  const [a, b] = segment.frames ?? [];
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new TypeError(`${segment.id}: frames must be a [start,end] pair`);
  if (!Number.isFinite(fps) || fps <= 0) throw new RangeError(`fps must be > 0, got ${fps}`);
  return (b - a) / fps;
}

/** The frame table has to be a chain: every segment starts where the previous
 *  one ended, and the declared seconds have to match the frame count. A ledger
 *  that disagrees with the encode is worse than no ledger. */
export function validateSegments(segments, { fps = 24, tolerance = 0.05 } = {}) {
  const problems = [];
  if (!Array.isArray(segments) || !segments.length) return ["segment table is empty"];
  segments.forEach((s, i) => {
    const [a, b] = s.frames ?? [];
    if (!Number.isFinite(a) || !Number.isFinite(b)) { problems.push(`${s.id}: frames must be a [start,end] pair`); return; }
    if (b <= a) problems.push(`${s.id}: frame range runs backwards (${a}..${b})`);
    if (i > 0) {
      const prevEnd = segments[i - 1].frames?.[1];
      if (prevEnd !== a) problems.push(`${s.id}: starts at ${a} but ${segments[i - 1].id} ends at ${prevEnd} — the seam frame is not shared`);
    }
    const implied = (b - a) / fps;
    if (Math.abs(implied - s.secs) > tolerance) {
      problems.push(`${s.id}: declares ${s.secs}s but ${b - a} frames at ${fps}fps is ${implied.toFixed(3)}s`);
    }
  });
  return problems;
}

/** Sum each byte key across segments. Keys absent from a segment (a connector
 *  has no poster) simply do not contribute. */
export function sumBytes(segments = []) {
  const totals = {};
  for (const s of segments) {
    for (const [k, v] of Object.entries(s.bytes ?? {})) {
      if (!Number.isFinite(v)) throw new TypeError(`${s.id}: byte count for ${k} is not a number (${v})`);
      totals[k] = (totals[k] ?? 0) + v;
    }
  }
  return totals;
}

/** Aggregate every missing file into one error instead of dying on the first
 *  ENOENT — after a partial encode you want the whole list, not one name. */
export function reportMissing(results) {
  const missing = results.filter((r) => r.size === null).map((r) => r.path);
  if (missing.length) {
    throw new Error(`gen-ledger: ${missing.length} media file(s) missing — run encode.sh first:\n  ${missing.join("\n  ")}`);
  }
  return results;
}
