/* stacco — the world, built from primitives. No models, no textures, no footage.

   One seeded scene file holds four locations: the mother's clearing, the path
   through the wood, the grandmother's clearing, and — parked far off at x = 400,
   the way a set sits on the far side of a backlot — her bedroom. The film cuts
   between them; nothing is ever moved to make a shot work.

   Everything is deterministic: geometry from a seeded RNG, animation from an
   explicit time parameter, so the renderer can bake any frame on demand. */

import { createGirl, createWolf } from "./actors.js";

// ── seeded RNG ───────────────────────────────────────────────────────────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── palette ──────────────────────────────────────────────────────────────────
   The one-red rule: `rosso` and `eye` are the only saturated warm chromas in the
   film. Everything else lives in a 20° blue-green band, which is what lets four
   red pixels carry shot 04. */
export const PAL = {
  bosco: 0x1b2a2e, bosco2: 0x2b3c3e, moss: 0x2b3826, mossDark: 0x1f2a1a,
  bark: 0x2a2a26, barkDark: 0x1d1e1c, leaf: 0x2f4436, leafDark: 0x22332a,
  ash: 0xb6c2c6, stone: 0x5d625d, earth: 0x6d6552,
  rosso: 0xb01f22, rossoDark: 0x5e1416, eye: 0xff7a2a,
  skin: 0xc9a184, basket: 0x8a6a3c,
  wolf: 0x3c3f42, wolfDark: 0x26292b,
  plaster: 0x6f6a5c, roof: 0x40382f, timber: 0x342c24,
  glass: 0x1d262b, glassLit: 0xffb86a,
  intWall: 0x413f39, intFloor: 0x3a2f26, linen: 0x9aa0a0, bonnet: 0xb9bcb4,
};

// ── the path ─────────────────────────────────────────────────────────────────
// One curve, used by the geometry, the staging and the camera alike, so nothing
// can drift out of register with it.
export const pathX = (z) => 5.5 * Math.sin(z * 0.028) + 2.2 * Math.sin(z * 0.0113 + 1.7);
// where the tracking dolly of shot 03 runs — trees are kept out of this line so
// the camera can travel, but NOT out of the strip between it and the path, which
// is where the foreground wipes come from
export const DOLLY_OFF = -7.5;

const CLEARINGS = [
  { x: -8, z: -52, r: 15 },   // the mother's
  { x: 4, z: 92, r: 17 },     // the grandmother's
];

function blocked(x, z) {
  if (Math.abs(x - pathX(z)) < 3.4) return true;                    // the path itself
  // shot 04 looks straight down: without a real gap in the canopy there is no
  // path to see, so the wood is planted around a wider corridor here
  if (z > 21 && z < 41 && Math.abs(x - pathX(z)) < 6.6) return true;
  if (z > -10 && z < 40 && Math.abs(x - (pathX(z) + DOLLY_OFF)) < 1.3) return true;
  // the hide of shot 05, and the shortcut of shot 07 — a camera cannot travel
  // through a trunk, so the wood is planted around both lines from the start
  if (z > 39 && z < 53 && Math.abs(x - (pathX(z) - 7.2)) < 2.6) return true;
  // only 1.5 m of clearance on the shortcut: the trunks have to come close
  // enough to whip past the lens, which is the whole point of shot 07
  if (z > 49 && z < 97 && Math.abs(x - (pathX(z) + 7.3)) < 1.5) return true;
  for (const c of CLEARINGS) if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r ** 2) return true;
  return false;
}

// ── builders ─────────────────────────────────────────────────────────────────
function box(THREE, w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color, ...opts }));
  m.castShadow = opts.castShadow !== false; m.receiveShadow = true;
  return m;
}

function pitchedRoof(THREE, w, d, h, color) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* A tree. Trunks lean, because a wood of verticals reads as a fence. The canopy
   is two or three squashed icosahedra rather than one — from directly above in
   shot 04 the gaps between them are the only thing the path can be seen through. */
function tree(THREE, rng, mats, h, near) {
  const g = new THREE.Group();
  const r = 0.10 + h * 0.016;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.55, r, h, near ? 8 : 5),
    near ? mats.bark : mats.barkFar);
  trunk.position.y = h / 2; trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk);

  if (near) {
    const nb = 1 + ((rng() * 3) | 0);
    for (let i = 0; i < nb; i++) {
      const bl = 1.2 + rng() * 2.4;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, bl, 4), mats.bark);
      b.position.y = -bl / 2; b.castShadow = true;
      const arm = new THREE.Group();
      arm.position.set(0, h * (0.52 + rng() * 0.38), 0);
      arm.rotation.set(-1.15 - rng() * 0.5, rng() * Math.PI * 2, 0);
      arm.add(b); g.add(arm);
    }
  }

  const blobs = near ? 3 : 2;
  for (let i = 0; i < blobs; i++) {
    const br = h * (0.20 + rng() * 0.13);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(br, 0),
      rng() < 0.4 ? mats.leafDark : mats.leaf);
    c.position.set((rng() - 0.5) * h * 0.16, h * (0.80 + rng() * 0.26), (rng() - 0.5) * h * 0.16);
    c.scale.set(1, 0.52 + rng() * 0.22, 1);
    c.rotation.set(rng(), rng(), rng());
    c.castShadow = true; c.receiveShadow = true;
    g.add(c);
  }
  g.rotation.z = (rng() - 0.5) * 0.09;   // the lean
  g.rotation.x = (rng() - 0.5) * 0.07;
  return g;
}

function cottage(THREE, rng, opts) {
  const g = new THREE.Group();
  const w = opts.w ?? 6.4, d = opts.d ?? 5.2, h = opts.h ?? 3.0;
  const body = box(THREE, w, h, d, PAL.plaster); body.position.y = h / 2; g.add(body);
  const roof = pitchedRoof(THREE, d + 1.0, w + 1.1, 2.1, PAL.roof);
  roof.position.y = h; roof.rotation.y = Math.PI / 2; g.add(roof);

  // exposed timbers: three verticals and a brace, which is all a cottage needs
  for (const x of [-w * 0.34, 0, w * 0.34]) {
    const t = box(THREE, 0.16, h, 0.1, PAL.timber);
    t.position.set(x, h / 2, d / 2 + 0.02); g.add(t);
  }
  const brace = box(THREE, 0.14, h * 0.9, 0.1, PAL.timber);
  brace.position.set(-w * 0.17, h * 0.5, d / 2 + 0.02); brace.rotation.z = 0.5; g.add(brace);

  // the lit window is the only warm thing in the frame it appears in
  const win = box(THREE, 1.15, 0.95, 0.08,
    opts.lit ? PAL.glassLit : PAL.glass,
    opts.lit ? { emissive: PAL.glassLit, emissiveIntensity: 0.28 } : {});
  win.position.set(w * 0.26, 1.75, d / 2 + 0.05); g.add(win);
  for (const s of [-1, 1]) {
    const sh = box(THREE, 0.6, 1.05, 0.07, PAL.timber);
    sh.position.set(w * 0.26 + s * 0.88, 1.75, d / 2 + 0.08);
    if (s > 0) sh.rotation.y = -0.7;
    g.add(sh);
  }

  // the door, and whether it is ajar is the whole of shot 08
  const frame = box(THREE, 1.5, 2.25, 0.12, PAL.timber);
  frame.position.set(-w * 0.20, 1.12, d / 2 + 0.04); g.add(frame);
  const hole = box(THREE, 1.16, 2.05, 0.06, 0x0b0f10, { emissive: 0x000000 });
  hole.position.set(-w * 0.20, 1.03, d / 2 + 0.10); g.add(hole);
  const door = box(THREE, 1.14, 2.02, 0.08, PAL.timber);
  const hinge = new THREE.Group();
  hinge.position.set(-w * 0.20 - 0.57, 1.02, d / 2 + 0.12);
  door.position.x = 0.57; hinge.add(door); g.add(hinge);
  hinge.rotation.y = opts.ajar ?? 0;

  const step = box(THREE, 1.8, 0.14, 0.7, PAL.stone);
  step.position.set(-w * 0.20, 0.07, d / 2 + 0.45); g.add(step);

  g.position.set(opts.x, 0, opts.z);
  g.rotation.y = opts.rot ?? 0;
  return { root: g, hinge, win };
}

/* The bedroom. A three-walled set with a ceiling, so the sun outside cannot
   reach it and the lamp is the only light — which is why it is parked at x=400
   rather than inside the cottage geometry. */
function bedroom(THREE, rng) {
  const g = new THREE.Group();
  const W = 6.2, D = 7.4, H = 3.1;
  const wallM = { color: PAL.intWall };
  const floor = box(THREE, W, 0.2, D, PAL.intFloor); floor.position.y = -0.1; g.add(floor);
  const ceil = box(THREE, W, 0.2, D, PAL.intWall); ceil.position.y = H; g.add(ceil);
  const back = box(THREE, W, H, 0.2, wallM.color); back.position.set(0, H / 2, -D / 2); g.add(back);
  for (const s of [-1, 1]) {
    const wl = box(THREE, 0.2, H, D, wallM.color);
    wl.position.set(s * W / 2, H / 2, 0); g.add(wl);
  }
  // the fourth wall exists too — the doorway is cut into it, behind the camera
  const frontL = box(THREE, 2.0, H, 0.2, wallM.color); frontL.position.set(-2.1, H / 2, D / 2); g.add(frontL);
  const frontR = box(THREE, 2.0, H, 0.2, wallM.color); frontR.position.set(2.1, H / 2, D / 2); g.add(frontR);
  const lintel = box(THREE, 2.2, 0.9, 0.2, wallM.color); lintel.position.set(0, H - 0.45, D / 2); g.add(lintel);

  for (const x of [-W / 2 + 0.3, 0, W / 2 - 0.3]) {
    const beam = box(THREE, 0.22, 0.24, D, PAL.timber);
    beam.position.set(x, H - 0.22, 0); g.add(beam);
  }

  // the bed, head against the back wall
  const bed = new THREE.Group();
  bed.position.set(0.1, 0, -1.9);
  const frame = box(THREE, 2.1, 0.5, 3.0, PAL.timber); frame.position.y = 0.3; bed.add(frame);
  const headb = box(THREE, 2.2, 1.15, 0.16, PAL.timber); headb.position.set(0, 0.85, -1.5); bed.add(headb);
  const matt = box(THREE, 1.95, 0.30, 2.8, PAL.linen); matt.position.y = 0.65; bed.add(matt);
  const pillow = box(THREE, 1.0, 0.22, 0.52, PAL.linen); pillow.position.set(0, 0.86, -1.05);
  pillow.rotation.x = -0.10; bed.add(pillow);
  // the blanket is a mound, not a plane: it has to be the shape of something
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8),
    new THREE.MeshLambertMaterial({ color: PAL.linen }));
  mound.scale.set(1.35, 0.62, 1.55); mound.position.set(0, 0.72, 0.15);
  mound.castShadow = true; mound.receiveShadow = true; bed.add(mound);
  const cover = box(THREE, 2.0, 0.16, 1.5, PAL.linen); cover.position.set(0, 0.80, 0.55); bed.add(cover);
  g.add(bed);

  // the lamp: one small emissive box, and every shadow in the shot comes from it
  const lamp = new THREE.Group();
  lamp.position.set(-2.05, 0, -2.3);
  const table = box(THREE, 0.7, 0.06, 0.7, PAL.timber); table.position.y = 0.78; lamp.add(table);
  for (const [lx, lz] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) {
    const leg = box(THREE, 0.07, 0.78, 0.07, PAL.timber); leg.position.set(lx, 0.39, lz); lamp.add(leg);
  }
  const flame = box(THREE, 0.18, 0.24, 0.18, PAL.glassLit,
    { emissive: PAL.glassLit, emissiveIntensity: 1.4, castShadow: false });
  flame.position.y = 1.02; lamp.add(flame);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.26, 8, 1, true),
    new THREE.MeshLambertMaterial({ color: PAL.timber, side: THREE.DoubleSide }));
  shade.position.y = 1.24; shade.castShadow = true; lamp.add(shade);
  g.add(lamp);

  const chair = new THREE.Group();
  chair.position.set(2.0, 0, -0.4); chair.rotation.y = -0.5;
  const seat = box(THREE, 0.6, 0.07, 0.6, PAL.timber); seat.position.y = 0.5; chair.add(seat);
  const backr = box(THREE, 0.6, 0.72, 0.07, PAL.timber); backr.position.set(0, 0.86, -0.26); chair.add(backr);
  for (const [cx, cz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    const leg = box(THREE, 0.06, 0.5, 0.06, PAL.timber); leg.position.set(cx, 0.25, cz); chair.add(leg);
  }
  g.add(chair);

  g.position.set(400, 0, 0);
  return { root: g, bed, lampPos: new THREE.Vector3(400 - 2.05, 1.02, -2.3), W, D, H };
}

/* ── the world ────────────────────────────────────────────────────────────── */
export function buildWorld(THREE) {
  const rng = mulberry32(1697);       // Perrault publishes the tale, 1697
  const root = new THREE.Group();

  const mats = {
    bark: new THREE.MeshLambertMaterial({ color: PAL.bark }),
    barkFar: new THREE.MeshLambertMaterial({ color: PAL.barkDark }),
    leaf: new THREE.MeshLambertMaterial({ color: PAL.leaf }),
    leafDark: new THREE.MeshLambertMaterial({ color: PAL.leafDark }),
  };

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520),
    new THREE.MeshLambertMaterial({ color: PAL.moss }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  root.add(ground);

  // the path: a ribbon that follows the same curve everything else uses
  {
    const pts = [];
    for (let z = -80; z <= 130; z += 2) pts.push(z);
    const pos = new Float32Array(pts.length * 2 * 3);
    const idx = [];
    pts.forEach((z, i) => {
      const x = pathX(z), w = 1.95 + 0.3 * Math.sin(z * 0.31);
      pos[i * 6] = x - w; pos[i * 6 + 1] = 0.02; pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x + w; pos[i * 6 + 4] = 0.02; pos[i * 6 + 5] = z;
      if (i < pts.length - 1) {
        // wound so the face normal points UP. The other winding renders a path
        // that is lit from underneath and invisible from above, which is exactly
        // the shot the whole corridor was cleared for
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const ribbon = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: PAL.earth }));
    ribbon.receiveShadow = true;
    root.add(ribbon);
  }

  // the wood: rejection-sampled so nothing stands in the path, the dolly line
  // or either clearing
  let placed = 0, guard = 0;
  while (placed < 340 && guard < 12000) {
    guard++;
    const z = -78 + rng() * 210;
    const x = pathX(z) + (rng() - 0.5) * 170;
    if (blocked(x, z)) continue;
    const dist = Math.abs(x - pathX(z));
    const near = dist < 26;
    const h = 8 + rng() * 13 + (near ? 0 : 2);
    const t = tree(THREE, rng, mats, h, near);
    t.position.set(x, 0, z);
    root.add(t); placed++;
  }

  // undergrowth: what makes the floor of a wood read as a floor
  const fernM = new THREE.MeshLambertMaterial({ color: PAL.leafDark });
  const rockM = new THREE.MeshLambertMaterial({ color: PAL.stone });
  const logM = new THREE.MeshLambertMaterial({ color: PAL.barkDark });
  for (let i = 0; i < 900; i++) {
    const z = -78 + rng() * 210;
    const x = pathX(z) + (rng() - 0.5) * 110;
    if (Math.abs(x - pathX(z)) < 1.7) continue;
    const r = rng();
    let m;
    if (r < 0.72) {
      m = new THREE.Mesh(new THREE.ConeGeometry(0.16 + rng() * 0.26, 0.5 + rng() * 0.9, 4), fernM);
      m.position.set(x, 0.3 + rng() * 0.3, z);
      m.rotation.set((rng() - 0.5) * 0.5, rng() * 3, (rng() - 0.5) * 0.5);
    } else if (r < 0.93) {
      m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + rng() * 0.45, 0), rockM);
      m.position.set(x, 0.12 + rng() * 0.14, z);
      m.rotation.set(rng(), rng(), rng());
      m.scale.set(1, 0.6 + rng() * 0.4, 1);
    } else {
      const L = 1.6 + rng() * 3.2;
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, L, 6), logM);
      m.position.set(x, 0.2, z);
      m.rotation.set(Math.PI / 2, 0, rng() * Math.PI);
    }
    m.castShadow = true; m.receiveShadow = true;
    root.add(m);
  }

  // both cottages are turned to face the camera that will look at them: a set is
  // built for a lens, not for a compass
  const cottageA = cottage(THREE, rng, { x: -8, z: -52, rot: Math.PI + 0.22, lit: true, ajar: 0.9 });
  const cottageB = cottage(THREE, rng, { x: 4, z: 92, rot: Math.PI + 0.06, w: 6.8, lit: true, ajar: 0.55 });
  root.add(cottageA.root, cottageB.root);

  // a low stone wall and a gate post, so the grandmother's clearing has an edge
  for (let i = 0; i < 16; i++) {
    const a = -0.9 + i * 0.11;
    const w = box(THREE, 1.3, 0.5 + rng() * 0.2, 0.5, PAL.stone);
    w.position.set(4 + Math.sin(a) * 12, 0.28, 92 - Math.cos(a) * 12);
    w.rotation.y = a; root.add(w);
  }

  const room = bedroom(THREE, rng);
  root.add(room.root);

  /* Light shafts. Additive cones from the canopy gaps — the only volumetric
     trick in the film, used in exactly two shots and hidden in the rest. */
  const shafts = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const z = 4 + rng() * 46;
    const x = pathX(z) + (rng() - 0.5) * 14;
    const c = new THREE.Mesh(
      new THREE.ConeGeometry(1.5 + rng() * 1.6, 17, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xbcd0cf, transparent: true, opacity: 0.055,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
    c.position.set(x, 8.6, z);
    c.rotation.set(0.20, 0, 0.13);
    shafts.add(c);
  }
  root.add(shafts);

  // ── the cast ───────────────────────────────────────────────────────────────
  const girl = createGirl(THREE, PAL);
  const wolf = createWolf(THREE, PAL);
  const wolfBed = createWolf(THREE, PAL);
  const girlDoor = createGirl(THREE, PAL);   // the silhouette in the doorway, shot 09

  // the bed wolf wears the bonnet. It is four seconds of the film and the single
  // most recognisable object in the tale.
  // small enough that the ears come out of it — a bonnet that covers the ears
  // is a bonnet that deletes the only line the tale is remembered for
  const bonnet = new THREE.Mesh(new THREE.SphereGeometry(0.163, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshLambertMaterial({ color: PAL.bonnet }));
  // tall enough to sit BEHIND the ears: two dark ears against a dark headboard
  // are one dark rectangle, and against a pale bonnet they are two ears
  bonnet.position.set(0, 0.10, -0.015); bonnet.scale.set(1.02, 1.36, 1.16);
  bonnet.castShadow = true; bonnet.receiveShadow = true;
  wolfBed.head.add(bonnet);
  const frill = new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.032, 6, 14),
    new THREE.MeshLambertMaterial({ color: PAL.bonnet }));
  frill.position.set(0, 0.02, 0.03); frill.rotation.x = Math.PI / 2 - 0.25;
  frill.castShadow = true; wolfBed.head.add(frill);

  /* In shot 09 the blanket IS his body: the mound on the bed does that work, so
     the rig's own trunk, legs and tail are switched off. A shot only has to
     contain what the frame shows, and pretending otherwise is how you get a
     wolf's hind leg poking through a quilt. */
  for (const child of wolfBed.body.children) if (child.isMesh) child.visible = false;
  for (const child of wolfBed.neck.children) if (child.isMesh) child.visible = false;
  for (const part of [wolfBed.fr, wolfBed.fl, wolfBed.hr, wolfBed.hl]) part.hip.visible = false;
  wolfBed.tail.visible = false;

  root.add(girl.root, wolf.root, wolfBed.root, girlDoor.root);

  // ── lights ─────────────────────────────────────────────────────────────────
  const sun = new THREE.DirectionalLight(0xcfe0e2, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -72; sc.right = 72; sc.top = 72; sc.bottom = -72; sc.near = 1; sc.far = 200;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
  root.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0x8fa8ad, 0x2a3324, 0.9);
  root.add(hemi);

  const winA = new THREE.PointLight(0xffb86a, 9, 12, 1.9); winA.position.set(-6.2, 1.9, -49.2);
  const winB = new THREE.PointLight(0xffb86a, 22, 16, 1.9); winB.position.set(2.2, 1.9, 89.3);
  const eyeGlow = new THREE.PointLight(0xff7a2a, 0, 1.7, 2.2);
  const lampL = new THREE.PointLight(0xffb371, 18, 9.5, 1.9); lampL.position.copy(room.lampPos);
  lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); lampL.shadow.bias = -0.004;
  // the doorway light of the last shot: outside dusk, spilling in
  const doorL = new THREE.SpotLight(0xdcb98a, 0, 16, 0.55, 0.55, 1.4);
  doorL.position.set(400, 2.5, 8.4);
  doorL.target.position.set(400, 0.6, -1.5);
  doorL.castShadow = true; doorL.shadow.mapSize.set(1024, 1024); doorL.shadow.bias = -0.003;
  root.add(winA, winB, eyeGlow, lampL, doorL, doorL.target);

  // ── sky ────────────────────────────────────────────────────────────────────
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(340, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x35505e) },
        horizon: { value: new THREE.Color(0x8fa6a4) },
        glow: { value: new THREE.Color(0xffc48a) },
        glowAmt: { value: 0.4 },
        sunDir: { value: new THREE.Vector3(0.4, 0.5, -0.75).normalize() },
      },
      vertexShader: `varying vec3 vDir;
        void main(){ vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top, horizon, glow; uniform float glowAmt;
        uniform vec3 sunDir; varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 c = mix(horizon, top, pow(h, 0.5));
          float g = pow(max(dot(normalize(vDir), sunDir), 0.0), 7.0);
          c += glow * g * glowAmt;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));

  return {
    root, sky, sun, hemi, shafts,
    lights: { winA, winB, eyeGlow, lampL, doorL },
    girl, wolf, wolfBed, girlDoor,
    cottageA, cottageB, room,
  };
}
