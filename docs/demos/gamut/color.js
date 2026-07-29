/* ============================================================
   gamut — the colour science. No DOM in this file.

   Everything the page claims is derived here from two inputs: the
   1931 colour-matching functions as shipped in data/, and the
   primaries of each gamut as written in its own spec. No matrix is
   pasted in, because a pasted matrix cannot be checked against the
   numbers printed on the page.
   ============================================================ */

/* ---- the measurements ---- */

/** CVRL csv: `nm,xbar,ybar,zbar` per line. Returns rows in file order. */
export function parseCMF(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const p = line.split(",");
    if (p.length < 4) continue;
    const nm = +p[0], X = +p[1], Y = +p[2], Z = +p[3];
    if (!Number.isFinite(nm) || !Number.isFinite(X + Y + Z)) continue;
    rows.push({ nm, X, Y, Z });
  }
  return rows;
}

/** Chromaticity of one row. The tail rows are tiny but never zero, so no guard is needed. */
export function rowXY(r) {
  const s = r.X + r.Y + r.Z;
  return [r.X / s, r.Y / s];
}

/**
 * The spectral locus as a closed polygon: every row of the file, minus the
 * consecutive duplicates the long tail produces, closed by the line of purples.
 */
export function locusPolygon(rows) {
  const pts = [];
  for (const r of rows) {
    const p = rowXY(r);
    const last = pts[pts.length - 1];
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 1e-4) continue;
    pts.push(p);
  }
  return pts;
}

/* ---- linear algebra, only as much as three primaries need ---- */

function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    A / det, (c * h - b * i) / det, (b * f - c * e) / det,
    B / det, (a * i - c * g) / det, (c * d - a * f) / det,
    C / det, (b * g - a * h) / det, (a * e - b * d) / det,
  ];
}

function mul3(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** xyY -> XYZ at unit luminance. */
const XYZ1 = ([x, y]) => [x / y, 1, (1 - x - y) / y];

/**
 * Derive both matrices for an RGB space from its primaries and white point
 * (the standard construction: scale each primary so the three sum to white).
 */
export function rgbMatrices({ r, g, b, w }) {
  const P = [...XYZ1(r), ...XYZ1(g), ...XYZ1(b)];
  const M = [P[0], P[3], P[6], P[1], P[4], P[7], P[2], P[5], P[8]];
  const S = mul3(inv3(M), XYZ1(w));
  const toXYZ = [
    M[0] * S[0], M[1] * S[1], M[2] * S[2],
    M[3] * S[0], M[4] * S[1], M[5] * S[2],
    M[6] * S[0], M[7] * S[1], M[8] * S[2],
  ];
  return { toXYZ, fromXYZ: inv3(toXYZ) };
}

/* ---- the three gamuts this page can cut with ---- */

const D65 = [0.3127, 0.3290];

export const GAMUTS = {
  srgb: {
    id: "srgb",
    label: "sRGB",
    article: "an",
    r: [0.640, 0.330], g: [0.300, 0.600], b: [0.150, 0.060], w: D65,
  },
  p3: {
    id: "p3",
    label: "Display P3",
    article: "a",
    r: [0.680, 0.320], g: [0.265, 0.690], b: [0.150, 0.060], w: D65,
  },
  rec2020: {
    id: "rec2020",
    label: "Rec. 2020",
    article: "a",
    r: [0.708, 0.292], g: [0.170, 0.797], b: [0.131, 0.046], w: D65,
  },
};

for (const k of Object.keys(GAMUTS)) Object.assign(GAMUTS[k], rgbMatrices(GAMUTS[k]));

/* ---- areas: how much of the diagram a triangle covers ---- */

export const shoelace = (pts) => {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};

/** Sutherland-Hodgman. `clip` must be convex and wound counter-clockwise; a triangle is. */
export function clipConvex(subject, clip) {
  let out = subject;
  for (let i = 0, n = clip.length; i < n && out.length; i++) {
    const [ax, ay] = clip[i], [bx, by] = clip[(i + 1) % n];
    const side = ([x, y]) => (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    const input = out;
    out = [];
    for (let j = 0, m = input.length; j < m; j++) {
      const P = input[j], Q = input[(j + 1) % m];
      const sp = side(P), sq = side(Q);
      if (sp >= 0) out.push(P);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]);
      }
    }
  }
  return out;
}

/** Counter-clockwise triangle of a gamut, scaled by k about its own centroid. */
export function triangleAt(gamut, k = 1) {
  let tri = [gamut.r, gamut.g, gamut.b];
  const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
  const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
  const cross =
    (tri[1][0] - tri[0][0]) * (tri[2][1] - tri[0][1]) -
    (tri[1][1] - tri[0][1]) * (tri[2][0] - tri[0][0]);
  if (cross < 0) tri = [tri[0], tri[2], tri[1]];
  return tri.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

/** Smallest k for which the scaled triangle swallows the whole locus. */
export function coveringScale(gamut, locus) {
  let lo = 1, hi = 2;
  const holds = (k) => {
    const t = triangleAt(gamut, k);
    return locus.every(([x, y]) =>
      t.every(([ax, ay], i) => {
        const [bx, by] = t[(i + 1) % 3];
        return (bx - ax) * (y - ay) - (by - ay) * (x - ax) >= -1e-12;
      })
    );
  };
  while (!holds(hi) && hi < 64) hi *= 2;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (holds(mid)) hi = mid; else lo = mid;
  }
  return hi;
}

/** Share of the locus still inside the scaled triangle: the number the HUD counts down. */
export function remainingShare(gamut, k, locus, locusArea) {
  return shoelace(clipConvex(locus, triangleAt(gamut, k))) / locusArea;
}

/** CIE 1976 UCS. Areas measured here treat a step in green more like a step in blue. */
export const toUV = ([x, y]) => {
  const d = -2 * x + 12 * y + 3;
  return [(4 * x) / d, (9 * y) / d];
};

/**
 * Share of the visible locus a gamut's triangle covers, in both diagrams.
 * All three triangles here sit wholly inside the locus, so the intersection
 * is the triangle itself and no clipping is needed.
 */
export function coverage(gamut, locus) {
  const tri = [gamut.r, gamut.g, gamut.b];
  return {
    xy: shoelace(tri) / shoelace(locus),
    uv: shoelace(tri.map(toUV)) / shoelace(locus.map(toUV)),
  };
}

/* ---- transfer function ---- */

/** sRGB inverse EOTF. Display P3 uses the same curve; Rec. 2020 does not, and is never painted. */
export function encode(v) {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** Linear RGB for a chromaticity at unit luminance, before any clipping. */
export function linearAt(fromXYZ, x, y) {
  return mul3(fromXYZ, XYZ1([x, y]));
}
