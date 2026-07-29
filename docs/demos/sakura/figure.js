/* ============================================================
   The figure — a samurai, built from a bone hierarchy rather than
   loaded from a model file.

   It is rendered as a silhouette, which is not a dodge: ukiyo-e and
   most Japanese graphic design carry a figure on its outline, and an
   outline needs a fraction of the geometry a lit character does. The
   read comes from proportion and pose — the topknot, the sleeve line,
   the hakama flare, the length of the blade — not from surface detail.

   One motion is animated: iai, the draw. Scroll performs it.
   ============================================================ */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

/* A limb is a tapered box, pinned so it rotates about its top end —
   the same trick a real rig uses, without the rig file. */
function limb(w, h, d, taper = 1) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0) { p.setX(i, p.getX(i) * taper); p.setZ(i, p.getZ(i) * taper); }
  }
  g.translate(0, -h / 2, 0);          // pivot at the top
  g.computeVertexNormals();
  return g;
}

export function createFigure(material) {
  const root = new THREE.Group();

  const add = (parent, geo, pos) => {
    const m = new THREE.Mesh(geo, material);
    if (pos) m.position.set(...pos);
    parent.add(m);
    return m;
  };
  const joint = (parent, pos) => {
    const g = new THREE.Group();
    g.position.set(...pos);
    parent.add(g);
    return g;
  };

  /* ---- torso ---- */
  const hips = joint(root, [0, 0, 0]);
  const spine = joint(hips, [0, 0, 0]);
  add(spine, limb(0.46, 0.72, 0.30, 1.18), [0, 0.72, 0]);   // chest, widening up

  /* the kimono body: a skirted block that flares, which is most of the
     silhouette below the waist */
  const skirt = limb(0.50, 0.74, 0.38, 1.52);   // hakama flares; it does not become a bell
  add(hips, skirt, [0, 0.04, 0]);

  /* ---- head ---- */
  const neck = joint(spine, [0, 0.74, 0]);
  add(neck, limb(0.19, 0.20, 0.19, 1.0), [0, 0.20, 0]);
  const head = add(neck, new THREE.BoxGeometry(0.27, 0.31, 0.28), [0, 0.36, 0]);
  head.scale.set(1, 1, 1);
  // chonmage: the topknot is the single fastest signal of the period
  add(neck, limb(0.10, 0.22, 0.10, 0.6), [0, 0.62, -0.06]).rotation.x = 0.5;

  /* ---- arms: shoulder → elbow → hand ---- */
  const arm = (side) => {
    const sh = joint(spine, [side * 0.30, 0.66, 0]);
    add(sh, limb(0.15, 0.40, 0.16, 0.85), [0, 0, 0]);
    // the sleeve is what reads as a kimono rather than a shirt
    add(sh, limb(0.30, 0.42, 0.26, 1.5), [side * 0.02, 0.02, 0]);
    const el = joint(sh, [0, -0.40, 0]);
    add(el, limb(0.12, 0.36, 0.12, 0.9), [0, 0, 0]);
    const hand = joint(el, [0, -0.36, 0]);
    add(hand, new THREE.BoxGeometry(0.11, 0.13, 0.10), [0, -0.06, 0]);
    return { sh, el, hand };
  };
  const armR = arm(1);
  const armL = arm(-1);

  /* ---- legs ---- */
  const leg = (side) => {
    const hip = joint(hips, [side * 0.15, 0, 0]);
    add(hip, limb(0.17, 0.44, 0.18, 0.9), [0, 0, 0]);
    const knee = joint(hip, [0, -0.44, 0]);
    add(knee, limb(0.14, 0.42, 0.15, 0.85), [0, 0, 0]);
    const foot = joint(knee, [0, -0.42, 0]);
    add(foot, new THREE.BoxGeometry(0.16, 0.07, 0.30), [0, -0.04, 0.06]);
    return { hip, knee, foot };
  };
  const legR = leg(1);
  const legL = leg(-1);

  /* ---- the sword ---- */
  // saya (scabbard) rides on the left hip, edge up, the way it is worn
  // Worn edge-up at the left hip: the limb hangs from its pivot, so the tilt
  // comes from the joint. An earlier rotation.x = PI flipped the whole scabbard
  // up over the shoulder, which is a different weapon entirely.
  const saya = joint(hips, [-0.26, 0.54, 0.04]);
  saya.rotation.set(-0.62, -0.22, 0.16);
  add(saya, limb(0.055, 1.06, 0.030, 0.85), [0, 0, 0]);

  // the blade lives in the right hand and starts hidden inside the saya
  const blade = new THREE.Group();
  {
    const b = limb(0.042, 1.02, 0.016, 0.55);
    const mesh = new THREE.Mesh(b, material);
    mesh.position.y = 1.02;
    blade.add(mesh);
    const tsuba = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.09), material);
    blade.add(tsuba);
    const tsuka = new THREE.Mesh(limb(0.06, 0.26, 0.055, 0.9), material);
    blade.add(tsuka);
  }
  /* The blade hangs off the SPINE, not the hand, and its angle is authored per
     keyframe. Parented to the hand it inherited three levels of rotation and
     ended up buried in the torso; the honest fix is not more trigonometry but
     putting the one line that has to read exactly right under direct control.
     The hand is posed to meet it. */
  spine.add(blade);

  return {
    root, hips, spine, neck, armR, armL, legR, legL, saya, blade,
  };
}

/* ============================================================
   The draw, as pose keyframes.

   Iai is one motion with a shape: settle, the hand finds the tsuka,
   the blade leaves the saya on a rising diagonal, the cut, and the
   long stillness after it. Scroll moves through these; it does not
   play them.
   ============================================================ */
const POSES = [
  { // 0 — standing, blade seated
    at: 0.00,
    spine: [0.04, 0.10, 0], neck: [0.02, -0.10, 0],
    shR: [0.10, 0, 0.16], elR: [-0.25, 0, 0],
    shL: [0.06, 0, -0.14], elL: [-0.20, 0, 0],
    hipR: [0.02, 0, 0.05], kneeR: [-0.06, 0, 0],
    hipL: [-0.02, 0, -0.05], kneeL: [-0.06, 0, 0],
    bladeOut: 0, rootY: 0, rootRot: 0,
    bladePos: [0.16, 0.30, 0.16], bladeRot: [2.5, 0.2, 0.5],
  },
  { // 1 — the settle: weight drops, hand crosses to the tsuka
    at: 0.26,
    spine: [0.10, 0.34, 0], neck: [0.06, -0.30, 0],
    shR: [0.55, 0.30, 0.70], elR: [-1.25, 0, 0],
    shL: [0.30, 0.20, -0.35], elL: [-0.70, 0, 0],
    hipR: [0.16, 0, 0.16], kneeR: [-0.34, 0, 0],
    hipL: [-0.20, 0, -0.14], kneeL: [-0.24, 0, 0],
    bladeOut: 0.04, rootY: -0.13, rootRot: 0.22,
    bladePos: [0.10, 0.26, 0.20], bladeRot: [2.3, 0.5, 0.6],
  },
  { // 2 — the draw: the blade leaves on a rising diagonal
    at: 0.58,
    spine: [-0.06, -0.30, 0], neck: [0.02, 0.24, 0],
    shR: [-2.05, -0.45, -0.55], elR: [-0.45, 0, 0],
    shL: [0.45, 0.10, 0.55], elL: [-1.05, 0, 0],
    hipR: [0.26, 0, 0.14], kneeR: [-0.30, 0, 0],
    hipL: [-0.34, 0, -0.12], kneeL: [-0.18, 0, 0],
    bladeOut: 1, rootY: -0.06, rootRot: -0.34,
    bladePos: [0.30, 0.60, 0.22], bladeRot: [-0.5, 1.05, -1.05],
  },
  { // 3 — the cut, fully extended across the body
    at: 0.76,
    spine: [0.06, -0.55, 0], neck: [0.04, 0.34, 0],
    shR: [-1.35, -0.25, -1.55], elR: [-0.12, 0, 0],
    shL: [0.30, 0.10, 0.85], elL: [-1.35, 0, 0],
    hipR: [0.34, 0, 0.10], kneeR: [-0.26, 0, 0],
    hipL: [-0.42, 0, -0.10], kneeL: [-0.14, 0, 0],
    bladeOut: 1, rootY: -0.10, rootRot: -0.52,
    bladePos: [0.34, 0.72, 0.18], bladeRot: [-0.15, 1.15, -1.62],
  },
  { // 4 — zanshin: the stillness that is part of the technique
    at: 1.00,
    spine: [0.02, -0.22, 0], neck: [0.10, 0.14, 0],
    shR: [-0.55, -0.20, -1.25], elR: [-0.30, 0, 0],
    shL: [0.14, 0.04, 0.24], elL: [-0.55, 0, 0],
    hipR: [0.10, 0, 0.08], kneeR: [-0.12, 0, 0],
    hipL: [-0.14, 0, -0.08], kneeL: [-0.10, 0, 0],
    bladeOut: 1, rootY: -0.03, rootRot: -0.26,
    bladePos: [0.28, 0.50, 0.24], bladeRot: [0.35, 0.90, -1.35],
  },
];

// The rig hangs from the hips, so the feet sit at about -0.90. Lifting the
// root by that much puts the figure ON the ground rather than through it.
const BASE_Y = 0.92;

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
// smootherstep: the draw should not have visible corners at the keyframes
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export function poseFigure(fig, p, time) {
  let i = 0;
  while (i < POSES.length - 2 && p > POSES[i + 1].at) i++;
  const a = POSES[i], b = POSES[i + 1];
  const raw = (p - a.at) / Math.max(b.at - a.at, 1e-4);
  const t = ease(Math.min(1, Math.max(0, raw)));

  const set = (node, key) => {
    const v = lerp3(a[key], b[key], t);
    node.rotation.set(v[0], v[1], v[2]);
  };

  set(fig.spine, "spine");
  set(fig.neck, "neck");
  set(fig.armR.sh, "shR");  set(fig.armR.el, "elR");
  set(fig.armL.sh, "shL");  set(fig.armL.el, "elL");
  set(fig.legR.hip, "hipR"); set(fig.legR.knee, "kneeR");
  set(fig.legL.hip, "hipL"); set(fig.legL.knee, "kneeL");

  fig.root.position.y = BASE_Y + lerp(a.rootY, b.rootY, t);
  fig.root.rotation.y = lerp(a.rootRot, b.rootRot, t);

  /* The blade is inside the saya until it is drawn: sliding it along its
     own axis is what sells the draw, and it is one number. */
  const out = lerp(a.bladeOut, b.bladeOut, t);
  fig.blade.visible = out > 0.02;
  fig.blade.scale.y = Math.max(0.02, out);
  const bp = lerp3(a.bladePos, b.bladePos, t);
  const br = lerp3(a.bladeRot, b.bladeRot, t);
  fig.blade.position.set(bp[0], bp[1], bp[2]);
  fig.blade.rotation.set(br[0], br[1], br[2]);
  fig.saya.visible = true;

  /* a breath, so a held pose is never completely dead */
  const breath = Math.sin(time * 1.1) * 0.012;
  fig.spine.rotation.x += breath;
  fig.neck.rotation.x -= breath * 0.6;
}
