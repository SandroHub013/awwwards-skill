/* stacco — the two actors, built from a bone hierarchy rather than a model file.

   Both read as silhouettes, which is the whole art direction: the woods are graded
   into a 20° blue-green band and lit from above, so a figure inside them is an
   outline. An outline is carried by proportion and pose — the flare of a cloak, the
   drop of a wolf's head below its shoulder line — not by surface detail.

   Every joint is a Group pinned at its top end, so a limb rotates about the joint
   the way a rig does, without the rig file. Poses are functions of a phase, so the
   offline renderer can bake any frame on demand. */

// A limb is a tapered box whose pivot sits at its top edge.
function limb(THREE, w, h, d, taper = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < 0) { p.setX(i, p.getX(i) * taper); p.setZ(i, p.getZ(i) * taper); }
  }
  g.translate(0, -h / 2, 0);
  g.computeVertexNormals();
  return g;
}

const mk = (THREE, parent, geo, mat, pos) => {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
};
const joint = (THREE, parent, pos) => {
  const g = new THREE.Group();
  g.position.set(...pos);
  parent.add(g);
  return g;
};

/* ============================================================================
   The girl. 1.16 m tall — a child, and the scale is load-bearing: the wolf is
   built to stand eye to eye with her, which is what makes shot 06 work.

   The cloak is the only saturated red in the film. It is a flared cone rather
   than cloth simulation, because at every distance the film uses it, the cloak
   is a shape, not a fabric.
   ============================================================================ */
export function createGirl(THREE, PAL) {
  const cloth = new THREE.MeshLambertMaterial({ color: PAL.rosso });
  const dark = new THREE.MeshLambertMaterial({ color: PAL.rossoDark });
  const skin = new THREE.MeshLambertMaterial({ color: PAL.skin });
  const basketM = new THREE.MeshLambertMaterial({ color: PAL.basket });

  const root = new THREE.Group();
  const hips = joint(THREE, root, [0, 0, 0]);
  const spine = joint(THREE, hips, [0, 0, 0]);

  // torso is inside the cloak and barely seen; the cloak is the silhouette
  mk(THREE, spine, limb(THREE, 0.22, 0.34, 0.15, 1.1), dark, [0, 0.34, 0]);

  // the apex sits at the shoulders, not over the head: if the cone reaches the
  // crown the whole figure reads as one red triangle and the hood stops meaning
  // anything at all
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.30, 0.78, 12, 1, true), cloth);
  cloak.position.y = -0.04; cloak.castShadow = true; cloak.receiveShadow = true;
  cloak.material.side = THREE.DoubleSide;
  spine.add(cloak);

  const neck = joint(THREE, spine, [0, 0.36, 0]);
  mk(THREE, neck, new THREE.BoxGeometry(0.13, 0.15, 0.13), skin, [0, 0.09, 0]);
  // the hood: the fastest signal in the whole film. Wide enough to read at 40 m.
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.172, 0.30, 10), cloth);
  hood.position.set(0, 0.10, -0.012); hood.castShadow = true;
  neck.add(hood);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.028, 6, 12), cloth);
  brim.position.set(0, 0.015, 0.01); brim.rotation.x = Math.PI / 2 - 0.22;
  brim.castShadow = true;
  neck.add(brim);

  const arm = (side) => {
    const sh = joint(THREE, spine, [side * 0.135, 0.30, 0]);
    mk(THREE, sh, limb(THREE, 0.085, 0.22, 0.085, 0.85), dark);
    const el = joint(THREE, sh, [0, -0.22, 0]);
    mk(THREE, el, limb(THREE, 0.07, 0.20, 0.07, 0.9), skin);
    const hand = joint(THREE, el, [0, -0.20, 0]);
    return { sh, el, hand };
  };
  const armR = arm(1), armL = arm(-1);

  const leg = (side) => {
    const hip = joint(THREE, hips, [side * 0.075, 0, 0]);
    mk(THREE, hip, limb(THREE, 0.085, 0.26, 0.09, 0.9), dark);
    const knee = joint(THREE, hip, [0, -0.26, 0]);
    mk(THREE, knee, limb(THREE, 0.072, 0.24, 0.075, 0.9), dark);
    const foot = joint(THREE, knee, [0, -0.24, 0]);
    mk(THREE, foot, new THREE.BoxGeometry(0.08, 0.045, 0.15), dark, [0, -0.02, 0.035]);
    return { hip, knee, foot };
  };
  const legR = leg(1), legL = leg(-1);

  // the basket rides in the left hand and never leaves it
  const basket = new THREE.Group();
  mk(THREE, basket, new THREE.CylinderGeometry(0.085, 0.065, 0.11, 8), basketM, [0, -0.05, 0]);
  const handleG = new THREE.TorusGeometry(0.082, 0.008, 4, 10, Math.PI);
  mk(THREE, basket, handleG, basketM, [0, 0.0, 0]);
  const cloth2 = mk(THREE, basket, new THREE.BoxGeometry(0.15, 0.02, 0.13), cloth, [0, -0.012, 0]);
  cloth2.rotation.y = 0.3;
  armL.hand.add(basket);

  root.position.y = 0.50; // the rig hangs from the hips; feet land at ~-0.50
  return { root, hips, spine, neck, hood, cloak, armR, armL, legR, legL, basket };
}

/* A walk, as one number. Phase is in cycles, not seconds, so a shot can walk
   her at whatever cadence its own duration needs. */
export function poseGirl(g, phase, opts = {}) {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a), c = Math.cos(a);
  const swing = opts.swing ?? 1;             // 0 = standing still
  const lean = opts.lean ?? 0.06;

  g.legR.hip.rotation.x = s * 0.62 * swing;
  g.legL.hip.rotation.x = -s * 0.62 * swing;
  g.legR.knee.rotation.x = -Math.max(0, -s) * 0.85 * swing - 0.05;
  g.legL.knee.rotation.x = -Math.max(0, s) * 0.85 * swing - 0.05;

  g.armR.sh.rotation.x = -s * 0.42 * swing;
  g.armR.sh.rotation.z = 0.14;
  g.armL.sh.rotation.x = s * 0.16 * swing;   // the basket arm barely swings
  g.armL.sh.rotation.z = -0.30;
  g.armL.el.rotation.x = -1.05;              // held across the body
  g.armR.el.rotation.x = -0.30 - Math.max(0, s) * 0.25 * swing;

  g.spine.rotation.x = lean + c * 0.03 * swing;
  g.neck.rotation.x = (opts.look ?? 0) - lean * 0.6;
  g.neck.rotation.y = opts.turn ?? 0;
  // the bounce is what stops a walk cycle reading as a slide
  g.root.position.y = 0.50 + Math.abs(s) * 0.022 * swing + (opts.lift ?? 0);
  g.cloak.rotation.x = -0.03 - s * 0.05 * swing;
  g.cloak.scale.set(1, 1, 1 + Math.abs(c) * 0.05 * swing);
}

/* ============================================================================
   The wolf. Shoulder at 0.86 m — his head is level with hers, which is the
   only reason shot 06 needs no dialogue.

   A quadruped reads from two lines: the drop from shoulder to hip, and the
   head carried BELOW the shoulder line. Get those two wrong and it is a dog.
   ============================================================================ */
export function createWolf(THREE, PAL) {
  const fur = new THREE.MeshLambertMaterial({ color: PAL.wolf });
  const furDark = new THREE.MeshLambertMaterial({ color: PAL.wolfDark });
  const eyeM = new THREE.MeshBasicMaterial({ color: PAL.eye });

  const root = new THREE.Group();
  const body = joint(THREE, root, [0, 0.86, 0]);

  // chest higher than croup: the withers are the highest point of a wolf
  const chest = mk(THREE, body, new THREE.BoxGeometry(0.34, 0.40, 0.62), fur, [0, 0.02, 0.26]);
  chest.rotation.x = -0.06;
  mk(THREE, body, new THREE.BoxGeometry(0.30, 0.32, 0.60), fur, [0, -0.07, -0.28]);
  mk(THREE, body, limb(THREE, 0.30, 0.16, 0.30, 0.8), furDark, [0, 0.16, 0.10]); // withers ruff

  const neck = joint(THREE, body, [0, 0.10, 0.50]);
  mk(THREE, neck, limb(THREE, 0.26, 0.34, 0.28, 0.9), fur);
  const head = joint(THREE, neck, [0, -0.30, 0.06]);
  mk(THREE, head, new THREE.BoxGeometry(0.20, 0.19, 0.30), fur, [0, 0.02, 0.13]);
  const snout = mk(THREE, head, limb(THREE, 0.115, 0.30, 0.13, 0.75), furDark, [0, 0.04, 0.28]);
  snout.rotation.x = Math.PI / 2 + 0.05;
  // ears: two triangles, and the single most recognisable 30 cm of the film —
  // shot 09 is nothing but these two shapes above a pillow line
  const earG = new THREE.ConeGeometry(0.062, 0.19, 4);
  const earR = mk(THREE, head, earG, fur, [0.106, 0.165, 0.01]);
  const earL = mk(THREE, head, earG, fur, [-0.106, 0.165, 0.01]);
  earR.rotation.set(-0.06, Math.PI / 4, 0.56);
  earL.rotation.set(-0.06, Math.PI / 4, -0.56);

  // on the FRONT of the skull, not inside it: the head box runs to z = 0.28, and
  // an eye at z = 0.175 is an eye buried in bone that never renders
  const eyeG = new THREE.SphereGeometry(0.020, 10, 8);
  const eyeR = new THREE.Mesh(eyeG, eyeM); eyeR.position.set(0.064, 0.070, 0.286);
  const eyeL = new THREE.Mesh(eyeG, eyeM); eyeL.position.set(-0.064, 0.070, 0.286);
  eyeR.scale.set(1, 0.68, 1); eyeL.scale.set(1, 0.68, 1);   // almond, not headlight
  head.add(eyeR, eyeL);

  const leg = (sx, sz, upper, lower) => {
    const hip = joint(THREE, body, [sx * 0.14, -0.06, sz * 0.34]);
    mk(THREE, hip, limb(THREE, 0.10, upper, 0.13, 0.8), fur);
    const knee = joint(THREE, hip, [0, -upper, 0]);
    mk(THREE, knee, limb(THREE, 0.075, lower, 0.09, 0.85), furDark);
    const paw = joint(THREE, knee, [0, -lower, 0]);
    mk(THREE, paw, new THREE.BoxGeometry(0.09, 0.05, 0.15), furDark, [0, -0.02, 0.03]);
    return { hip, knee, paw };
  };
  // front legs are straighter, hind legs more angled — that difference is the gait
  const fr = leg(1, 1, 0.42, 0.40), fl = leg(-1, 1, 0.42, 0.40);
  const hr = leg(1, -1, 0.40, 0.40), hl = leg(-1, -1, 0.40, 0.40);

  const tail = joint(THREE, body, [0, -0.02, -0.56]);
  mk(THREE, tail, limb(THREE, 0.11, 0.46, 0.11, 0.55), furDark);
  tail.rotation.x = -1.15;

  return { root, body, neck, head, snout, earR, earL, eyeR, eyeL, eyeM, fr, fl, hr, hl, tail };
}

/* Gait. `run` 0 = a slow stalking walk, 1 = a full gallop — the difference is
   whether the diagonal pairs move together (walk) or the front pair and hind
   pair do (gallop). */
export function poseWolf(w, phase, opts = {}) {
  const a = phase * Math.PI * 2;
  const run = opts.run ?? 0;
  const amp = (opts.swing ?? 1) * (0.34 + run * 0.55);

  const s = Math.sin(a), s2 = Math.sin(a + Math.PI);
  // walk: diagonal pairs. gallop: front pair together, hind pair together.
  const fR = s, fL = run > 0.5 ? s * 0.92 : s2;
  const hR = run > 0.5 ? s2 : s2, hL = run > 0.5 ? s2 * 0.92 : s;

  w.fr.hip.rotation.x = fR * amp;      w.fr.knee.rotation.x = -Math.max(0, -fR) * amp * 1.2 - 0.12;
  w.fl.hip.rotation.x = fL * amp;      w.fl.knee.rotation.x = -Math.max(0, -fL) * amp * 1.2 - 0.12;
  w.hr.hip.rotation.x = hR * amp;      w.hr.knee.rotation.x = -Math.max(0, hR) * amp * 1.3 - 0.30;
  w.hl.hip.rotation.x = hL * amp;      w.hl.knee.rotation.x = -Math.max(0, hL) * amp * 1.3 - 0.30;

  w.body.position.y = 0.86 + Math.abs(s) * (0.02 + run * 0.09) + (opts.lift ?? 0);
  w.body.rotation.x = (opts.pitch ?? 0) + run * Math.sin(a * 2) * 0.05;
  w.neck.rotation.x = (opts.neck ?? 0.28) - run * 0.20;   // head carried low
  w.head.rotation.x = (opts.head ?? -0.18) + s * 0.03;
  w.head.rotation.y = opts.turn ?? 0;
  w.tail.rotation.x = -1.15 + Math.sin(a * 0.5) * 0.08;
  w.tail.rotation.z = Math.sin(a) * 0.10;

  // the eyes are the second red in the film, and they only ever grow
  const e = opts.eyes ?? 1;
  w.eyeR.scale.set(e, e * 0.68, e);
  w.eyeL.scale.set(e, e * 0.68, e);
  w.eyeR.visible = w.eyeL.visible = e > 0.01;
}
