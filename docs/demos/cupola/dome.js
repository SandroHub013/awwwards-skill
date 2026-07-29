/* ============================================================
   cupola — the geometry, from the rule that was used.

   Nothing here is modelled by eye. The profile is the "quinto
   acuto": each rib is an arc whose radius is four fifths of the
   span, struck from a centre one fifth in from the opposite
   springing. Give it the documented span of 45.5 m and it returns
   a rise of 33.7 m on its own — which is what the surveys of the
   dome report, and is the only proof available that the rule is
   the right one.

   The bed joints are the second rule. The courses in the webs are
   not horizontal: they lie on cones coaxial with the dome, so a
   course runs higher at the ribs than in the middle of a web and
   sags between them like a slack cord. That is the corda blanda,
   and it is a single term in one function here — `bedLevel` — so
   every part of the build shares it: the brick pattern, the
   reveal, the ribs, the chains.
   ============================================================ */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

const TAU  = Math.PI * 2;
const SIDE = TAU / 8;              // one face of the octagon
const HALF = SIDE / 2;             // 22.5°

/* ---- the documented numbers, and what the rule makes of them ---- */
export const SPAN     = 45.5;                 // m, inner octagon, corner to corner
export const R_ARC    = 0.8 * SPAN;           // quinto acuto: radius = 4/5 of the span
export const X_C      = 0.3 * SPAN;           // its centre, offset from the axis
export const RISE     = Math.sqrt(R_ARC * R_ARC - X_C * X_C);   // 33.74 m
export const OCULUS_R = 3.0;                  // the eye the lantern stands on
export const Y_TOP    = Math.sqrt(R_ARC * R_ARC - (OCULUS_R + X_C) ** 2);
export const SPRING   = 52.0;                 // m, springing above the cathedral floor
export const CONE     = 0.30;                 // corda blanda: dy/dr of the bed cones
export const COURSE   = 0.52;                 // m, one course, brick plus bed
export const BRICK    = 0.62;                 // m, one brick plus its head joint
export const GAP_LOW  = 4.65;                 // m between the two shells at the springing
export const GAP_TOP  = 1.40;                 // ... and where they meet at the eye

/* The intrados at a corner rib, at height y above the springing. */
export function cornerRadius(y) {
  return Math.sqrt(Math.max(0, R_ARC * R_ARC - y * y)) - X_C;
}

/* How far the outer shell stands off the inner one at that height. */
export function gapAt(y) {
  return GAP_LOW + (GAP_TOP - GAP_LOW) * Math.min(1, y / Y_TOP);
}

/* The corda blanda, as one number: which bed a point in the masonry
   belongs to. Constant over a cone, not over a plane. */
export function bedLevel(y, r) { return y - CONE * r; }

export const BUILD_START = bedLevel(0, cornerRadius(0));       // first bed, at a rib
export const BUILD_END   = bedLevel(Y_TOP, OCULUS_R);          // the closing ring

/* A point on a web. The webs are not flat: they bow out from the
   chord between their two ribs, which is why the dome reads round
   from below and octagonal from the square. */
function webPoint(face, u, y, off, out) {
  const rc = cornerRadius(y);
  const a0 = face * SIDE - HALF;
  const ax = Math.cos(a0) * rc, az = Math.sin(a0) * rc;
  const a1 = a0 + SIDE;
  const bx = Math.cos(a1) * rc, bz = Math.sin(a1) * rc;

  let x = ax + (bx - ax) * u;
  let z = az + (bz - az) * u;
  const d = Math.hypot(x, z) || 1;
  const bow = 0.05 * rc * Math.sin(Math.PI * u) + off;
  x += (x / d) * bow;
  z += (z / d) * bow;

  out[0] = x; out[1] = y; out[2] = z;
  return out;
}

/* Half the chord of one web at that height — the length a course
   has to cover between two ribs, which is what the brick pattern
   is measured along. */
function chord(y) { return 2 * cornerRadius(y) * Math.sin(HALF); }

/* ---- the shells ---------------------------------------------- */
/* One indexed mesh for all eight webs: eight patches, one draw call.
   `aU` carries metres along the course, so the brick pattern is laid
   out in the masonry's own units and does not stretch with the mesh. */
export function buildShell({ rows, cols, outer }) {
  const pos = [], nor = [], us = [], idx = [];
  const p = [0, 0, 0], pu = [0, 0, 0], pv = [0, 0, 0];
  const ring = (rows + 1) * (cols + 1);

  for (let f = 0; f < 8; f++) {
    const phase = f * 0.41;                       // so the courses do not line up across a rib
    for (let i = 0; i <= rows; i++) {
      const y = (i / rows) * Y_TOP;
      const off = outer ? gapAt(y) : 0;
      const c = chord(y);
      for (let j = 0; j <= cols; j++) {
        const u = j / cols;
        webPoint(f, u, y, off, p);

        /* normal by difference — the surface is analytic, so this is
           exact enough and costs nothing at build time */
        webPoint(f, Math.min(1, u + 1e-3), y, off, pu);
        webPoint(f, u, Math.min(Y_TOP, y + 1e-3), off, pv);
        const ux = pu[0] - p[0], uy = pu[1] - p[1], uz = pu[2] - p[2];
        const vx = pv[0] - p[0], vy = pv[1] - p[1], vz = pv[2] - p[2];
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        if (nx * p[0] + nz * p[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }

        pos.push(p[0], p[1], p[2]);
        nor.push(nx, ny, nz);
        us.push(u * c + phase);
      }
    }
    const base = f * ring;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = base + i * (cols + 1) + j;
        const b = a + cols + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aU", new THREE.Float32BufferAttribute(us, 1));
  g.setIndex(idx);
  return g;
}

/* ---- a small emitter for everything that is a solid ----------- */
/* Ribs, chains, the lantern and the city below are all boxes and
   ribbons. One writer for the lot keeps them in a single buffer,
   and therefore a single draw call each. */
function Emitter() {
  return { pos: [], nor: [], col: [], idx: [] };
}

/* Vertices are given anticlockwise seen from *inside* the solid, so
   the outward face is v × u and the triangles wind the other way.
   Getting this backwards culls every outer surface and leaves you
   looking at the inside of the far wall of every box — which still
   renders, just wrong, which is why it is worth stating here. */
function quad(e, a, b, c, d, col) {
  const i = e.pos.length / 3;
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
  let nx = vy * uz - vz * uy, ny = vz * ux - vx * uz, nz = vx * uy - vy * ux;
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  for (const v of [a, b, c, d]) {
    e.pos.push(v[0], v[1], v[2]);
    e.nor.push(nx, ny, nz);
    e.col.push(col[0], col[1], col[2]);
  }
  e.idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
}

/* A box given its centre, its half-extents and a rotation about y. */
export function emitBox(e, cx, cy, cz, hx, hy, hz, rot, col) {
  const s = Math.sin(rot), c = Math.cos(rot);
  const P = (x, y, z) => [cx + x * c - z * s, cy + y, cz + x * s + z * c];
  const a = P(-hx, -hy, -hz), b = P(hx, -hy, -hz), d = P(hx, -hy, hz), f = P(-hx, -hy, hz);
  const A = P(-hx, hy, -hz), B = P(hx, hy, -hz), D = P(hx, hy, hz), F = P(-hx, hy, hz);
  quad(e, A, B, D, F, col);            // top
  quad(e, f, d, b, a, col);            // bottom
  quad(e, a, b, B, A, col);
  quad(e, b, d, D, B, col);
  quad(e, d, f, F, D, col);
  quad(e, f, a, A, F, col);
}

/* A beam between two points, square in section — the sandstone
   chain is described as beams of about 43 cm, cramped end to end. */
export function emitBeam(e, from, to, w, col) {
  const dx = to[0] - from[0], dz = to[2] - from[2];
  const len = Math.hypot(dx, dz);
  const rot = Math.atan2(dz, dx);
  emitBox(e, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2,
    len / 2, w / 2, w / 2, rot, col);
}

/* A rib: a slab standing between the two shells, following the
   profile up. Eight of these are the corner ribs you can see from
   the square; sixteen more are inside the sandwich and were never
   meant to be seen at all. */
function emitRib(e, angle, halfWidth, inset, proud, rows, col) {
  const dirX = Math.cos(angle), dirZ = Math.sin(angle);
  const tanX = -Math.sin(angle), tanZ = Math.cos(angle);
  let prev = null;

  for (let i = 0; i <= rows; i++) {
    const y = (i / rows) * Y_TOP;
    const rc = cornerRadius(y);
    const ri = rc + inset;
    const ro = rc + gapAt(y) + proud;
    const hw = halfWidth * (1 - 0.35 * (y / Y_TOP));      // ribs narrow as they converge
    const ring = [
      [dirX * ri - tanX * hw, y, dirZ * ri - tanZ * hw],
      [dirX * ri + tanX * hw, y, dirZ * ri + tanZ * hw],
      [dirX * ro + tanX * hw, y, dirZ * ro + tanZ * hw],
      [dirX * ro - tanX * hw, y, dirZ * ro - tanZ * hw],
    ];
    if (prev) {
      quad(e, prev[0], prev[1], ring[1], ring[0], col);
      quad(e, prev[1], prev[2], ring[2], ring[1], col);
      quad(e, prev[2], prev[3], ring[3], ring[2], col);
      quad(e, prev[3], prev[0], ring[0], ring[3], col);
    }
    prev = ring;
  }
  quad(e, prev[0], prev[1], prev[2], prev[3], col);        // cap at the eye
}

const MARBLE   = [0.90, 0.88, 0.83];
const SANDSTON = [0.72, 0.66, 0.55];
const CHESTNUT = [0.40, 0.28, 0.18];

/* Twenty-four ribs — eight at the corners, sixteen in the webs —
   and the chains that hold the ring together, sandstone and one of
   chestnut. All of it rises with the courses, so it clips against
   the same bed level the brickwork does. */
export function buildStructure({ rows }) {
  const e = Emitter();

  for (let k = 0; k < 8; k++) {
    emitRib(e, k * SIDE - HALF, 1.15, -0.15, 0.30, rows, MARBLE);      // corner rib, marble faced
    for (let m = 1; m <= 2; m++) {
      const u = m / 3;
      const a = k * SIDE - HALF + u * SIDE;
      emitRib(e, a, 0.62, -0.10, -0.55, rows, SANDSTON);               // hidden rib, inside the gap
    }
  }

  /* Chains at four levels. The lowest is the heavy one; one of the
     four is timber, which is the detail nobody expects a masonry
     dome to contain. */
  const chains = [
    { y: 3.2, w: 0.43, col: SANDSTON },
    { y: 10.0, w: 0.36, col: SANDSTON },
    { y: 16.0, w: 0.30, col: CHESTNUT },
    { y: 23.0, w: 0.28, col: SANDSTON },
  ];
  for (const ch of chains) {
    const r = cornerRadius(ch.y) + gapAt(ch.y) * 0.45;
    for (let k = 0; k < 8; k++) {
      const a0 = k * SIDE - HALF, a1 = a0 + SIDE;
      emitBeam(e,
        [Math.cos(a0) * r, ch.y, Math.sin(a0) * r],
        [Math.cos(a1) * r, ch.y, Math.sin(a1) * r],
        ch.w, ch.col);
    }
  }

  return toGeometry(e);
}

export function toGeometry(e) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(e.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(e.nor, 3));
  g.setAttribute("aCol", new THREE.Float32BufferAttribute(e.col, 3));
  g.setIndex(e.idx);
  return g;
}

export { Emitter, quad, SIDE, HALF, MARBLE, SANDSTON, CHESTNUT };
