/* Tests for the pure half of the soglia render harness.
   Nothing here launches a browser: capture/drive/measure-* keep the puppeteer
   work, lib.mjs keeps the parsing and the arithmetic, and only the arithmetic
   is worth asserting on. */
import { describe, it, expect, vi } from "vitest";
import {
  parseArgs, numArg, mimeFor, resolveRequestPath, createStaticHandler,
  frameName, scoutName, stopName, frameTime, frameRange, parseScoutStops, dataUrlToBuffer,
  trimEnds, percentile, summariseFrames, formatFrames,
  throttleProfile, totalEncodedBytes, cumulativeLayoutShift,
  requiredMediaPaths, segmentSeconds, validateSegments, sumBytes, reportMissing,
} from "../docs/demos/soglia/render/lib.mjs";

/* ── CLI parsing ──────────────────────────────────────────────────────────── */

describe("parseArgs", () => {
  it("pairs each flag with the value that follows it", () => {
    expect(parseArgs(["--out", "frames-m", "--frames", "936"]))
      .toEqual({ out: "frames-m", frames: "936" });
  });

  it("treats a flag followed by another flag as a boolean", () => {
    expect(parseArgs(["--scout", "--out", "x"])).toEqual({ scout: true, out: "x" });
  });

  it("treats a trailing flag as a boolean", () => {
    expect(parseArgs(["--headed"])).toEqual({ headed: true });
  });

  it("ignores positional stragglers", () => {
    expect(parseArgs(["mobile", "--w", "390"])).toEqual({ w: "390" });
  });

  it("lets the last occurrence win", () => {
    expect(parseArgs(["--w", "1920", "--w", "720"])).toEqual({ w: "720" });
  });

  it("returns an empty object for no arguments", () => {
    expect(parseArgs([])).toEqual({});
    expect(parseArgs()).toEqual({});
  });

  it("keeps negative numbers, which do not look like flags", () => {
    expect(parseArgs(["--fov", "-1"])).toEqual({ fov: "-1" });
  });
});

describe("numArg", () => {
  it("parses a numeric string", () => {
    expect(numArg({ w: "1920" }, "w", 1)).toBe(1920);
  });

  it("falls back when the flag is absent", () => {
    expect(numArg({}, "w", 1920)).toBe(1920);
  });

  it("falls back when the flag was passed with no value", () => {
    expect(numArg({ w: true }, "w", 1920)).toBe(1920);
  });

  it("accepts an explicit zero rather than treating it as absent", () => {
    expect(numArg({ from: "0" }, "from", 99)).toBe(0);
  });

  it("throws on a value that is not a number", () => {
    expect(() => numArg({ frames: "abc" }, "frames", 936))
      .toThrow(/--frames expects a number/);
  });
});

/* ── static server routing ────────────────────────────────────────────────── */

describe("mimeFor", () => {
  it("maps known extensions", () => {
    expect(mimeFor("/demos/soglia/index.html")).toBe("text/html");
    expect(mimeFor("app.js")).toBe("text/javascript");
    expect(mimeFor("media/s0-porta.av1.mp4")).toBe("video/mp4");
    expect(mimeFor("poster.avif")).toBe("image/avif");
  });

  it("is case-insensitive about the extension", () => {
    expect(mimeFor("SHOT.PNG")).toBe("image/png");
  });

  it("falls back to octet-stream for anything unknown", () => {
    expect(mimeFor("ledger.bin")).toBe("application/octet-stream");
    expect(mimeFor("README")).toBe("application/octet-stream");
  });
});

describe("resolveRequestPath", () => {
  it("strips the query string", () => {
    expect(resolveRequestPath("/index.html?w=1920&h=1080")).toBe("/index.html");
  });

  it("appends index.html to a directory request", () => {
    expect(resolveRequestPath("/demos/soglia/")).toBe("/demos/soglia/index.html");
    expect(resolveRequestPath("/")).toBe("/index.html");
  });

  it("decodes percent escapes", () => {
    expect(resolveRequestPath("/demos/a%20b.html")).toBe("/demos/a b.html");
  });

  it("refuses a path that climbs out of the served root", () => {
    expect(resolveRequestPath("/../../../etc/passwd")).toBeNull();
    expect(resolveRequestPath("/demos/../../secrets")).toBeNull();
  });

  it("collapses harmless traversal that stays inside the root", () => {
    expect(resolveRequestPath("/demos/soglia/../abyss/index.html")).toBe("/demos/abyss/index.html");
  });

  it("refuses a malformed escape instead of throwing", () => {
    expect(resolveRequestPath("/%E0%A4%A")).toBeNull();
  });

  it("refuses a NUL byte", () => {
    expect(resolveRequestPath("/index.html%00.png")).toBeNull();
  });

  it("refuses missing or non-absolute input", () => {
    expect(resolveRequestPath("")).toBeNull();
    expect(resolveRequestPath(undefined)).toBeNull();
    expect(resolveRequestPath("demos/soglia")).toBeNull();
  });
});

describe("createStaticHandler", () => {
  const mkRes = () => ({ code: null, headers: null, body: null,
    writeHead(c, h) { this.code = c; this.headers = h ?? null; },
    end(d) { this.body = d ?? null; } });

  it("serves a file with the right content type", async () => {
    const readFile = vi.fn().mockResolvedValue("<!doctype html>");
    const res = mkRes();
    await createStaticHandler({ root: "/docs", readFile })({ url: "/demos/soglia/" }, res);
    expect(readFile).toHaveBeenCalledWith("/docs/demos/soglia/index.html");
    expect(res.code).toBe(200);
    expect(res.headers).toEqual({ "content-type": "text/html" });
    expect(res.body).toBe("<!doctype html>");
  });

  it("404s a missing file without logging — that is the ordinary case", async () => {
    const log = vi.fn();
    const readFile = vi.fn().mockRejectedValue(Object.assign(new Error("nope"), { code: "ENOENT" }));
    const res = mkRes();
    await createStaticHandler({ root: "/docs", readFile, log })({ url: "/gone.html" }, res);
    expect(res.code).toBe(404);
    expect(log).not.toHaveBeenCalled();
  });

  it("404s but announces a failure that is not a missing file", async () => {
    const log = vi.fn();
    const readFile = vi.fn().mockRejectedValue(Object.assign(new Error("denied"), { code: "EACCES" }));
    const res = mkRes();
    await createStaticHandler({ root: "/docs", readFile, log })({ url: "/locked.html" }, res);
    expect(res.code).toBe(404);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("EACCES"));
  });

  it("400s a request that escapes the root, without touching the disk", async () => {
    const readFile = vi.fn();
    const res = mkRes();
    await createStaticHandler({ root: "/docs", readFile })({ url: "/../../etc/passwd" }, res);
    expect(res.code).toBe(400);
    expect(readFile).not.toHaveBeenCalled();
  });
});

/* ── frame naming and timing ──────────────────────────────────────────────── */

describe("frame naming", () => {
  it("zero-pads frame numbers to five digits so they sort", () => {
    expect(frameName(0)).toBe("00000.png");
    expect(frameName(42)).toBe("00042.png");
    expect(frameName(935)).toBe("00935.png");
  });

  it("makes scout and stop names filesystem-safe", () => {
    expect(scoutName(0.09)).toBe("scout-0_09.png");
    expect(scoutName(0)).toBe("scout-0.png");
    expect(stopName("m", 0.62)).toBe("m-0_62.png");
    expect(stopName("d", 1)).toBe("d-1.png");
  });
});

describe("frameTime", () => {
  it("maps the first and last frame to the ends of the range", () => {
    expect(frameTime(0, 936)).toBe(0);
    expect(frameTime(935, 936)).toBe(1);
  });

  it("maps the midpoint to a half", () => {
    expect(frameTime(4, 9)).toBeCloseTo(0.5, 12);
  });

  it("rejects a bake too short to have an interval", () => {
    expect(() => frameTime(0, 1)).toThrow(/>= 2/);
    expect(() => frameTime(0, 0)).toThrow(/>= 2/);
  });
});

describe("frameRange", () => {
  it("defaults to the whole bake", () => {
    expect(frameRange({}, 936)).toEqual({ from: 0, to: 935 });
  });

  it("honours an explicit window", () => {
    expect(frameRange({ from: "100", to: "199" }, 936)).toEqual({ from: 100, to: 199 });
  });

  it("allows a single-frame window at zero", () => {
    expect(frameRange({ from: "0", to: "0" }, 936)).toEqual({ from: 0, to: 0 });
  });

  it("rejects a window that runs off the end of the bake", () => {
    expect(() => frameRange({ to: "936" }, 936)).toThrow(/<= 935/);
  });

  it("rejects a window that runs backwards", () => {
    expect(() => frameRange({ from: "500", to: "100" }, 936)).toThrow(/past/);
  });

  it("rejects a negative start", () => {
    expect(() => frameRange({ from: "-1" }, 936)).toThrow(/>= 0/);
  });
});

describe("parseScoutStops", () => {
  it("parses a comma-separated list", () => {
    expect(parseScoutStops("0,0.09,0.18,0.27")).toEqual([0, 0.09, 0.18, 0.27]);
  });

  it("tolerates whitespace and trailing commas", () => {
    expect(parseScoutStops(" 0.2 , 0.4 ,")).toEqual([0.2, 0.4]);
  });

  it("rejects a position outside [0,1]", () => {
    expect(() => parseScoutStops("0.5,1.5")).toThrow(/\[0,1\]/);
  });

  it("rejects an unparsable position rather than baking a NaN frame", () => {
    expect(() => parseScoutStops("0.5,half")).toThrow(/must be a number/);
  });

  it("rejects an empty list", () => {
    expect(() => parseScoutStops("")).toThrow(/at least one/);
  });
});

describe("dataUrlToBuffer", () => {
  it("decodes the base64 payload", () => {
    const png = Buffer.from("fake-png-bytes");
    const url = `data:image/png;base64,${png.toString("base64")}`;
    expect(dataUrlToBuffer(url).equals(png)).toBe(true);
  });

  it("names the problem when the page returned nothing", () => {
    expect(() => dataUrlToBuffer(undefined)).toThrow(/expected a data: URL string, got undefined/);
    expect(() => dataUrlToBuffer(null)).toThrow(/got null/);
  });

  it("rejects a string that is not a data URL", () => {
    expect(() => dataUrlToBuffer("<html>error page</html>")).toThrow(/not a data: URL/);
  });

  it("rejects a data URL with an empty payload", () => {
    expect(() => dataUrlToBuffer("data:image/png;base64,")).toThrow(/empty payload/);
  });
});

/* ── frame-timing metrics ─────────────────────────────────────────────────── */

describe("trimEnds", () => {
  it("drops n samples from each end", () => {
    expect(trimEnds([1, 2, 3, 4, 5, 6, 7], 2)).toEqual([3, 4, 5]);
  });

  it("returns nothing when the run is too short to trim", () => {
    expect(trimEnds([1, 2, 3, 4], 2)).toEqual([]);
    expect(trimEnds([], 2)).toEqual([]);
  });

  it("copies rather than trims when n is zero", () => {
    const src = [1, 2, 3];
    const out = trimEnds(src, 0);
    expect(out).toEqual([1, 2, 3]);
    expect(out).not.toBe(src);
  });

  it("survives a non-array", () => {
    expect(trimEnds(undefined, 2)).toEqual([]);
  });
});

describe("percentile", () => {
  it("picks the value at the requested rank", () => {
    const asc = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(asc, 0)).toBe(10);
    expect(percentile(asc, 0.5)).toBe(60);
  });

  it("clamps to the last element at p=1 instead of running off the end", () => {
    expect(percentile([1, 2, 3], 1)).toBe(3);
  });

  it("returns null for an empty sample", () => {
    expect(percentile([], 0.05)).toBeNull();
    expect(percentile(undefined, 0.05)).toBeNull();
  });
});

describe("summariseFrames", () => {
  it("turns a steady 60fps run into 60fps and no long frames", () => {
    const deltas = Array(100).fill(16.667);
    const s = summariseFrames(deltas, { trim: 2 });
    expect(s.samples).toBe(96);
    expect(s.avgFps).toBeCloseTo(60, 2);
    expect(s.p05Fps).toBeCloseTo(60, 2);
    expect(s.long).toBe(0);
    expect(s.longPct).toBe(0);
  });

  it("counts frames over the long-frame threshold", () => {
    // 10 samples survive the trim: eight at 16ms, two at 50ms
    const deltas = [99, 99, ...Array(8).fill(16), 50, 50, 99, 99];
    const s = summariseFrames(deltas, { trim: 2 });
    expect(s.samples).toBe(10);
    expect(s.long).toBe(2);
    expect(s.longPct).toBeCloseTo(20, 6);
  });

  it("reports the slow tail, not the mean, as p5", () => {
    // 90 frames at 60fps and 10 stalls at 5fps: the mean still looks healthy,
    // p5 is the number that admits the run stuttered. The stalls are spread
    // through the run, not bunched at the front, so a percentile taken without
    // sorting first would read 60 and miss them.
    const deltas = Array.from({ length: 100 }, (_, i) => (i % 10 === 0 ? 200 : 16.667));
    const s = summariseFrames(deltas, { trim: 0 });
    expect(s.samples).toBe(100);
    expect(s.avgFps).toBeCloseTo(54.5, 1);
    expect(s.p05Fps).toBeCloseTo(5, 6);
  });

  it("trims two samples from each end by default", () => {
    const deltas = [1, 1, ...Array(10).fill(16.667), 1, 1];
    expect(summariseFrames(deltas).samples).toBe(10);
  });

  it("discards zero-length deltas instead of averaging in Infinity", () => {
    const deltas = [9, 9, 16, 0, 16, 0, 16, 9, 9];
    const s = summariseFrames(deltas, { trim: 2 });
    expect(s.samples).toBe(3);
    expect(Number.isFinite(s.avgFps)).toBe(true);
    expect(s.avgFps).toBeCloseTo(62.5, 4);
  });

  it("discards non-finite deltas", () => {
    const deltas = [9, 9, 16, NaN, Infinity, 16, 9, 9];
    const s = summariseFrames(deltas, { trim: 2 });
    expect(s.samples).toBe(2);
    expect(s.avgFps).toBeCloseTo(62.5, 4);
  });

  it("reports no samples rather than NaN when the capture is empty", () => {
    expect(summariseFrames([], { trim: 2 }))
      .toEqual({ samples: 0, avgFps: null, p05Fps: null, long: 0, longPct: null });
  });

  it("reports no samples when the run is shorter than the trim", () => {
    expect(summariseFrames([16, 16, 16], { trim: 2 }).samples).toBe(0);
  });

  it("honours a custom long-frame threshold", () => {
    const deltas = [9, 9, 20, 20, 20, 9, 9];
    expect(summariseFrames(deltas, { trim: 2, longMs: 33 }).long).toBe(0);
    expect(summariseFrames(deltas, { trim: 2, longMs: 16 }).long).toBe(3);
  });
});

describe("formatFrames", () => {
  it("renders a summary on one line", () => {
    const s = summariseFrames(Array(100).fill(16.667), { trim: 2 });
    expect(formatFrames("desktop", s))
      .toBe("desktop: avg 60.0 fps, p5 60.0 fps, frames>33ms 0/96 (0.0%)");
  });

  it("says so plainly when there is nothing to report", () => {
    expect(formatFrames("mobile-viewport", summariseFrames([], { trim: 2 })))
      .toBe("mobile-viewport: no usable frame samples");
  });
});

/* ── network emulation ────────────────────────────────────────────────────── */

describe("throttleProfile", () => {
  it("converts kilobits per second into the bytes per second CDP wants", () => {
    expect(throttleProfile({ downKbps: 1600, upKbps: 750, latencyMs: 150 })).toEqual({
      offline: false,
      latency: 150,
      downloadThroughput: (1600 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
  });

  it("defaults to the regular-3G profile", () => {
    expect(throttleProfile()).toEqual(throttleProfile({ downKbps: 1600, upKbps: 750, latencyMs: 150 }));
  });

  it("rejects a nonsense profile", () => {
    expect(() => throttleProfile({ downKbps: -1 })).toThrow(/downKbps/);
    expect(() => throttleProfile({ latencyMs: NaN })).toThrow(/latencyMs/);
  });
});

describe("totalEncodedBytes", () => {
  it("sums the encoded lengths", () => {
    expect(totalEncodedBytes([{ encodedDataLength: 100 }, { encodedDataLength: 250 }])).toBe(350);
  });

  it("ignores events that carry no length", () => {
    expect(totalEncodedBytes([{ encodedDataLength: 100 }, {}, { encodedDataLength: undefined }, null]))
      .toBe(100);
  });

  it("is zero for no events", () => {
    expect(totalEncodedBytes([])).toBe(0);
    expect(totalEncodedBytes()).toBe(0);
  });
});

describe("cumulativeLayoutShift", () => {
  it("adds up the shifts", () => {
    expect(cumulativeLayoutShift([{ value: 0.01 }, { value: 0.02 }])).toBeCloseTo(0.03, 10);
  });

  it("excludes shifts the visitor caused", () => {
    expect(cumulativeLayoutShift([{ value: 0.01 }, { value: 0.5, hadRecentInput: true }]))
      .toBeCloseTo(0.01, 10);
  });

  it("is zero for no entries", () => {
    expect(cumulativeLayoutShift([])).toBe(0);
    expect(cumulativeLayoutShift()).toBe(0);
  });
});

/* ── ledger ───────────────────────────────────────────────────────────────── */

const SCENE = { id: "s0-porta", kind: "scene", frames: [0, 168], secs: 7.0 };
const CONNECTOR = { id: "c0-arco", kind: "connector", frames: [168, 252], secs: 3.5 };

describe("requiredMediaPaths", () => {
  it("asks a scene for both posters as well as the three encodes", () => {
    expect(requiredMediaPaths(SCENE).map((f) => f.key))
      .toEqual(["av1", "h264", "mobile_h264", "poster", "poster_mobile"]);
  });

  it("asks a connector for encodes only — a connector is never a poster", () => {
    expect(requiredMediaPaths(CONNECTOR).map((f) => f.key))
      .toEqual(["av1", "h264", "mobile_h264"]);
  });

  it("puts the mobile encode under m/", () => {
    const mobile = requiredMediaPaths(SCENE).find((f) => f.key === "mobile_h264");
    expect(mobile.parts).toEqual(["m", "s0-porta.h264.mp4"]);
  });
});

describe("segmentSeconds", () => {
  it("derives duration from the frame range", () => {
    expect(segmentSeconds(SCENE, 24)).toBeCloseTo(7, 10);
    expect(segmentSeconds(CONNECTOR, 24)).toBeCloseTo(3.5, 10);
  });

  it("rejects a missing frame range", () => {
    expect(() => segmentSeconds({ id: "x" }, 24)).toThrow(/\[start,end\] pair/);
  });

  it("rejects a nonsense frame rate", () => {
    expect(() => segmentSeconds(SCENE, 0)).toThrow(/fps must be > 0/);
  });
});

describe("validateSegments", () => {
  const CHAIN = [
    { id: "s0", kind: "scene", frames: [0, 168], secs: 7.0 },
    { id: "c0", kind: "connector", frames: [168, 252], secs: 3.5 },
    { id: "s1", kind: "scene", frames: [252, 420], secs: 7.0 },
  ];

  it("passes a contiguous table whose seconds match its frames", () => {
    expect(validateSegments(CHAIN, { fps: 24 })).toEqual([]);
  });

  it("catches a gap between two segments", () => {
    const broken = structuredClone(CHAIN);
    broken[1].frames = [170, 252];
    broken[1].secs = 82 / 24;
    expect(validateSegments(broken, { fps: 24 }).join("\n"))
      .toMatch(/c0: starts at 170 but s0 ends at 168/);
  });

  it("catches declared seconds that disagree with the frame count", () => {
    const broken = structuredClone(CHAIN);
    broken[0].secs = 9;
    expect(validateSegments(broken, { fps: 24 }).join("\n"))
      .toMatch(/s0: declares 9s but 168 frames at 24fps is 7\.000s/);
  });

  it("catches a range that runs backwards", () => {
    const broken = [{ id: "s0", kind: "scene", frames: [168, 0], secs: -7 }];
    expect(validateSegments(broken, { fps: 24 }).join("\n")).toMatch(/runs backwards/);
  });

  it("catches a missing frame range", () => {
    expect(validateSegments([{ id: "s0", kind: "scene", secs: 7 }], { fps: 24 }).join("\n"))
      .toMatch(/\[start,end\] pair/);
  });

  it("reports an empty table rather than silently passing it", () => {
    expect(validateSegments([], { fps: 24 })).toEqual(["segment table is empty"]);
    expect(validateSegments(undefined, { fps: 24 })).toEqual(["segment table is empty"]);
  });

  it("re-checks the same table against a different frame rate", () => {
    expect(validateSegments(CHAIN, { fps: 30 }).length).toBe(3);
  });
});

describe("sumBytes", () => {
  it("totals each key across segments", () => {
    const segs = [
      { id: "s0", bytes: { av1: 100, h264: 200, poster: 10 } },
      { id: "c0", bytes: { av1: 50, h264: 60 } },
    ];
    expect(sumBytes(segs)).toEqual({ av1: 150, h264: 260, poster: 10 });
  });

  it("is empty for no segments", () => {
    expect(sumBytes([])).toEqual({});
    expect(sumBytes()).toEqual({});
  });

  it("counts a genuine zero-byte file rather than skipping it", () => {
    expect(sumBytes([{ id: "s0", bytes: { av1: 0 } }])).toEqual({ av1: 0 });
  });

  it("refuses to total a byte count that is not a number", () => {
    expect(() => sumBytes([{ id: "s0", bytes: { av1: null } }]))
      .toThrow(/s0: byte count for av1 is not a number/);
  });
});

describe("reportMissing", () => {
  it("passes results through when everything is on disk", () => {
    const ok = [{ key: "av1", path: "/m/a.mp4", size: 10 }];
    expect(reportMissing(ok)).toBe(ok);
  });

  it("names every missing file in one error, not just the first", () => {
    const results = [
      { key: "av1", path: "/m/s0.av1.mp4", size: 10 },
      { key: "h264", path: "/m/s0.h264.mp4", size: null },
      { key: "poster", path: "/m/s0.poster.avif", size: null },
    ];
    expect(() => reportMissing(results)).toThrow(/2 media file\(s\) missing/);
    expect(() => reportMissing(results)).toThrow(/s0\.h264\.mp4[\s\S]*s0\.poster\.avif/);
  });

  it("treats a zero-byte file as present — that is an encode bug, not a gap", () => {
    expect(() => reportMissing([{ key: "av1", path: "/m/a.mp4", size: 0 }])).not.toThrow();
  });
});
