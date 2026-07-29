/* soglia — the town, built from primitives. No models, no textures.
   Everything is deterministic: geometry from a seeded RNG, animation from an
   explicit time parameter, so the offline renderer can bake any frame on demand. */

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

// ── palette ──────────────────────────────────────────────────────────────────
export const PAL = {
  skyTop: 0x9fb4d4, skyHorizon: 0xf6c79e, sunGlow: 0xffd9a8,
  fog: 0xeec9a8,
  plaster: [0xe8d9c0, 0xd9a86c, 0xd99880, 0xdfc4a4, 0xc98d5f, 0xe2cdb2],
  roof: [0xa85f45, 0xb0654a, 0x9c5840],
  stone: 0xa89578, stoneDark: 0x8a7a62,
  cypress: 0x2f4432, foliage: 0x516b46,
  shutter: [0x6b7f68, 0x8a6a4e, 0x64707c],
  door: 0x6b4a34,
  glass: 0x2a2f38, glassLit: 0xffb46a,
  intWall: 0x6a5138, intFloor: 0x7a5a3e, beam: 0x4a3828,
  bench: 0x7a5a3c, chairWood: 0x8a6238,
  shaft: 0xffd9a8,
};

// ── small builders ───────────────────────────────────────────────────────────
function box(THREE, w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color, ...opts })
  );
  m.castShadow = opts.castShadow !== false;
  m.receiveShadow = true;
  return m;
}

// triangular prism roof: ridge along z, width w, depth d, rise h
function pitchedRoof(THREE, w, d, h, color) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// wall (width w, height h) pierced by an arch opening (aw wide, ah tall), extruded to depth
function archWall(THREE, w, h, aw, ah, depth, color) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
  const r = aw / 2, spring = Math.max(ah - r, r);
  const hole = new THREE.Path();
  hole.moveTo(-r, 0);
  hole.lineTo(-r, spring);
  hole.absarc(0, spring, r, Math.PI, 0, true);
  hole.lineTo(r, 0);
  hole.closePath();
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function cypress(THREE, rng, scale = 1) {
  const g = new THREE.Group();
  const trunk = box(THREE, 0.12, 0.6, 0.12, 0x4a3828); trunk.position.y = 0.3; g.add(trunk);
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 3.4, 7),
    new THREE.MeshLambertMaterial({ color: PAL.cypress })
  );
  body.position.y = 2.2; body.castShadow = true;
  body.scale.set(1, 1 + rng() * 0.3, 1);
  g.add(body);
  g.scale.setScalar(scale * (0.85 + rng() * 0.3));
  return g;
}

// ── a house: plaster box, pitched roof, shuttered windows on the street face ──
function house(THREE, rng, w, h, d, facing /* +1 faces +x, -1 faces -x */) {
  const g = new THREE.Group();
  const plaster = PAL.plaster[(rng() * PAL.plaster.length) | 0];
  const body = box(THREE, w, h, d, plaster);
  body.position.y = h / 2;
  g.add(body);
  const roof = pitchedRoof(THREE, Math.min(w, d) + 0.5, Math.max(w, d) + 0.5, 1.2 + rng() * 0.8,
    PAL.roof[(rng() * PAL.roof.length) | 0]);
  roof.position.y = h;
  if (w > d) roof.rotation.y = Math.PI / 2;
  g.add(roof);

  // street-face windows, framed so they read even at a grazing angle
  const face = new THREE.Group();
  const floors = Math.max(1, Math.round((h - 2.6) / 2.6));
  const cols = Math.max(1, Math.round((d - 1.2) / 1.9));
  const frameC = PAL.stone;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const y = 2.9 + f * 2.6;
      const z = (c - (cols - 1) / 2) * 1.9;
      const lit = rng() < 0.08;
      const win = box(THREE, 0.05, 1.05, 0.66, lit ? PAL.glassLit : PAL.glass,
        lit ? { emissive: PAL.glassLit, emissiveIntensity: 0.9 } : {});
      win.position.set(0.01, y, z);
      face.add(win);
      for (const s of [-1, 1]) {
        const jamb = box(THREE, 0.1, 1.25, 0.14, frameC);
        jamb.position.set(0.04, y, z + s * 0.4);
        face.add(jamb);
      }
      const lintel = box(THREE, 0.1, 0.14, 0.94, frameC);
      lintel.position.set(0.04, y + 0.66, z);
      face.add(lintel);
      const sill = box(THREE, 0.18, 0.1, 1.0, frameC);
      sill.position.set(0.07, y - 0.62, z);
      face.add(sill);
      const shColor = PAL.shutter[(rng() * PAL.shutter.length) | 0];
      for (const s of [-1, 1]) {
        const sh = box(THREE, 0.07, 1.1, 0.4, shColor);
        sh.position.set(0.06, y, z + s * 0.62);
        if (rng() < 0.25) sh.rotation.y = s * (0.5 + rng() * 0.5); // a shutter left ajar
        face.add(sh);
      }
    }
    // string course between floors — the horizontal that makes a facade read
    if (f > 0) {
      const band = box(THREE, 0.08, 0.16, d * 0.94, PAL.stone);
      band.position.set(0.03, 2.9 + f * 2.6 - 1.45, 0);
      face.add(band);
    }
  }
  // street door: dark opening with a stone surround
  {
    const dz = (rng() - 0.5) * (d - 2.4);
    const opening = box(THREE, 0.06, 2.4, 1.2, 0x2e2721);
    opening.position.set(0.01, 1.2, dz);
    face.add(opening);
    for (const s of [-1, 1]) {
      const jamb = box(THREE, 0.12, 2.55, 0.22, frameC);
      jamb.position.set(0.05, 1.27, dz + s * 0.71);
      face.add(jamb);
    }
    const lintel = box(THREE, 0.12, 0.24, 1.66, frameC);
    lintel.position.set(0.05, 2.62, dz);
    face.add(lintel);
  }
  face.position.x = facing * (w / 2 + 0.01);
  if (facing < 0) face.rotation.y = Math.PI;
  g.add(face);
  return g;
}

// ── laundry line between two points, cloth swaying in update() ───────────────
function laundry(THREE, rng, a, b) {
  const g = new THREE.Group();
  const mid = a.clone().lerp(b, 0.5); mid.y -= 0.35; // sag
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const line = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 12, 0.012, 4),
    new THREE.MeshBasicMaterial({ color: 0x3a3430 })
  );
  g.add(line);
  const cloths = [];
  const colors = [0xe8e2d4, 0xd9c9b0, 0xc9d4d9, 0xd9a86c, 0xe8d9c0];
  const n = 2 + ((rng() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const t = 0.2 + (i / Math.max(n - 1, 1)) * 0.6;
    const p = curve.getPoint(t);
    const w = 0.5 + rng() * 0.4, h = 0.6 + rng() * 0.5;
    const c = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h, 1, 3),
      new THREE.MeshLambertMaterial({ color: colors[(rng() * colors.length) | 0], side: THREE.DoubleSide })
    );
    c.position.copy(p); c.position.y -= h / 2;
    c.castShadow = true;
    c.userData.phase = rng() * Math.PI * 2;
    g.add(c); cloths.push(c);
  }
  g.userData.update = (t) => {
    for (const c of cloths) {
      c.rotation.y = Math.sin(t * 0.7 + c.userData.phase) * 0.35;
      c.rotation.z = Math.sin(t * 1.1 + c.userData.phase * 2) * 0.06;
    }
  };
  return g;
}

// ── the whole town ───────────────────────────────────────────────────────────
export function buildTown(THREE) {
  const rng = mulberry32(1410); // the year Brunelleschi is in Florence — repo tradition of seeded facts
  const root = new THREE.Group();
  const updates = [];

  // ground: one big warm plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshLambertMaterial({ color: 0xbfa583 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // ── approach: cypress avenue outside the walls ──
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const c = cypress(THREE, rng, 1.1);
    c.position.set(side * (5.5 + rng() * 2), 0, -30 + i * 4.5 + rng() * 2);
    root.add(c);
  }
  // dirt road from the horizon to the gate, flanked by dry-stone walls
  {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 42),
      new THREE.MeshLambertMaterial({ color: 0xa8875f })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.03, -19);
    road.receiveShadow = true;
    root.add(road);
    for (const s of [-1, 1]) {
      const wall = box(THREE, 0.5, 0.9, 18, PAL.stoneDark);
      wall.position.set(s * 3.4, 0.45, -22);
      root.add(wall);
    }
  }
  // distant hills
  for (let i = 0; i < 5; i++) {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(30 + rng() * 30, 16, 10),
      new THREE.MeshLambertMaterial({ color: 0x8a9468 })
    );
    hill.scale.y = 0.22 + rng() * 0.1;
    hill.position.set(-120 + i * 60 + rng() * 20, -2, -90 - rng() * 40);
    root.add(hill);
  }

  // ── the gate (la porta) at z=0 ──
  const gate = new THREE.Group();
  const wall = archWall(THREE, 10, 7.5, 4.2, 5.4, 2.4, PAL.stone);
  gate.add(wall);
  for (const s of [-1, 1]) {
    const tower = box(THREE, 2.6, 9.5, 2.8, PAL.stoneDark);
    tower.position.set(s * 5.6, 4.75, 0);
    gate.add(tower);
    const troof = pitchedRoof(THREE, 3.2, 3.4, 1.4, PAL.roof[0]);
    troof.position.set(s * 5.6, 9.5, 0);
    gate.add(troof);
  }
  // town walls running away from the gate
  for (const s of [-1, 1]) {
    const w = box(THREE, 26, 5.5, 1.6, PAL.stone);
    w.position.set(s * 19.5, 2.75, 0);
    gate.add(w);
  }
  // wooden gate doors, swung fully open against the front face
  for (const s of [-1, 1]) {
    const door = box(THREE, 1.9, 4.8, 0.16, PAL.door);
    door.position.set(s * 3.1, 2.4, -1.32);
    gate.add(door);
    for (let b = 0; b < 3; b++) {
      const band = box(THREE, 1.7, 0.1, 0.05, 0x3a3430);
      band.position.set(s * 3.1, 1.2 + b * 1.4, -1.42);
      gate.add(band);
    }
  }
  root.add(gate);

  // ── the street (la strada): z 10→58, curving to x≈8.5, climbing ──
  const streetCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 8), new THREE.Vector3(2, 0.12, 22),
    new THREE.Vector3(6, 0.28, 38), new THREE.Vector3(8.5, 0.4, 56),
  ]);
  // paving ribbon following the curve
  {
    const pts = streetCurve.getPoints(24);
    const g = new THREE.PlaneGeometry(7, 1);
    const pos = [];
    const idx = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const tan = streetCurve.getTangent(i / (pts.length - 1));
      const nrm = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar(3.5);
      pos.push(p.x - nrm.x, p.y + 0.02, p.z - nrm.z, p.x + nrm.x, p.y + 0.02, p.z + nrm.z);
      if (i < pts.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    pg.setIndex(idx); pg.computeVertexNormals();
    const pave = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ color: 0x9c8a70 }));
    pave.receiveShadow = true;
    root.add(pave);
  }
  // houses along both sides
  const laundryAnchors = [];
  for (let i = 0; i < 8; i++) {
    const t = 0.06 + i * 0.125;
    const p = streetCurve.getPoint(t);
    const tan = streetCurve.getTangent(t);
    const nrm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    for (const s of [-1, 1]) {
      if (rng() < 0.12) continue; // a gap where a side alley would be
      const w = 4.5 + rng() * 1.5, d = 4.5 + rng() * 2, h = 4.5 + rng() * 3;
      const hh = house(THREE, rng, w, h, d, -s);
      const off = 4.3 + d / 2;
      hh.position.set(p.x + nrm.x * off * s, p.y, p.z + nrm.z * off * s);
      hh.rotation.y = Math.atan2(tan.x, tan.z);
      root.add(hh);
      if (rng() < 0.7) laundryAnchors.push(new THREE.Vector3(p.x + nrm.x * 3.2 * s, p.y + 3.1 + rng() * 0.5, p.z + nrm.z * 3.2 * s));
    }
  }
  // laundry lines across the street
  for (let i = 0; i + 1 < laundryAnchors.length; i += 2) {
    const l = laundry(THREE, rng, laundryAnchors[i], laundryAnchors[i + 1]);
    root.add(l); updates.push(l.userData.update);
  }

  // ── the sottoportico (connector to the piazza): building block with an arch at z≈60 ──
  {
    const blk = new THREE.Group();
    const front = archWall(THREE, 14, 8, 3.2, 4.2, 5.5, PAL.plaster[3]);
    front.position.set(9, 0.4, 60.5);
    blk.add(front);
    const rf = pitchedRoof(THREE, 14.6, 6.4, 2.0, PAL.roof[1]);
    rf.rotation.y = 0; rf.position.set(9, 8.4, 60.5);
    blk.add(rf);
    // flanking houses so the block reads as continuous street frontage
    for (const s of [-1, 1]) {
      const hh = house(THREE, rng, 5, 6.5, 5, 1);
      hh.position.set(9 + s * 9.5, 0.4, 60.5);
      hh.rotation.y = Math.PI;
      blk.add(hh);
    }
    root.add(blk);
  }

  // ── the piazza: z 66→100, x -6→28 ──
  {
    const sq = new THREE.Mesh(
      new THREE.PlaneGeometry(38, 38),
      new THREE.MeshLambertMaterial({ color: 0xac9c86 })
    );
    sq.rotation.x = -Math.PI / 2;
    sq.position.set(11, 0.42, 83);
    sq.receiveShadow = true;
    root.add(sq);
    for (let i = 0; i < 8; i++) {
      const jx = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 38), new THREE.MeshLambertMaterial({ color: 0x9a8874 }));
      jx.rotation.x = -Math.PI / 2; jx.position.set(-5.25 + i * 4.65, 0.43, 83); root.add(jx);
      const jz = new THREE.Mesh(new THREE.PlaneGeometry(38, 0.07), new THREE.MeshLambertMaterial({ color: 0x9a8874 }));
      jz.rotation.x = -Math.PI / 2; jz.position.set(11, 0.43, 65.25 + i * 4.65); root.add(jz);
    }

    // church at the far end, facade toward the camera path
    const church = new THREE.Group();
    const nave = box(THREE, 14, 9, 3, PAL.plaster[0]); nave.position.y = 4.5; church.add(nave);
    const ped = pitchedRoof(THREE, 14.6, 3.4, 3.2, PAL.plaster[0]);
    ped.position.y = 9; church.add(ped);
    const door = archWall(THREE, 3.4, 4.6, 2.4, 3.8, 0.7, PAL.stoneDark);
    door.position.set(0, 0, -1.7); church.add(door);
    const rose = new THREE.Mesh(
      new THREE.CircleGeometry(1.25, 24),
      new THREE.MeshLambertMaterial({ color: 0x35424e })
    );
    rose.position.set(0, 6.4, -1.56); rose.rotation.y = Math.PI; church.add(rose);
    const roseRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.14, 8, 24),
      new THREE.MeshLambertMaterial({ color: PAL.stone })
    );
    roseRing.position.set(0, 6.4, -1.56); church.add(roseRing);
    for (const s of [-1, 1]) {
      const pil = box(THREE, 0.6, 9, 0.3, PAL.plaster[3]);
      pil.position.set(s * 5.2, 4.5, -1.6);
      church.add(pil);
    }
    const cornice = box(THREE, 14.4, 0.3, 0.4, PAL.stone);
    cornice.position.set(0, 8.85, -1.6);
    church.add(cornice);
    church.position.set(6, 0.42, 98);
    root.add(church);

    // campanile
    const camp = new THREE.Group();
    const shaft = box(THREE, 3, 16, 3, PAL.plaster[3]); shaft.position.y = 8; camp.add(shaft);
    const belfry = archWall(THREE, 3.4, 3, 1.8, 2.2, 3.4, PAL.plaster[0]);
    belfry.position.y = 16; camp.add(belfry);
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 3.4, 4),
      new THREE.MeshLambertMaterial({ color: PAL.roof[2] })
    );
    spire.position.y = 20.7; spire.rotation.y = Math.PI / 4; spire.castShadow = true; camp.add(spire);
    camp.position.set(32, 0.42, 98);
    root.add(camp);

    // fountain
    const f = new THREE.Group();
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.8, 0.9, 8),
      new THREE.MeshLambertMaterial({ color: PAL.stone })
    );
    basin.position.y = 0.45; basin.castShadow = true; basin.receiveShadow = true; f.add(basin);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 8),
      new THREE.MeshLambertMaterial({ color: 0x7d97a8, transparent: true, opacity: 0.85 })
    );
    water.rotation.x = -Math.PI / 2; water.position.y = 0.82; f.add(water);
    const column = box(THREE, 0.42, 1.3, 0.42, PAL.stoneDark); column.position.y = 1.45; f.add(column);
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.52, 0.3, 8),
      new THREE.MeshLambertMaterial({ color: PAL.stone })
    );
    upper.position.y = 2.25; upper.castShadow = true; f.add(upper);
    f.userData.update = (t) => { water.position.y = 0.82 + Math.sin(t * 2.2) * 0.015; water.rotation.z = t * 0.05; };
    updates.push(f.userData.update);
    f.position.set(3.5, 0.42, 77);
    root.add(f);

    // piazza furniture: two plane trees with benches, café tables by the east row
    for (const [tx, tz] of [[-3, 74], [-3, 88]]) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.3, 2.6, 7),
        new THREE.MeshLambertMaterial({ color: 0x7a6a58 })
      );
      trunk.position.y = 1.3; trunk.castShadow = true; tree.add(trunk);
      for (let k = 0; k < 3; k++) {
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(1.7 - k * 0.3, 10, 8),
          new THREE.MeshLambertMaterial({ color: PAL.foliage })
        );
        crown.position.set((rng() - 0.5) * 1.2, 3.1 + k * 0.85, (rng() - 0.5) * 1.2);
        crown.scale.y = 0.75; crown.castShadow = true;
        tree.add(crown);
      }
      tree.position.set(tx, 0.42, tz);
      root.add(tree);
      const benchS = box(THREE, 2.2, 0.45, 0.7, PAL.stone);
      benchS.position.set(tx + 1.9, 0.65, tz);
      root.add(benchS);
    }
    for (const [cx, cz] of [[23.5, 70], [23.8, 73.2]]) {
      const table = new THREE.Group();
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.05, 12),
        new THREE.MeshLambertMaterial({ color: 0xd9d2c4 })
      );
      top.position.y = 0.72; top.castShadow = true; table.add(top);
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 0.72, 6),
        new THREE.MeshLambertMaterial({ color: 0x3a3430 })
      );
      leg.position.y = 0.36; table.add(leg);
      table.position.set(cx, 0.42, cz);
      root.add(table);
      for (const a of [0.6, 2.8]) {
        const stool = box(THREE, 0.4, 0.45, 0.4, PAL.door);
        stool.position.set(cx + Math.cos(a) * 1.05, 0.65, cz + Math.sin(a) * 1.05);
        root.add(stool);
      }
    }

    // east side row (the bottega lives here, at x=26, z 76-92 — keep it clear)
    for (const z of [69.5, 96]) {
      const hh = house(THREE, rng, 5, 5.5 + rng() * 2, 5, -1);
      hh.position.set(28.5, 0.42, z);
      hh.rotation.y = -Math.PI / 2;
      root.add(hh);
    }
    // belvedere parapet: the west edge of the square looks over the valley
    {
      const parapet = box(THREE, 0.5, 1.1, 34, PAL.stone);
      parapet.position.set(-9.5, 0.97, 83);
      root.add(parapet);
      const coping = box(THREE, 0.7, 0.12, 34.4, PAL.stoneDark);
      coping.position.set(-9.5, 1.58, 83);
      root.add(coping);
    }
    // west side row
    for (let i = 0; i < 3; i++) {
      const hh = house(THREE, rng, 5, 6 + rng() * 2, 5, 1);
      hh.position.set(-7.5, 0.42, 70 + i * 7);
      hh.rotation.y = Math.PI / 2;
      root.add(hh);
    }
  }

  // ── the bottega: door at x=26 (z=84), interior x 26→40, z 76→92 ──
  {
    const b = new THREE.Group();
    const front = archWall(THREE, 16, 6.5, 2.6, 3.6, 0.8, PAL.plaster[1]);
    front.rotation.y = -Math.PI / 2;
    front.position.set(26, 0.42, 84);
    b.add(front);
    const rf = pitchedRoof(THREE, 16.6, 15, 2.2, PAL.roof[0]);
    rf.rotation.y = Math.PI / 2; rf.position.set(33, 6.92, 84);
    b.add(rf);

    // interior shell (offset so piazza ground level 0.42 is the floor)
    const Y = 0.42;
    // a lantern over the door — the workshop keeps a light on at dawn
    const bracket = box(THREE, 0.5, 0.06, 0.06, 0x3a3430); bracket.position.set(25.6, Y + 2.75, 84); b.add(bracket);
    const lampBox = box(THREE, 0.22, 0.3, 0.22, 0x3a3430); lampBox.position.set(25.38, Y + 2.55, 84); b.add(lampBox);
    const lampPane = box(THREE, 0.16, 0.2, 0.16, 0xffc98a, { emissive: 0xffc98a, emissiveIntensity: 1.4 });
    lampPane.position.set(25.38, Y + 2.55, 84); b.add(lampPane);
    const floor = box(THREE, 14, 0.2, 16, PAL.intFloor, { castShadow: false });
    floor.position.set(33, Y - 0.1, 84); b.add(floor);
    const back = box(THREE, 0.4, 6.5, 16, PAL.intWall); back.position.set(40, Y + 3.25, 84); b.add(back);
    // +z wall with a high workshop window (opening y 2.8-5.0, x centred on 33)
    for (const sx of [-1, 1]) {
      const side = box(THREE, 6.1, 6.5, 0.4, PAL.intWall);
      side.position.set(33 + sx * (0.9 + 3.05), Y + 3.25, 92);
      b.add(side);
    }
    const wBelow = box(THREE, 1.8, 2.8, 0.4, PAL.intWall); wBelow.position.set(33, Y + 1.4, 92); b.add(wBelow);
    const wAbove = box(THREE, 1.8, 1.5, 0.4, PAL.intWall); wAbove.position.set(33, Y + 5.75, 92); b.add(wAbove);
    const wSill = box(THREE, 2.2, 0.14, 0.6, PAL.stone); wSill.position.set(33, Y + 2.72, 92); b.add(wSill);
    const wzMinus = box(THREE, 0.4, 6.5, 16, PAL.intWall); wzMinus.position.set(33, Y + 3.25, 76); b.add(wzMinus);
    const ceil = box(THREE, 14, 0.3, 16, PAL.beam); ceil.position.set(33, Y + 6.5, 84); b.add(ceil);
    // beams
    for (let i = 0; i < 3; i++) {
      const bm = box(THREE, 14, 0.28, 0.42, PAL.beam);
      bm.position.set(33, Y + 6.15, 79 + i * 4.5);
      b.add(bm);
    }
    // window frame glow (the dawn outside)
    const winGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 2.2),
      new THREE.MeshBasicMaterial({ color: 0xffe0b8 })
    );
    winGlow.rotation.y = Math.PI; winGlow.position.set(33, Y + 3.9, 91.9);
    b.add(winGlow);

    // workbench
    const bench = new THREE.Group();
    const top = box(THREE, 3.2, 0.16, 1.2, PAL.bench); top.position.y = 1.0; bench.add(top);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = box(THREE, 0.14, 1.0, 0.14, PAL.beam);
      leg.position.set(sx * 1.4, 0.5, sz * 0.45);
      bench.add(leg);
    }
    bench.position.set(34.6, Y, 86.6);
    bench.rotation.y = -0.35;
    b.add(bench);

    // the half-made chair on the bench — the reason the camera came in
    const chair = new THREE.Group();
    const seat = box(THREE, 0.5, 0.06, 0.5, PAL.chairWood); seat.position.y = 0.5; chair.add(seat);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = box(THREE, 0.05, 0.5, 0.05, PAL.chairWood);
      leg.position.set(sx * 0.21, 0.25, sz * 0.21);
      chair.add(leg);
    }
    const backLeg = box(THREE, 0.05, 1.05, 0.05, PAL.chairWood); backLeg.position.set(-0.21, 0.52, -0.21); chair.add(backLeg);
    const backLeg2 = box(THREE, 0.05, 1.05, 0.05, PAL.chairWood); backLeg2.position.set(0.21, 0.52, -0.21); chair.add(backLeg2);
    // one back slat fitted, two still missing — the work is visibly unfinished
    const slat = box(THREE, 0.47, 0.08, 0.04, PAL.chairWood); slat.position.set(0, 0.98, -0.21); chair.add(slat);
    chair.position.set(34.9, Y + 1.08, 86.4);
    chair.rotation.y = 0.6;
    b.add(chair);

    // tools on the bench: a plane and a mallet, readable silhouettes
    const planeT = box(THREE, 0.34, 0.09, 0.12, 0x4a4a4e); planeT.position.set(34.15, Y + 1.16, 86.85); planeT.rotation.y = -0.3; b.add(planeT);


    // shelf with a few pots
    const shelf = box(THREE, 3, 0.08, 0.4, PAL.beam); shelf.position.set(39.7, Y + 2.6, 82); shelf.rotation.y = Math.PI / 2; b.add(shelf);
    for (let i = 0; i < 4; i++) {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.09, 0.24, 8),
        new THREE.MeshLambertMaterial({ color: PAL.roof[i % 3] })
      );
      pot.position.set(39.7, Y + 2.8, 80.9 + i * 0.7);
      pot.castShadow = true;
      b.add(pot);
    }

    // visible light shaft: window → bench (two nested additive cones)
    for (const [op, r1, r2] of [[0.045, 0.8, 2.0], [0.032, 0.55, 1.4]]) {
      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(r1, r2, 5.6, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: PAL.shaft, transparent: true, opacity: op,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        })
      );
      cone.position.set(33.5, Y + 2.5, 89.1);
      cone.rotation.x = 1.08;
      b.add(cone);
    }

    // dust motes in the shaft
    const N = 240;
    const dp = new Float32Array(N * 3);
    const dseed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      dp[i * 3] = 33.2 + rng() * 2.6;
      dp[i * 3 + 1] = Y + 0.5 + rng() * 4.5;
      dp[i * 3 + 2] = 87.0 + rng() * 4.5;
      dseed[i] = rng() * Math.PI * 2;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xffe4bb, size: 0.012, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    b.add(dust);
    updates.push((t) => {
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        arr[i * 3] += Math.sin(t * 0.3 + dseed[i]) * 0.0012;
        arr[i * 3 + 1] += Math.cos(t * 0.22 + dseed[i] * 1.7) * 0.0009;
      }
      dustGeo.attributes.position.needsUpdate = true;
    });

    root.add(b);
  }

  return { root, updates };
}

// ── lighting ─────────────────────────────────────────────────────────────────
export function buildLights(THREE, scene) {
  const sun = new THREE.DirectionalLight(0xffd9b0, 2.7);
  sun.position.set(60, 38, -6); // low dawn sun from the east, raking across the piazza
  sun.target.position.set(10, 0, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 260;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xa8bdd8, 0x8a6a55, 1.0);
  scene.add(hemi);

  // bottega: warm spot through the window
  const spot = new THREE.SpotLight(0xffc98a, 110, 24, 0.42, 0.5, 1.6);
  spot.position.set(33, 4.3, 91.5);
  spot.target.position.set(34.6, 1.5, 86.6);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  scene.add(spot, spot.target);

  const warm = new THREE.PointLight(0xffb46a, 20, 12, 1.8);
  warm.position.set(36, 2.8, 84);
  scene.add(warm);

  const doorFill = new THREE.PointLight(0xa8988a, 6, 10, 1.8);
  doorFill.position.set(27.5, 2.4, 84);
  scene.add(doorFill);

  const lantern = new THREE.PointLight(0xffb46a, 9, 8, 1.8);
  lantern.position.set(25.3, 2.9, 84);
  scene.add(lantern);
}

// ── sky dome with dawn gradient + sun glow ───────────────────────────────────
export function buildSky(THREE) {
  const geo = new THREE.SphereGeometry(320, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(PAL.skyTop) },
      horizon: { value: new THREE.Color(PAL.skyHorizon) },
      glow: { value: new THREE.Color(PAL.sunGlow) },
      sunDir: { value: new THREE.Vector3(60, 38, -6).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top, horizon, glow, sunDir; varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 c = mix(horizon, top, pow(h, 0.55));
        float g = pow(max(dot(normalize(vDir), sunDir), 0.0), 6.0);
        c += glow * g * 0.55;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

// ── the camera flight ────────────────────────────────────────────────────────
// 7 segments: dwell / connector alternating. Each segment owns its own curve,
// and neighbours share their seam point exactly — the last frame of clip N is
// the first frame of clip N+1 by construction. Every connector is a doorway.
// Eye heights follow the terrain: the street climbs ~2.6 m from gate to piazza.
export const SEGMENTS = [
  { id: "s0-porta",   kind: "dive", secs: 7.0 },
  { id: "c0-arco",    kind: "conn", secs: 3.5 },
  { id: "s1-strada",  kind: "dive", secs: 7.0 },
  { id: "c1-vicolo",  kind: "conn", secs: 3.5 },
  { id: "s2-piazza",  kind: "dive", secs: 7.5 },
  { id: "c2-varco",   kind: "conn", secs: 3.5 },
  { id: "s3-bottega", kind: "dive", secs: 7.0 },
];

const LEGS = [
  { pos: [[0, 3.2, -36], [0, 2.6, -20], [0, 2.5, -8]],
    tgt: [[0, 4.5, 0], [0, 4.2, -2], [0, 3.8, 2]] },
  { pos: [[0, 2.5, -8], [0, 2.3, 0], [0, 2.35, 10]],
    tgt: [[0, 3.8, 2], [0, 3.0, 14], [1, 2.4, 20]] },
  { pos: [[0, 2.35, 10], [2, 2.5, 18], [5, 2.6, 30], [7, 2.7, 42], [8, 2.7, 48]],
    tgt: [[1, 2.4, 20], [4, 2.4, 30], [7, 2.5, 44], [8.5, 2.6, 56], [9, 2.8, 60]] },
  { pos: [[8, 2.7, 48], [8.7, 2.6, 55], [9, 2.5, 61], [9, 2.5, 66]],
    tgt: [[9, 2.8, 60], [9, 2.3, 66], [6, 2.2, 72], [4.5, 2.2, 77]] },
  { pos: [[9, 2.6, 66], [7, 2.5, 72], [9, 2.5, 78], [14, 2.4, 81], [19, 2.4, 82.5]],
    tgt: [[4.5, 1.8, 79], [6, 3.2, 96], [10, 2.4, 88], [22, 2.0, 76], [26, 2.3, 84]] },
  { pos: [[19, 2.3, 82.5], [23, 2.25, 83.5], [26.5, 2.2, 84], [29.5, 2.1, 84.2]],
    tgt: [[26, 2.3, 84], [29, 2.0, 84.3], [31.5, 1.8, 84.8], [34, 1.6, 86]] },
  { pos: [[29.5, 2.1, 84.2], [31, 2.05, 84.8], [32.0, 2.0, 85.2], [32.4, 1.95, 85.5]],
    tgt: [[34, 1.6, 86], [34.5, 1.7, 86.3], [34.8, 1.75, 86.4], [34.9, 1.8, 86.45]] },
];

export function buildFlight(THREE) {
  const legs = LEGS.map((leg, i) => ({
    ...SEGMENTS[i],
    pos: new THREE.CatmullRomCurve3(leg.pos.map(p => new THREE.Vector3(...p)), false, "centripetal"),
    tgt: new THREE.CatmullRomCurve3(leg.tgt.map(p => new THREE.Vector3(...p)), false, "centripetal"),
  }));
  const total = legs.reduce((a, l) => a + l.secs, 0);
  const smooth = (x) => x * x * (3 - 2 * x);
  // dwells keep ~35% speed at the seams — a dead stop per doorway would read
  // as a stutter once the user's scroll drives playback
  const easeDive = (x) => 0.35 * x + 0.65 * smooth(x);
  const easeConn = (x) => 0.75 * x + 0.25 * smooth(x);

  function at(t01, outPos, outTgt) {
    const tSec = Math.min(Math.max(t01, 0), 1) * total;
    let acc = 0;
    for (const leg of legs) {
      if (tSec <= acc + leg.secs || leg === legs[legs.length - 1]) {
        const local = Math.min(Math.max((tSec - acc) / leg.secs, 0), 1);
        const e = leg.kind === "dive" ? easeDive(local) : easeConn(local);
        leg.pos.getPointAt(e, outPos);
        leg.tgt.getPointAt(e, outTgt);
        return { leg, local };
      }
      acc += leg.secs;
    }
  }
  return { at, totalSecs: total, legs };
}
