/* ============================================================
   cupola — the site.

   Two shells, twenty-four ribs, four chains, a drum, and enough of
   Florence below to say how big any of it is. No textures, no
   models, no images: the brickwork is a function of where a pixel
   sits in the masonry, which is also why it can be laid one course
   at a time without a single new byte being fetched.

   The whole build is one number — `uBuild`, the highest bed that
   has been laid — and every material clips against it with the
   same cone rule the courses were set out with.
   ============================================================ */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";
import {
  buildShell, buildStructure, toGeometry, Emitter, emitBox, quad,
  cornerRadius, gapAt, SIDE, HALF,
  SPAN, RISE, Y_TOP, OCULUS_R, SPRING, CONE, COURSE, BRICK,
  BUILD_START, BUILD_END, MARBLE,
} from "./dome.js";

/* ---- the camera, as shots rather than a curve ----------------
   One shot per panel, at the scroll position that panel sits at:
   nine panels of one screen each, so panel n is centred at n/8. */
const SHOTS = [
  { p: 0.000, az: 26,  dist: 92,  y: 33, ty: -6 },   // the hole, and the city it sits in
  { p: 0.125, az: 56,  dist: 76,  y: 24, ty: 14 },   // the profile, whole, against the sky
  { p: 0.250, az: 122, dist: 74,  y: -17, ty: 9 },   // under the springing, where the centring is not
  { p: 0.375, az: 128, dist: 40,  y: 15, ty: 11 },   // close enough to read a brick
  { p: 0.500, az: 180, dist: 58,  y: 21, ty: 15 },   // a whole web between two ribs, for the sag
  { p: 0.625, az: 196, dist: 37,  y: 25, ty: 18 },   // the cutaway: ribs between the shells
  { p: 0.750, az: 232, dist: 54,  y: 9,  ty: 14 },   // down to the chains, with the drum for scale
  { p: 0.875, az: 262, dist: 27,  y: 55, ty: 30 },   // over the top, as the ring closes
  { p: 0.940, az: 288, dist: 60,  y: 54, ty: 32 },   // the lantern arrives
  { p: 1.000, az: 322, dist: 146, y: 50, ty: 10 },   // all of it, beside the campanile
];

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const ramp = (t, a, b) => clamp01((t - a) / (b - a));

/* ---- shading, shared by every material ----------------------- */
const LIGHT = /* glsl */`
uniform vec3 uSun, uSunCol, uSky, uBounce, uFogCol;
uniform float uFog;
vec3 shade(vec3 base, vec3 n, vec3 p) {
  float d = max(dot(n, uSun), 0.0);      // uSun arrives normalised
  /* Three terms, none of them a light object: sun, sky and the warm
     bounce off a city of terracotta and stone. The bounce is what
     keeps a shaded wall the colour of Florence instead of navy, and
     it is the only reason a scene with no lights reads as daylight. */
  float sky = 0.60 + 0.40 * n.y;
  vec3 c = base * (0.16 + uSky * sky * 0.40 + uBounce * (0.34 - 0.30 * n.y))
         + base * uSunCol * d * 0.98;
  float dist = length(p - cameraPosition);
  float h = clamp((p.y + 52.0) / 95.0, 0.0, 1.0);
  float f = 1.0 - exp(-uFog * dist * mix(1.5, 0.35, h));
  return mix(c, uFogCol, clamp(f, 0.0, 1.0));
}`;

const VERT_SHELL = /* glsl */`
attribute float aU;
varying vec3 vPos; varying vec3 vN; varying float vU;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vU = aU;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/* The brickwork. Bed joints run along cones — the corda blanda —
   so they are read off `bedLevel`, not off y. Every few bricks one
   is set on end across the bed above it: that is the spinapesce,
   and it is the reason the ring could be closed without a centring
   underneath holding the wet courses in place. */
const FRAG_SHELL = /* glsl */`
precision highp float;
${LIGHT}
uniform float uBuild, uCone, uCourse, uBrick, uEvery, uGhost;
uniform vec3 uBrickCol, uMortar, uFresh;
varying vec3 vPos; varying vec3 vN; varying float vU;

/* No sin(): it is one of the slowest instructions available and this
   runs on every pixel of a screen-filling dome. */
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  float L = vPos.y - uCone * length(vPos.xz);
  if (L > uBuild) discard;

  float course = L / uCourse;
  float dC = fwidth(course);
  float detail = 1.0 - smoothstep(0.20, 0.70, dC);

  vec3 base = uBrickCol;
  float joint = 0.0;

  /* Past a certain distance a course is thinner than a pixel and the
     pattern is a grey smear, so it is not computed at all. That branch
     is coherent across a whole face, which is what makes it free. */
  if (detail > 0.01) {
    float ci = floor(course), cf = fract(course);
    float b  = (vU + ci * uBrick * 0.5) / uBrick;   // half-brick stagger, course to course
    float bi = floor(b), bf = fract(b);
    float dB = fwidth(b);

    float bed  = smoothstep(0.05 + dC, 0.05 - dC, min(cf, 1.0 - cf));
    float head = smoothstep(0.05 + dB, 0.05 - dB, min(bf, 1.0 - bf));
    joint = max(bed, head);
    base = uBrickCol * (0.88 + 0.22 * hash(vec2(bi, ci)));

    /* The spinapesce, over the running bond: one brick in every uEvery
       slots is set on end, so it is as tall as two courses and cuts the
       bed joint between them. It steps sideways from one pair of courses
       to the next, which is the diagonal in the real surface. */
    float pair = floor(course * 0.5);
    float pf   = course * 0.5 - pair;
    float sx   = vU / uBrick + pair * 1.5;
    float si   = floor(sx), sf = fract(sx);
    if (mod(si, uEvery) < 0.5 && sf > 0.18 && sf < 0.72) {
      float ex = min(sf - 0.18, 0.72 - sf) / 0.27;
      float ey = min(pf, 1.0 - pf) / 0.5;
      joint = 1.0 - smoothstep(0.07, 0.20, min(ex, ey));
      base  = uBrickCol * (1.02 + 0.14 * hash(vec2(si, pair)));
    }
    joint *= detail;
  }

  vec3 col = mix(base, uMortar, clamp(joint, 0.0, 1.0) * 0.62);
  col = mix(col, uFresh, smoothstep(1.6, 0.0, uBuild - L) * 0.45);

  if (uGhost > 0.5) {
    /* Ghosted, this surface is between 5 and 35 per cent opaque and
       covers the screen. Lighting it is paying for something nobody can
       see, so it gets the joints, a fog tint and nothing else. */
    gl_FragColor = vec4(mix(col, uFogCol, 0.55), 0.05 + 0.34 * joint);
    return;
  }

  vec3 n = gl_FrontFacing ? normalize(vN) : -normalize(vN);
  col = shade(col, n, vPos);

  float a = 1.0;
  if (uGhost > 0.001) {
    col = mix(col, uFogCol, uGhost * 0.30);
    a = mix(1.0, 0.05 + 0.34 * joint, uGhost);
  }
  gl_FragColor = vec4(col, a);
}`;

const VERT_STONE = /* glsl */`
attribute vec3 aCol;
varying vec3 vPos; varying vec3 vN; varying vec3 vCol;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vCol = aCol;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG_STONE = /* glsl */`
precision highp float;
${LIGHT}
uniform float uBuild, uCone, uOpacity;
varying vec3 vPos; varying vec3 vN; varying vec3 vCol;
void main() {
  float L = vPos.y - uCone * length(vPos.xz);
  if (L > uBuild) discard;
  vec3 n = gl_FrontFacing ? normalize(vN) : -normalize(vN);
  gl_FragColor = vec4(shade(vCol, n, vPos), uOpacity);
}`;

/* Florentine daylight: warm haze on the horizon, thinner blue over
   the top of it. One sphere, drawn from the inside, no texture. */
const SKY = {
  vert: /* glsl */`
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  frag: /* glsl */`
    precision highp float;
    varying vec3 vDir;
    uniform vec3 uLow, uMid, uHigh;
    void main() {
      float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 c = mix(uLow, uMid, smoothstep(0.42, 0.56, h));
      c = mix(c, uHigh, smoothstep(0.54, 0.95, h));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

/* ---- deterministic noise, so the city is the same for everyone -- */
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A disc, facing out along `angle` — the eight round windows in the
   drum, which are the only openings the dome has. */
function emitDisc(e, cx, cy, cz, angle, r, col) {
  const nx = Math.cos(angle), nz = Math.sin(angle);
  const tx = -Math.sin(angle), tz = Math.cos(angle);
  const i0 = e.pos.length / 3;
  e.pos.push(cx, cy, cz); e.nor.push(nx, 0, nz); e.col.push(col[0], col[1], col[2]);
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = cx + tx * Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const z = cz + tz * Math.cos(a) * r;
    e.pos.push(x, y, z); e.nor.push(nx, 0, nz); e.col.push(col[0], col[1], col[2]);
    if (i > 0) e.idx.push(i0, i0 + i + 1, i0 + i);
  }
}

export function createCupola({ canvas } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false,
      powerPreference: "high-performance", stencil: false,
    });
  } catch { return null; }
  if (!renderer.getContext()) return null;

  const LOW = (navigator.hardwareConcurrency ?? 8) <= 4 ||
              (navigator.deviceMemory ?? 8) <= 4 ||
              matchMedia("(pointer: coarse)").matches;

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.5, 1400);

  /* ---- one palette, shared by every shader ---- */
  const shared = {
    uSun:    { value: new THREE.Vector3(0.62, 0.46, -0.55).normalize() },
    uSunCol: { value: new THREE.Color(0xfff2de) },
    uSky:    { value: new THREE.Color(0xc6d2dc) },
    uBounce: { value: new THREE.Color(0xb08a63) },
    uFogCol: { value: new THREE.Color(0xe3dac5) },
    uFog:    { value: 0.0012 },
    uCone:   { value: CONE },
  };
  const withShared = (u) => Object.assign({}, shared, u);

  /* ---- sky ---- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.ShaderMaterial({
      vertexShader: SKY.vert, fragmentShader: SKY.frag, side: THREE.BackSide, depthWrite: false,
      uniforms: {
        uLow:  { value: new THREE.Color(0xeadfc7) },
        uMid:  { value: new THREE.Color(0xd0d7da) },
        uHigh: { value: new THREE.Color(0x89a8c8) },
      },
    })
  );
  sky.frustumCulled = false;
  scene.add(sky);

  /* ---- the two shells ---- */
  const rows = LOW ? 56 : 84;
  const cols = LOW ? 16 : 22;

  const brickUniforms = () => withShared({
    uBuild:    { value: BUILD_START },
    uCourse:   { value: COURSE },
    uBrick:    { value: BRICK },
    uEvery:    { value: 5.0 },
    uGhost:    { value: 0.0 },
    uBrickCol: { value: new THREE.Color(0xbb6743) },
    uMortar:   { value: new THREE.Color(0xd4c4a6) },
    uFresh:    { value: new THREE.Color(0xd0bc9e) },
  });

  const innerMat = new THREE.ShaderMaterial({
    vertexShader: VERT_SHELL, fragmentShader: FRAG_SHELL,
    uniforms: brickUniforms(), side: THREE.DoubleSide,
  });
  /* Only the inner shell is ever seen from behind — through the eye, and
     through the outer shell during the cutaway. The outer one is culled,
     which is half of its pixels on a screen-filling dome. */
  const outerMat = new THREE.ShaderMaterial({
    vertexShader: VERT_SHELL, fragmentShader: FRAG_SHELL,
    uniforms: brickUniforms(), side: THREE.FrontSide,
  });
  outerMat.uniforms.uBrickCol.value = new THREE.Color(0xb15f3d);

  const innerShell = new THREE.Mesh(buildShell({ rows, cols, outer: false }), innerMat);
  const outerShell = new THREE.Mesh(buildShell({ rows, cols, outer: true }), outerMat);
  innerShell.renderOrder = 1;
  outerShell.renderOrder = 2;
  scene.add(innerShell, outerShell);

  /* ---- ribs and chains, rising with the courses ---- */
  const structMat = new THREE.ShaderMaterial({
    vertexShader: VERT_STONE, fragmentShader: FRAG_STONE,
    uniforms: withShared({
      uBuild: { value: BUILD_START }, uOpacity: { value: 1 },
    }),
    /* The ribs are ribbons, not closed solids: culled, they show their
       far side and the marble reads black. */
    side: THREE.DoubleSide,
  });
  const structure = new THREE.Mesh(buildStructure({ rows: LOW ? 34 : 56 }), structMat);
  scene.add(structure);

  /* ---- the setting-out ----
     Before a brick exists there is only the rule. The eight arcs the
     quinto acuto gives are drawn in the air, they meet where the eye
     will be, and they fade as the masonry catches up with them. */
  const guidePts = [];
  for (let k = 0; k < 8; k++) {
    const a = k * SIDE - HALF;
    let prev = null;
    for (let i = 0; i <= 64; i++) {
      const y = (i / 64) * Y_TOP;
      const r = cornerRadius(y);
      const pt = [Math.cos(a) * r, y, Math.sin(a) * r];
      if (prev) guidePts.push(...prev, ...pt);
      prev = pt;
    }
  }
  for (const y of [0, Y_TOP]) {                       // the springing, and the closing ring
    const r = cornerRadius(y);
    for (let k = 0; k < 8; k++) {
      const a0 = k * SIDE - HALF, a1 = a0 + SIDE;
      guidePts.push(Math.cos(a0) * r, y, Math.sin(a0) * r,
                    Math.cos(a1) * r, y, Math.sin(a1) * r);
    }
  }
  const guideGeo = new THREE.BufferGeometry();
  guideGeo.setAttribute("position", new THREE.Float32BufferAttribute(guidePts, 3));
  const guideMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(0x8f4b2e), transparent: true, opacity: 0, depthWrite: false,
  });
  const guide = new THREE.LineSegments(guideGeo, guideMat);
  guide.visible = false;
  scene.add(guide);

  /* ---- what was already standing in 1418, and the city under it ---- */
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: VERT_STONE, fragmentShader: FRAG_STONE,
    uniforms: withShared({ uBuild: { value: 1e9 }, uOpacity: { value: 1 } }),
  });

  const g = Emitter();
  const PLASTER = [0.82, 0.76, 0.64];
  const STONE   = [0.56, 0.50, 0.39];
  const ROOF    = [0.61, 0.32, 0.22];
  const GREEN   = [0.34, 0.35, 0.27];

  /* The drum: an octagonal wall, hollow, with the eight round windows
     that are the dome's only openings. Its top edge is the springing —
     the line the first course was laid on. */
  const drumR = 27.4 + 1.2;                 // apothem of the outer face
  const prism = (y0, y1, ap, thick, outCol, inCol, topCol) => {
    const R = ap / Math.cos(HALF), Ri = (ap - thick) / Math.cos(HALF);
    for (let k = 0; k < 8; k++) {
      const a0 = k * SIDE - HALF, a1 = a0 + SIDE;
      const o0 = [Math.cos(a0) * R, 0, Math.sin(a0) * R];
      const o1 = [Math.cos(a1) * R, 0, Math.sin(a1) * R];
      const i0 = [Math.cos(a0) * Ri, 0, Math.sin(a0) * Ri];
      const i1 = [Math.cos(a1) * Ri, 0, Math.sin(a1) * Ri];
      const at = (p, y) => [p[0], y, p[2]];
      quad(g, at(o0, y0), at(o1, y0), at(o1, y1), at(o0, y1), outCol);   // outside
      quad(g, at(i1, y0), at(i0, y0), at(i0, y1), at(i1, y1), inCol);    // inside
      quad(g, at(o0, y1), at(o1, y1), at(i1, y1), at(i0, y1), topCol);   // the springing course
    }
  };
  prism(-SPRING, -13, 31.0, 7.0, PLASTER, [0.34, 0.30, 0.26], PLASTER);  // the crossing, to the ground
  prism(-14, 0, drumR, 3.4, PLASTER, [0.42, 0.38, 0.33], MARBLE);
  prism(0, 0.9, drumR + 0.7, 4.6, MARBLE, MARBLE, MARBLE);              // the cornice
  for (let k = 0; k < 8; k++) {
    const a = k * SIDE;
    const r = drumR / Math.cos(0) + 0.06;
    emitDisc(g, Math.cos(a) * r, -6.6, Math.sin(a) * r, a, 2.7, [0.11, 0.12, 0.15]);
  }
  /* the crossing floor, 52 m down and in shadow — what the hole looks into */
  {
    const R = 24, i0 = g.pos.length / 3, dark = [0.30, 0.26, 0.22];
    g.pos.push(0, -SPRING + 2, 0); g.nor.push(0, 1, 0); g.col.push(...dark);
    for (let k = 0; k <= 8; k++) {
      const a = k * SIDE - HALF;
      g.pos.push(Math.cos(a) * R, -SPRING + 2, Math.sin(a) * R);
      g.nor.push(0, 1, 0); g.col.push(...dark);
      if (k > 0) g.idx.push(i0, i0 + k + 1, i0 + k);
    }
  }
  /* A pitched roof: two slopes and two gable ends. Florence is a city
     of these, and a flat slab reads as a table from above. */
  const gable = (cx, cy, cz, hx, hz, rise, rot, col) => {
    const s = Math.sin(rot), c = Math.cos(rot);
    const P = (x, y, z) => [cx + x * c - z * s, cy + y, cz + x * s + z * c];
    const a = P(-hx, 0, -hz), b = P(hx, 0, -hz), d = P(hx, 0, hz), f = P(-hx, 0, hz);
    const r0 = P(-hx, rise, 0), r1 = P(hx, rise, 0);
    quad(g, a, b, r1, r0, col);                 // slope
    quad(g, d, f, r0, r1, col);                 // slope
    quad(g, b, d, r1, r1, col);                 // gable end
    quad(g, f, a, r0, r0, col);
  };

  /* the mass under the drum: nave to the west, three tribunes around it */
  emitBox(g, -74, -31, 0, 46, 21, 20, 0, PLASTER);
  gable(-74, -10, 0, 46, 20, 7, 0, ROOF);
  for (const ang of [Math.PI * 0.5, 0, -Math.PI * 0.5]) {
    emitBox(g, Math.cos(ang) * 41, -35, Math.sin(ang) * 41, 15, 17, 15, ang, PLASTER);
    gable(Math.cos(ang) * 41, -18, Math.sin(ang) * 41, 15, 15, 5, ang, ROOF);
  }
  /* Giotto's campanile: 84.7 m, and still shorter than what went up beside it */
  emitBox(g, -100, -SPRING + 42.3, 30, 7.4, 42.3, 7.4, 0, PLASTER);
  emitBox(g, -100, -SPRING + 85.4, 30, 8.0, 1.0, 8.0, 0, MARBLE);

  if (!LOW) {
    const rnd = mulberry(1420);
    for (let i = 0; i < 320; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 150 + rnd() * 700;
      const h = 7 + rnd() * 11;
      const w = 4 + rnd() * 6;
      const z = 4 + rnd() * 7;
      const rot = rnd() * 3.1;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      emitBox(g, x, -SPRING + h / 2, y, w, h / 2, z, rot, PLASTER);
      gable(x, -SPRING + h, y, w, z, 1.6 + rnd() * 1.6, rot, ROOF);
    }
    for (let i = 0; i < 70; i++) {                 // cypresses and gardens, for the colour
      const a = rnd() * Math.PI * 2;
      const d = 240 + rnd() * 420;
      emitBox(g, Math.cos(a) * d, -SPRING + 4, Math.sin(a) * d, 7, 4, 7, rnd() * 3.1, GREEN);
    }
  }
  /* the plain the city sits on */
  quad(g,
    [-2600, -SPRING, -2600], [2600, -SPRING, -2600], [2600, -SPRING, 2600], [-2600, -SPRING, 2600],
    STONE);

  const city = new THREE.Mesh(toGeometry(g), groundMat);
  scene.add(city);

  /* ---- the lantern: another twenty-five years, and it arrives in a second ---- */
  const lanternMat = new THREE.ShaderMaterial({
    vertexShader: VERT_STONE, fragmentShader: FRAG_STONE,
    uniforms: withShared({ uBuild: { value: 1e9 }, uOpacity: { value: 0 } }),
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  const l = Emitter();
  const lanternBase = Y_TOP + 0.6;
  for (let k = 0; k < 8; k++) {
    const a = k * SIDE - HALF;
    const r = 2.9;
    emitBox(l, Math.cos(a) * r, lanternBase + 5.5, Math.sin(a) * r, 0.55, 5.5, 0.9, a, MARBLE);   // pier
    emitBox(l, Math.cos(a) * (r + 1.5), lanternBase + 2.2, Math.sin(a) * (r + 1.5), 1.9, 2.4, 0.7, a, MARBLE); // buttress
  }
  emitBox(l, 0, lanternBase + 0.5, 0, 4.2, 0.6, 4.2, Math.PI / 8, MARBLE);        // plinth
  emitBox(l, 0, lanternBase + 11.4, 0, 3.6, 0.5, 3.6, Math.PI / 8, MARBLE);       // entablature
  for (let i = 0; i < 7; i++) {                                                    // the cone, in rings
    const t = i / 7;
    emitBox(l, 0, lanternBase + 12.1 + t * 6.2, 0, 3.2 * (1 - t) + 0.5, 0.5, 3.2 * (1 - t) + 0.5, Math.PI / 8, MARBLE);
  }
  emitBox(l, 0, lanternBase + 19.4, 0, 0.9, 0.9, 0.9, 0, [0.78, 0.70, 0.42]);      // the ball, 1469
  emitBox(l, 0, lanternBase + 21.2, 0, 0.12, 1.1, 0.12, 0, [0.78, 0.70, 0.42]);
  emitBox(l, 0, lanternBase + 21.0, 0, 0.6, 0.12, 0.12, 0, [0.78, 0.70, 0.42]);
  const lantern = new THREE.Mesh(toGeometry(l), lanternMat);
  lantern.visible = false;
  scene.add(lantern);

  /* ---- state ---- */
  const state = {
    p: 0, shown: 0, build: BUILD_START, ghost: 0,
    year: 1420, metres: 0, opening: SPAN, closed: 0,
  };
  let running = false, raf = 0, last = 0, qAcc = 0, qFrames = 0;
  const frameCbs = [];

  function shotAt(p) {
    let i = 0;
    while (i < SHOTS.length - 2 && p > SHOTS[i + 1].p) i++;
    const a = SHOTS[i], b = SHOTS[i + 1];
    const t = smoother(clamp01((p - a.p) / (b.p - a.p)));
    return {
      az:   a.az + (b.az - a.az) * t,
      dist: a.dist + (b.dist - a.dist) * t,
      y:    a.y + (b.y - a.y) * t,
      ty:   a.ty + (b.ty - a.ty) * t,
    };
  }

  function apply(p) {
    /* the build: one number, and everything clips against it */
    const bp = smoother(ramp(p, 0.05, 0.86));
    const build = BUILD_START - 0.5 + (BUILD_END + 0.35 - BUILD_START + 0.5) * bp;
    state.build = build;
    innerMat.uniforms.uBuild.value = build;
    outerMat.uniforms.uBuild.value = build;
    structMat.uniforms.uBuild.value = build;

    /* the cutaway: the outer shell thins to its joint lines, and the
       sixteen ribs nobody was meant to see are in there */
    const ghost = Math.min(ramp(p, 0.55, 0.60), 1 - ramp(p, 0.80, 0.86));
    /* Back faces of the inner shell are only ever seen through the
       ghosted outer one or down through the eye. Culling them the rest
       of the time is a whole screen of brickwork not shaded. */
    innerMat.side = (ghost > 0.01 || p > 0.78) ? THREE.DoubleSide : THREE.FrontSide;
    state.ghost = ghost;
    outerMat.uniforms.uGhost.value = ghost;
    outerMat.transparent = ghost > 0.01;
    outerMat.depthWrite = ghost <= 0.01;

    /* the setting-out, drawn before the masonry and gone once it has
       something to describe */
    const gu = Math.min(ramp(p, 0.055, 0.10), 1 - ramp(p, 0.20, 0.32)) * 0.85;
    guide.visible = gu > 0.005;
    guideMat.opacity = gu;

    /* the lantern */
    const lan = ramp(p, 0.90, 0.965);
    lantern.visible = lan > 0.001;
    lanternMat.uniforms.uOpacity.value = lan;
    lantern.position.y = (1 - smoother(lan)) * 1.6;

    /* Readouts, read off the geometry rather than typed. The bed is a
       cone, so the height a bed reaches at a rib is the fixed point of
       y = L + cone·r(y) — four passes converge well inside a millimetre. */
    let top = Math.max(0, build);
    for (let i = 0; i < 4; i++) top = Math.min(Y_TOP, Math.max(0, build + CONE * cornerRadius(top)));
    state.metres = top;
    state.opening = 2 * Math.max(OCULUS_R, cornerRadius(top));
    state.closed = clamp01((build - BUILD_START) / (BUILD_END - BUILD_START));
    state.year = 1420 + state.closed * 16;

    /* The shots are framed for a landscape window. A portrait one gets
       a wider lens and a longer stand-off, because a phone otherwise
       crops the dome to a wall of brick. */
    const s = shotAt(p);
    const a = (s.az * Math.PI) / 180;
    const portrait = camera.aspect < 1;
    const dist = s.dist * (portrait ? 1.14 : 1);
    camera.position.set(Math.cos(a) * dist, s.y, Math.sin(a) * dist);
    /* Portrait aims lower, which lifts the dome into the top of the
       frame and leaves the bottom third to the copy card. */
    camera.lookAt(0, s.ty - (portrait ? dist * 0.20 : 0), 0);
    sky.position.copy(camera.position);
  }

  /* The frame is fill-rate bound: two shells of computed brickwork cover
     the screen and neither can use early-Z, because both clip themselves
     against the build with `discard`. So the renderer trades resolution
     for frame rate rather than dropping frames — measured, every half
     second, against the machine actually running it. */
  let quality = Math.min(devicePixelRatio, LOW ? 1 : 1.5);
  const Q_MIN = 0.5, Q_MAX = Math.min(devicePixelRatio, LOW ? 1 : 1.75);

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(quality);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect >= 1 ? 46 : Math.min(62, 46 / (0.35 + 0.65 * camera.aspect));
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize, { passive: true });

  function render() { renderer.render(scene, camera); }

  function loop(t) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;

    qAcc += dt; qFrames++;
    if (qAcc >= 0.5) {
      const ms = (qAcc / qFrames) * 1000;
      const before = quality;
      if (ms > 19 && quality > Q_MIN) quality = Math.max(Q_MIN, quality * 0.85);
      else if (ms < 12.5 && quality < Q_MAX) quality = Math.min(Q_MAX, quality * 1.08);
      if (Math.abs(quality - before) > 0.01) resize();
      qAcc = 0; qFrames = 0;
    }
    /* damped, so a flicked scroll does not tear the camera off its
       shots — but it converges and then stops, it never drifts */
    state.shown += (state.p - state.shown) * Math.min(1, dt * 7.5);
    if (Math.abs(state.p - state.shown) < 0.0002) state.shown = state.p;
    apply(state.shown);
    render();
    for (const cb of frameCbs) cb(dt);
  }

  apply(0);

  return {
    state,
    /* handles for the audit: the parts, so a profiler can switch one off
       and see what it was costing */
    parts: { scene, sky, innerShell, outerShell, structure, city, lantern, guide },
    setProgress(p) { state.p = clamp01(p); },
    snap() { state.shown = state.p; apply(state.shown); },
    render,
    start() { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    onFrame(cb) { frameCbs.push(cb); },
    counts() {
      const r = renderer.info.render, m = renderer.info.memory;
      return {
        calls: r.calls,
        tris: r.triangles,
        textures: m.textures,
        programs: renderer.info.programs?.length ?? 0,
      };
    },
    facts: {
      SPAN, RISE, Y_TOP, OCULUS_R, SPRING, CONE, COURSE, BRICK, R_ARC: 0.8 * SPAN, gapAt,
      /* how far a bed drops between a rib and the middle of a web */
      sagAt: (y) => CONE * cornerRadius(y) * (1 - Math.cos(HALF)),
    },
    destroy() {
      this.stop();
      removeEventListener("resize", resize);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
