/* Mutation check: break one behaviour of lib.mjs at a time, run the suite, and
   record which tests notice. A test that no mutation can kill is not testing
   anything. Usage: npm run test:mutation [-- --verbose] */
import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIB = join(ROOT, "docs/demos/soglia/render/lib.mjs");
const OUT = join(mkdtempSync(join(tmpdir(), "mutate-")), "vitest-run.json");
const original = readFileSync(LIB, "utf8");
const VERBOSE = process.argv.includes("--verbose");

const MUTATIONS = [
  // ---- parseArgs
  ["parseArgs: accept positionals", `!a.startsWith("--")`, `false`],
  ["parseArgs: swallow the next flag as a value", `&& !next.startsWith("--")`, ``],
  ["parseArgs: value becomes true", `out[a.slice(2)] = typeof next === "string" && !next.startsWith("--") ? next : true;`, `out[a.slice(2)] = true;`],
  ["parseArgs: bare flag becomes undefined", `? next : true;`, `? next : undefined;`],
  ["parseArgs: first occurrence wins", `for (let i = 0; i < argv.length; i++) {\n    const a = argv[i];`, `for (let i = argv.length - 1; i >= 0; i--) {\n    const a = argv[i];`],
  ["parseArgs: no default argv", `export function parseArgs(argv = [])`, `export function parseArgs(argv)`],
  ["parseArgs: treat -1 as a flag", `!next.startsWith("--") ? next : true`, `!next.startsWith("-") ? next : true`],

  // ---- numArg
  ["numArg: falsy check swallows 0", `if (raw === undefined || raw === true) return fallback;`, `if (!raw) return fallback;`],
  ["numArg: NaN passes through", `if (!Number.isFinite(n)) throw new TypeError`, `if (false) throw new TypeError`],
  ["numArg: bare flag parsed as 1", `raw === undefined || raw === true`, `raw === undefined`],
  ["numArg: ignore the fallback", `return fallback;\n  const n = Number(raw);`, `return 0;\n  const n = Number(raw);`],

  // ---- mimeFor
  ["mimeFor: case sensitive", `.toLowerCase()]`, `]`],
  ["mimeFor: no default type", `?? "application/octet-stream"`, `?? undefined`],
  ["mimeFor: mp4 mistyped", `".mp4": "video/mp4",`, `".mp4": "application/octet-stream",`],

  // ---- resolveRequestPath
  ["resolve: keep the query string", `url.split("?")[0]`, `url`],
  ["resolve: no directory index", `if (p.endsWith("/")) p += "index.html";`, ``],
  ["resolve: no traversal guard", `if (--depth < 0) return null; continue;`, `continue;`],
  ["resolve: reject all traversal", `if (seg === "..") { if (--depth < 0) return null; continue; }`, `if (seg === "..") return null;`],
  ["resolve: no decode", `p = decodeURIComponent(url.split("?")[0]);`, `p = url.split("?")[0];`],
  ["resolve: allow NUL", `if (p.includes("\\0")) return null;`, ``],
  ["resolve: accept relative paths", `if (!p.startsWith("/")) return null;`, ``],
  ["resolve: accept empty input", `if (typeof url !== "string" || url === "") return null;`, `if (typeof url !== "string") return "/";`],

  // ---- createStaticHandler
  ["handler: 200 on read failure", `if (err?.code !== "ENOENT") log(`, `if (false) log(`],
  ["handler: log every 404", `if (err?.code !== "ENOENT") log`, `if (true) log`],
  ["handler: serve despite a bad path", `if (rel === null) { res.writeHead(400); res.end(); return; }`, ``],
  ["handler: wrong content type", `mimeFor(rel)`, `"text/plain"`],

  // ---- frame naming / timing
  ["frameName: pad to 4", `padStart(5, "0")`, `padStart(4, "0")`],
  ["scoutName: keep the dot", `scout-\${String(t).replace(".", "_")}`, `scout-\${t}`],
  ["stopName: keep the dot", `\${tag}-\${String(p).replace(".", "_")}`, `\${tag}-\${p}`],
  ["frameTime: off-by-one", `return i / (n - 1);`, `return i / n;`],
  ["frameTime: allow n<2", `if (!Number.isInteger(n) || n < 2) throw new RangeError`, `if (false) throw new RangeError`],
  ["frameRange: default to n", `numArg(args, "to", n - 1)`, `numArg(args, "to", n)`],
  ["frameRange: drop the bounds checks", `if (to > n - 1) throw new RangeError`, `if (false) throw new RangeError`],
  ["frameRange: drop the ordering check", `if (from > to) throw new RangeError`, `if (false) throw new RangeError`],
  ["frameRange: drop the negative check", `if (from < 0) throw new RangeError`, `if (false) throw new RangeError`],
  ["scoutStops: allow out of range", `t < 0 || t > 1`, `false`],
  ["scoutStops: allow NaN", `!Number.isFinite(t) ||`, ``],
  ["scoutStops: allow empty", `if (!parts.length) throw new RangeError`, `if (false) throw new RangeError`],
  ["scoutStops: no trim", `.map((s) => s.trim()).filter(Boolean)`, ``],

  // ---- dataUrlToBuffer
  ["dataUrl: accept non-strings", `if (typeof dataUrl !== "string") throw new TypeError`, `if (false) throw new TypeError`],
  ["dataUrl: accept any string", `if (!dataUrl.startsWith("data:") || comma === -1) throw new Error`, `if (false) throw new Error`],
  ["dataUrl: accept empty payload", `if (!payload) throw new Error`, `if (false) throw new Error`],
  ["dataUrl: decode as utf8", `Buffer.from(payload, "base64")`, `Buffer.from(payload, "utf8")`],

  // ---- trimEnds / percentile
  ["numArg: return the raw string", `return n;`, `return raw;`],
  ["frameRange: ignore the parsed window", `return { from, to };`, `return { from: 0, to: n - 1 };`],
  ["scoutStops: split on the wrong character", `String(spec).split(",")`, `String(spec).split(";")`],
  ["trimEnds: short runs pass through untrimmed", `2 * n ? arr.slice(n, -n) : [];`, `2 * n ? arr.slice(n, -n) : arr.slice();`],
  ["bytes: never accumulate", `(sum, e) => sum + (Number.isFinite(e?.encodedDataLength) ? e.encodedDataLength : 0)`, `(sum) => sum`],
  ["cls: never accumulate", `(sum, e) => (e?.hadRecentInput ? sum : sum + (Number(e?.value) || 0))`, `(sum) => sum`],
  ["validate: always reports a problem", `const problems = [];`, `const problems = ["forced"];`],
  ["trimEnds: return the source array", `if (n <= 0) return arr.slice();`, `if (n <= 0) return arr;`],
  ["trimEnds: no array guard", `if (!Array.isArray(arr)) return [];`, ``],
  ["trimEnds: trim one side only", `arr.slice(n, -n)`, `arr.slice(n)`],
  ["percentile: no upper clamp", `Math.min(sortedAsc.length - 1, Math.max(0, Math.floor(sortedAsc.length * p)))`, `Math.floor(sortedAsc.length * p)`],
  ["percentile: empty returns 0", `if (!Array.isArray(sortedAsc) || !sortedAsc.length) return null;`, `if (!Array.isArray(sortedAsc)) return null;`],
  ["percentile: wrong rank", `Math.floor(sortedAsc.length * p)`, `Math.floor(sortedAsc.length * p * 2)`],

  // ---- summariseFrames / formatFrames
  ["summarise: keep zero deltas", `.filter((d) => Number.isFinite(d) && d > 0)`, ``],
  ["summarise: keep non-finite deltas", `Number.isFinite(d) && d > 0`, `d !== 0`],
  ["summarise: NaN instead of null on empty", `if (!samples.length) return { samples: 0, avgFps: null, p05Fps: null, long: 0, longPct: null };`, ``],
  ["summarise: long-frame threshold ignored", `samples.filter((d) => d > longMs)`, `samples.filter(() => false)`],
  ["summarise: default longMs changed", `longMs = 33`, `longMs = 16`],
  ["summarise: percent not scaled", `(100 * long) / samples.length`, `long / samples.length`],
  ["summarise: unsorted percentile", `.sort((a, b) => a - b);\n  const long`, `;\n  const long`],
  ["summarise: default trim changed", `{ trim = 2, longMs = 33 } = {}`, `{ trim = 0, longMs = 33 } = {}`],
  ["format: no empty-sample branch", `if (!s.samples) return \`\${label}: no usable frame samples\`;`, ``],
  ["format: wrong precision", `s.avgFps.toFixed(1)`, `s.avgFps.toFixed(2)`],

  // ---- throttleProfile / bytes / cls
  ["throttle: forget the /8", `(downKbps * 1024) / 8`, `downKbps * 1024`],
  ["throttle: forget the upload /8", `(upKbps * 1024) / 8`, `upKbps * 1024`],
  ["throttle: wrong default", `downKbps = 1600`, `downKbps = 3200`],
  ["throttle: no validation", `if (!Number.isFinite(v) || v < 0) throw new RangeError`, `if (false) throw new RangeError`],
  ["throttle: offline", `offline: false,`, `offline: true,`],
  ["bytes: count missing lengths as NaN", `(Number.isFinite(e?.encodedDataLength) ? e.encodedDataLength : 0)`, `e?.encodedDataLength`],
  ["bytes: no default arg", `totalEncodedBytes(events = [])`, `totalEncodedBytes(events)`],
  ["cls: count input-driven shifts", `(e?.hadRecentInput ? sum : sum + (Number(e?.value) || 0))`, `sum + (Number(e?.value) || 0)`],
  ["cls: no default arg", `cumulativeLayoutShift(entries = [])`, `cumulativeLayoutShift(entries)`],

  // ---- ledger
  ["media: posters for connectors too", `if (segment.kind === "scene") {`, `if (true) {`],
  ["media: no posters at all", `if (segment.kind === "scene") {`, `if (false) {`],
  ["media: mobile not under m/", `parts: ["m", \`\${segment.id}.h264.mp4\`]`, `parts: [\`\${segment.id}.h264.mp4\`]`],
  ["segmentSeconds: no fps guard", `if (!Number.isFinite(fps) || fps <= 0) throw new RangeError`, `if (false) throw new RangeError`],
  ["segmentSeconds: no frames guard", `if (!Number.isFinite(a) || !Number.isFinite(b)) throw new TypeError`, `if (false) throw new TypeError`],
  ["segmentSeconds: multiply by fps", `return (b - a) / fps;`, `return (b - a) * fps;`],
  ["validate: no contiguity check", `if (prevEnd !== a) problems.push`, `if (false) problems.push`],
  ["validate: no duration check", `if (Math.abs(implied - s.secs) > tolerance) {`, `if (false) {`],
  ["validate: no backwards check", `if (b <= a) problems.push`, `if (false) problems.push`],
  ["validate: no frames-shape check", `if (!Number.isFinite(a) || !Number.isFinite(b)) { problems.push`, `if (false) { problems.push`],
  ["validate: empty table passes", `if (!Array.isArray(segments) || !segments.length) return ["segment table is empty"];`, `if (!Array.isArray(segments)) return [];`],
  ["validate: tolerance wide open", `tolerance = 0.05`, `tolerance = 100`],
  ["sumBytes: overwrite instead of add", `(totals[k] ?? 0) + v`, `v`],
  ["sumBytes: skip falsy byte counts", `if (!Number.isFinite(v)) throw new TypeError`, `if (!v) continue;\n      if (!Number.isFinite(v)) throw new TypeError`],
  ["sumBytes: no default arg", `sumBytes(segments = [])`, `sumBytes(segments)`],
  ["sumBytes: no type check", `if (!Number.isFinite(v)) throw new TypeError`, `if (false) throw new TypeError`],
  ["reportMissing: only the first gap", `.filter((r) => r.size === null).map((r) => r.path)`, `.filter((r) => r.size === null).map((r) => r.path).slice(0, 1)`],
  ["reportMissing: never throws", `if (missing.length) {`, `if (false) {`],
  ["reportMissing: zero-byte counts as missing", `r.size === null`, `!r.size`],
  ["reportMissing: returns a copy", `return results;\n}`, `return [...results];\n}`],
];

function runSuite() {
  if (existsSync(OUT)) rmSync(OUT);
  try {
    execFileSync("npx", ["vitest", "run", "--reporter=json", `--outputFile=${OUT}`], {
      cwd: ROOT, stdio: "pipe",
    });
  } catch { /* non-zero exit is the expected case: we want the failures */ }
  if (!existsSync(OUT)) return null;            // suite could not even load
  const report = JSON.parse(readFileSync(OUT, "utf8"));
  const failed = new Set();
  for (const f of report.testResults ?? []) {
    for (const a of f.assertionResults ?? []) {
      if (a.status === "failed") failed.add(a.fullName);
    }
  }
  return { failed, total: report.numTotalTests ?? 0 };
}

// baseline
const base = runSuite();
if (!base || base.failed.size) {
  console.error("baseline is not green — fix that first:", [...(base?.failed ?? ["suite failed to load"])]);
  process.exit(1);
}
console.log(`baseline: ${base.total} tests, all green\n`);

const killedBy = new Map();   // test name -> first mutation that killed it
const useless = [];

for (const [id, find, replace] of MUTATIONS) {
  if (!original.includes(find)) { console.error(`!! mutation "${id}" does not apply — pattern not found`); process.exitCode = 1; continue; }
  writeFileSync(LIB, original.replace(find, replace));
  const r = runSuite();
  writeFileSync(LIB, original);
  if (!r) { console.log(`  ${id}: suite failed to load (counts as killing nothing)`); useless.push(id); continue; }
  if (!r.failed.size) { console.log(`  SURVIVED  ${id}`); useless.push(id); continue; }
  for (const t of r.failed) if (!killedBy.has(t)) killedBy.set(t, id);
  if (VERBOSE) console.log(`  killed ${String(r.failed.size).padStart(3)}  ${id}`);
}

writeFileSync(LIB, original);

// which tests were never killed?
const allNames = new Set();
{
  const report = JSON.parse(readFileSync(OUT, "utf8"));
  for (const f of report.testResults ?? []) for (const a of f.assertionResults ?? []) allNames.add(a.fullName);
}
const survivors = [...allNames].filter((n) => !killedBy.has(n));

console.log(`\n${"=".repeat(72)}`);
console.log(`mutations applied : ${MUTATIONS.length}`);
console.log(`mutations that killed nothing : ${useless.length}`);
for (const u of useless) console.log(`   - ${u}`);
console.log(`tests killed by at least one mutation : ${killedBy.size}/${allNames.size}`);
if (survivors.length) {
  console.log(`\nTESTS NO MUTATION COULD KILL (${survivors.length}):`);
  for (const s of survivors) console.log(`   - ${s}`);
} else {
  console.log(`\nevery test fails when the function it covers is broken.`);
}
