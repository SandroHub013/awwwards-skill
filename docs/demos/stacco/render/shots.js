/* stacco — the shot list, as data.

   Nine entries. Each owns a lens, a move, a duration, a camera function and a
   staging function, and nothing outside its own entry. That is the difference
   between this demo and demo 09: soglia has ONE curve and cuts it into files,
   this has nine independent setups and each one gets its own file because it is
   its own shot. The file boundary and the artistic boundary are the same thing.

   The lens numbers are not decoration. `fovFor()` derives the vertical field of
   view from the focal length against a 36 mm-wide frame, so a shot labelled
   35 mm on screen was rendered through a 35 mm field. */

import { pathX, PAL } from "./scene.js";

export const FPS = 24;
export const SCOPE = 1920 / 804;          // 2.39:1 — the desktop frame

const rad = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
const easeIn = (x) => clamp(x) ** 2.2;
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
// deterministic handheld — the same numbers on every pass, on every machine
const shake = (t, s) => Math.sin(t * 7.3 + s) * 0.6 + Math.sin(t * 17.1 + s * 2.3) * 0.3
  + Math.sin(t * 31.7 + s * 5.1) * 0.1;

/* A focal length, honestly converted. On the portrait pass the vertical field
   of the scope frame is kept and widened by the shot's own `mZoom`, so the
   subject stays the size the shot composed it at — a re-frame, not a crop. */
export function fovFor(shot, aspect) {
  const vScope = 2 * Math.atan((18 / shot.lens) / SCOPE);
  const v = Math.abs(aspect - SCOPE) < 0.05 ? vScope : vScope * (shot.mZoom ?? 1.30);
  return Math.min(115, v / rad);
}

// where the girl stands on the path at story position z
const onPath = (z, off = 0) => [pathX(z) + off, 0, z];

export const SHOTS = [
  /* ── 01 ─────────────────────────────────────────────────────────────────── */
  {
    id: "01-partenza", n: "01", title: "la partenza", lens: 28, move: "LOCK + PUSH",
    secs: 5.0, mZoom: 1.34, mOff: [1.4, 0.3, 0],
    eyebrow: "prima luce",
    head: "She is given a basket and a road",
    body: "First light on the mother's cottage. The wood begins where the light stops, and the road only goes one way.",
    alt: "A cottage at first light with its door open, a small red-cloaked figure walking away down a dirt path toward dark trees.",
    cam(u) {
      const e = easeOut(u);
      return {
        pos: [mix(-13.4, -12.6, e), mix(3.05, 2.90, e), mix(-67.5, -65.9, e)],
        tgt: [mix(-6.4, -5.9, e), 1.80, mix(-53.4, -52.8, e)],
      };
    },
    stage(w, u, tSec, api) {
      const e = smooth(clamp((u - 0.08) / 0.92));
      // out of the door, then right, clearing the near corner of the cottage:
      // the wood she is walking into is the dark past its far side
      const z = mix(-60.5, -54.0, e);
      const x = mix(-9.6, -4.0, e);
      w.girl.root.position.set(x, 0, z);
      w.girl.root.rotation.y = Math.atan2(5.6, 6.5);   // heading, held: she does not wander
      api.girlWalk(u * 4.4, { swing: e > 0.02 ? 1 : 0.15, turn: (1 - e) * 0.55 });
      w.cottageA.hinge.rotation.y = 0.9 - e * 0.25;
      api.hide(w.wolf); api.hide(w.girlDoor);
    },
  },

  /* ── 02 ─────────────────────────────────────────────────────────────────── */
  {
    id: "02-margine", n: "02", title: "il margine", lens: 50, move: "STATIC LOW",
    secs: 4.5, mZoom: 1.22, mOff: [0, 0.25, 0],
    eyebrow: "il limite del bosco",
    head: "The wood does not have a door, it has an edge",
    body: "Fifty millimetres, held still, low to the ground. Everything in the frame stays exactly where it is, and she gets smaller anyway.",
    alt: "A long lens held low at the treeline: two dark trunks, and a small red figure walking into the gap between them.",
    cam(u) {
      return { pos: [0.9, 0.52 + u * 0.02, -34.4], tgt: [-0.75, 1.15, -20.5] };
    },
    stage(w, u, tSec, api) {
      const z = mix(-27.5, -16.5, smooth(u * 0.94 + 0.03));
      w.girl.root.position.set(...onPath(z, 0.15));
      w.girl.root.rotation.y = 0;            // the rig faces +z, and so does the road
      api.girlWalk(u * 4.0, { swing: 1, turn: u > 0.82 ? (u - 0.82) * 2.2 : 0 });
      api.hide(w.wolf); api.hide(w.girlDoor);
    },
  },

  /* ── 03 ─────────────────────────────────────────────────────────────────── */
  {
    id: "03-sentiero", n: "03", title: "il sentiero", lens: 35, move: "TRACK LEFT",
    secs: 5.0, mZoom: 1.28, mOff: [0, 0.2, 0],
    eyebrow: "dentro",
    head: "Walk beside her and the wood walks past",
    body: "The camera moves at exactly her pace, so she is the only still thing in the frame and the trunks do all the moving.",
    alt: "A tracking shot alongside the girl: she walks a path in the middle distance while dark trunks wipe across the foreground.",
    cam(u) {
      const z = mix(4.6, 14.8, u);           // linear: a dolly does not ease
      return {
        pos: [pathX(z) - 7.4, 1.34, z - 1.1],
        tgt: [pathX(z + 1.6), 0.86, z + 1.6],
      };
    },
    stage(w, u, tSec, api) {
      const z = mix(6.0, 16.2, u);
      w.girl.root.position.set(...onPath(z, 0.1));
      w.girl.root.rotation.y = 0;
      api.girlWalk(u * 5.2, { swing: 1, turn: 0.30 - u * 0.1 });
      api.hide(w.wolf); api.hide(w.girlDoor);
    },
  },

  /* ── 04 — the signature ──────────────────────────────────────────────────── */
  {
    id: "04-dall-alto", n: "04", title: "dall'alto", lens: 24, move: "CRANE DOWN",
    secs: 4.0, mZoom: 1.20, mOff: [0, 0, 0],
    eyebrow: "nessun orizzonte",
    head: "From up here she is four red pixels",
    body: "The only shot in the film with no horizon, and it arrives on a hard cut out of a side-track — the axis turns ninety degrees in a single frame.",
    alt: "Straight down over the canopy: black treetops, a thread of path between them, and one small red figure walking along it.",
    cam(u) {
      const e = easeIn(u) * 0.35 + smooth(u) * 0.65;
      const y = mix(48, 27, e);
      const a = 0.32 - u * 0.26;            // the canopy turns under the lens
      return {
        pos: [pathX(30) + 0.2, y, 30.2],
        tgt: [pathX(31.2), 0, 31.2],
        up: [Math.sin(a), 0, Math.cos(a)],
      };
    },
    stage(w, u, tSec, api) {
      const z = mix(26.2, 34.0, u);
      w.girl.root.position.set(...onPath(z, 0));
      w.girl.root.rotation.y = 0;
      api.girlWalk(u * 4.6, { swing: 1 });
      api.hide(w.wolf); api.hide(w.girlDoor);
    },
  },

  /* ── 05 — the insert ─────────────────────────────────────────────────────── */
  {
    id: "05-occhi", n: "05", title: "gli occhi", lens: 85, move: "STATIC LONG",
    secs: 3.5, mZoom: 1.10, mOff: [0, 0, 0],
    eyebrow: "un inserto",
    head: "Something in the undergrowth is already awake",
    body: "An insert: eighty-five millimetres, no camera move, no context. A continuous take cannot hold a shot like this — it has nowhere to put it.",
    alt: "Extreme close-up in near darkness: the outline of a wolf's muzzle, and two amber eyes opening.",
    // An 85 mm at a metre is a face, not a wolf: the camera is placed off his
    // actual head rather than off a coordinate, so the framing survives every
    // change made to the rig above it.
    cam(u, w, THREE) {
      const h = w.wolf.head.getWorldPosition(new THREE.Vector3());
      const ry = w.wolf.root.rotation.y;
      const fwd = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
      const side = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));
      const p = h.clone()
        .add(fwd.clone().multiplyScalar(2.55))
        .add(side.clone().multiplyScalar(-0.62));
      p.y = h.y + 0.16;
      return { pos: p.toArray(), tgt: [h.x, h.y + 0.05, h.z] };
    },
    stage(w, u, tSec, api) {
      const wx = pathX(46) - 7.0, wz = 46.4;
      w.wolf.root.visible = true;
      w.wolf.root.position.set(wx, 0, wz);
      w.wolf.root.rotation.y = 2.28;
      // the eyes open, then track something crossing off to the right
      const open = smooth(clamp((u - 0.24) / 0.34));
      api.wolfWalk(0.12, {
        swing: 0.05, run: 0, neck: -0.30, head: 0.16,
        turn: -0.20 + smooth(clamp((u - 0.62) / 0.38)) * 0.46, eyes: open,
      });
      w.lights.eyeGlow.intensity = open * 0.34;
      api.hide(w.girl); api.hide(w.girlDoor);
    },
    // runs after the world matrices are flushed, so the glow sits on the eye
    // wherever the pose actually put it
    after(w, THREE) { w.wolf.eyeR.getWorldPosition(w.lights.eyeGlow.position); },
  },

  /* ── 06 ─────────────────────────────────────────────────────────────────── */
  {
    id: "06-incontro", n: "06", title: "l'incontro", lens: 21, move: "SLOW ARC",
    secs: 5.0, mZoom: 1.34, mOff: [0.1, 0.1, 0],
    eyebrow: "ventun millimetri",
    head: "A wide lens makes whoever is nearest a monster",
    body: "Nobody is exaggerated here. He is put close to a twenty-one and she is put far from it, and the lens says the rest.",
    alt: "Low wide angle: the wolf's shoulder and head fill the left of the frame while the small red figure stands far back on the path.",
    /* Over his shoulder. The camera sits a metre behind his ruff and a little to
       its side, so he occupies the near third at arm's length and she stands
       five metres past him — one lens, two subjects, and the whole difference
       in size is distance rather than scale. */
    cam(u, w, THREE) {
      const ry = w.wolf.root.rotation.y;
      const fwd = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
      const side = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));
      const a = smooth(u);
      const p = w.wolf.root.position.clone()
        .add(side.clone().multiplyScalar(1.42 - a * 0.20))
        .add(fwd.clone().multiplyScalar(-0.74 + a * 0.30));
      p.y = 0.72 + a * 0.05;
      const h = w.wolf.head.getWorldPosition(new THREE.Vector3());
      const g = w.girl.neck.getWorldPosition(new THREE.Vector3());
      const tgt = h.clone().lerp(g, 0.42);
      return { pos: p.toArray(), tgt: [tgt.x, tgt.y - 0.02, tgt.z] };
    },
    stage(w, u, tSec, api) {
      // she comes UP the path to him, so the camera looks back down the wood she
      // has just walked — and the grandmother's clearing stays unspoiled behind us
      const gz = mix(49.9, 51.4, smooth(u));
      const gx = pathX(gz) - 0.2;
      const wx = pathX(54) - 1.4, wz = 54;
      w.wolf.root.visible = true;
      w.wolf.root.position.set(wx, 0, wz);
      w.wolf.root.rotation.y = Math.atan2(gx - wx, gz - wz);   // he faces her
      api.wolfWalk(0.25 + u * 0.20, {
        swing: 0.10, run: 0, neck: -0.16 - smooth(u) * 0.10, head: 0.08,
        turn: 0.04, eyes: 1,
      });
      w.lights.eyeGlow.intensity = 0.30;   // a glint, not a campfire

      w.girl.root.visible = true;
      w.girl.root.position.set(gx, 0, gz);
      w.girl.root.rotation.y = Math.atan2(wx - gx, wz - gz);   // she faces him back
      api.girlWalk(u * 1.1, { swing: clamp(1.1 - u * 3, 0, 1), turn: 0.10, look: 0.10 });
      api.hide(w.girlDoor);
    },
    after(w, THREE) { w.wolf.eyeR.getWorldPosition(w.lights.eyeGlow.position); },
  },

  /* ── 07 ─────────────────────────────────────────────────────────────────── */
  {
    id: "07-scorciatoia", n: "07", title: "la scorciatoia", lens: 18, move: "RACE LOW",
    secs: 4.0, mZoom: 1.36, mOff: [0, 0.15, 0],
    eyebrow: "diciotto millimetri",
    head: "He knows a shorter way and takes it at speed",
    body: "Knee height, eighteen millimetres, and the whole frame is foreground. The fastest shot in the film is also the one with the least in it.",
    alt: "A low racing camera through undergrowth, ferns and branches whipping past, the wolf running ahead in the gloom.",
    cam(u) {
      const z = mix(52, 84, easeOut(u * 0.92 + 0.08));
      const s = shake(u * 4, 1.7);
      return {
        pos: [pathX(z) + 8.0 + s * 0.10, 0.60 + shake(u * 4, 4.1) * 0.05, z],
        tgt: [pathX(z + 7) + 6.4 + s * 0.22, 0.95, z + 7],
        roll: s * 0.022,
      };
    },
    stage(w, u, tSec, api) {
      const z = mix(56.5, 89, easeOut(u * 0.92 + 0.08));
      w.wolf.root.visible = true;
      w.wolf.root.position.set(pathX(z) + 6.6, 0, z);
      w.wolf.root.rotation.y = -0.14;   // he runs +z, so he faces +z
      api.wolfWalk(u * 9.5, { swing: 1, run: 1, neck: 0.42, head: -0.24, eyes: 0.6 });
      w.lights.eyeGlow.intensity = 0;
      api.hide(w.girl); api.hide(w.girlDoor);
    },
  },

  /* ── 08 ─────────────────────────────────────────────────────────────────── */
  {
    id: "08-radura", n: "08", title: "la radura", lens: 40, move: "CRANE DOWN",
    secs: 4.5, mZoom: 1.24, mOff: [0, 0.2, 0],
    eyebrow: "ultima luce",
    head: "One lit window, and the door already open",
    body: "The crane comes down out of the branches to eye level. Nothing in the clearing moves. The door is the only thing in the frame doing any talking.",
    alt: "Dusk in a clearing: the grandmother's cottage with one warmly lit window and a door standing ajar.",
    cam(u) {
      const e = smooth(u);
      return {
        pos: [pathX(70) + 1.1, mix(12.6, 4.4, e), mix(69.0, 71.6, e)],
        tgt: [2.7, mix(2.2, 1.75, e), 88.6],
      };
    },
    stage(w, u, tSec, api) {
      w.cottageB.hinge.rotation.y = 0.55 + smooth(clamp((u - 0.55) / 0.45)) * 0.22;
      api.hide(w.girl); api.hide(w.wolf); api.hide(w.girlDoor);
    },
  },

  /* ── 09 ─────────────────────────────────────────────────────────────────── */
  {
    id: "09-che-occhi", n: "09", title: "che occhi grandi", lens: 58, move: "PUSH IN",
    secs: 5.5, mZoom: 1.26, mOff: [0, 0.1, 0],
    eyebrow: "l'ultimo stacco",
    head: "The ears are wrong and everybody knows it",
    body: "One lamp, one push, one shape under the blanket. The film ends on the line the whole tale was built to arrive at, and does not say it.",
    alt: "A lamplit bedroom: a shape under the blanket, a bonnet on the pillow, and two ears that are much too long.",
    cam(u) {
      const e = smooth(u);
      return {
        pos: [400.10, mix(1.58, 1.30, e), mix(3.35, 1.05, e)],
        tgt: [400.10, mix(1.04, 0.99, e), -2.96],
      };
    },
    stage(w, u, tSec, api) {
      w.wolfBed.root.visible = true;
      // head on the pillow means the head JOINT lands on the pillow: the rig's
      // head sits 0.55 m in front of its root, so the root goes behind the
      // headboard and the hidden trunk goes with it
      w.wolfBed.root.position.set(400.10, 0.34, -3.46);
      w.wolfBed.root.rotation.y = 0;
      const open = smooth(clamp((u - 0.72) / 0.24));
      api.wolfBedPose(0.08, {
        swing: 0, run: 0, neck: 0.30, head: -0.42 + open * 0.14,
        turn: -0.06 - open * 0.12, eyes: open,
      });
      w.lights.eyeGlow.position.set(400.10, 1.05, -2.94);
      w.lights.eyeGlow.intensity = open * 1.1;

      // the door opens behind the camera: her light, and then her shadow
      const door = smooth(clamp((u - 0.52) / 0.34));
      w.lights.doorL.intensity = door * 26;
      w.girlDoor.root.visible = door > 0.02;
      w.girlDoor.root.position.set(400.0, 0, mix(4.6, 3.75, door));
      w.girlDoor.root.rotation.y = Math.PI;
      api.girlDoorPose(door * 1.4, { swing: door < 0.85 ? 1 : 0.1, lean: 0.03 });
      api.hide(w.girl); api.hide(w.wolf);
    },
  },
];

/* ── the grade ────────────────────────────────────────────────────────────────
   Nine setups is nine lighting states, and the film runs one day into one night:
   first light, canopy, overcast top light, undergrowth, dusk, lamp. Every entry
   here is a whole state, never a delta, so a shot cannot inherit a bug from the
   shot before it — the same reason each one is its own file. */
const G = (o) => ({
  sunDir: [0.45, 0.55, -0.70], sunI: 1.4, sunC: 0xcfe0e2,
  hemiI: 0.85, hemiSky: 0x8fa8ad, hemiGround: 0x2a3324,
  fog: 0x7d9294, fogD: 0.016,
  skyTop: 0x3d5a68, skyHor: 0x9db0ad, glow: 0.45,
  exposure: 1.12, shafts: false, ...o,
});

export const GRADES = [
  G({ sunDir: [0.62, 0.30, -0.72], sunI: 2.3, sunC: 0xe4e0d4, hemiI: 1.0,
    fog: 0x93a6a4, fogD: 0.0115, skyTop: 0x51707d, skyHor: 0xc2c9bd, glow: 0.75, exposure: 1.18 }),
  G({ sunDir: [0.5, 0.42, -0.75], sunI: 1.7, hemiI: 0.9, fog: 0x87999a, fogD: 0.0165, exposure: 1.14 }),
  G({ sunDir: [0.35, 0.72, -0.6], sunI: 1.45, hemiI: 0.8, fog: 0x6f8586, fogD: 0.0215,
    skyTop: 0x33505d, skyHor: 0x8ba09d, exposure: 1.10, shafts: true }),
  G({ sunDir: [0.22, 0.94, -0.26], sunI: 2.05, sunC: 0xdfeceb, hemiI: 0.50,
    fog: 0x27353a, fogD: 0.0165, skyTop: 0x2b3f47, skyHor: 0x6b7d7c, exposure: 1.05 }),
  G({ sunDir: [0.3, 0.8, -0.5], sunI: 0.70, hemiI: 0.52, hemiSky: 0x7a929a,
    fog: 0x22302f, fogD: 0.033, exposure: 1.02, shafts: true }),
  G({ sunDir: [0.28, 0.78, -0.56], sunI: 0.8, hemiI: 0.44, fog: 0x334243, fogD: 0.047,
    skyTop: 0x2a3f49, skyHor: 0x6d807e, exposure: 1.05 }),
  G({ sunDir: [0.3, 0.75, -0.58], sunI: 0.85, hemiI: 0.44, fog: 0x2e3c3d, fogD: 0.038, exposure: 1.02 }),
  G({ sunDir: [-0.55, 0.22, 0.80], sunI: 0.75, sunC: 0xb9c2cc, hemiI: 0.34,
    hemiSky: 0x53707e, fog: 0x3a4a52, fogD: 0.0195,
    skyTop: 0x1d2c39, skyHor: 0x63767a, glow: 0.30, exposure: 1.08 }),
  G({ sunI: 0.0, hemiI: 0.10, hemiSky: 0x3a4a52, fog: 0x14181a, fogD: 0.030,
    skyTop: 0x10161c, skyHor: 0x1d262b, glow: 0.0, exposure: 1.16 }),
];

/* ── timing ──────────────────────────────────────────────────────────────────
   Frame counts are derived, never typed twice: the encoder, the ledger, the
   page's segment table and the timecode on screen all read this one function. */
export function timeline() {
  let acc = 0;
  const rows = SHOTS.map((s, i) => {
    const frames = Math.round(s.secs * FPS);
    const row = { ...s, index: i, frames, startSec: acc, grade: GRADES[i] };
    acc += frames / FPS;
    return row;
  });
  return { rows, totalSecs: acc, totalFrames: rows.reduce((a, r) => a + r.frames, 0) };
}

export { clamp, smooth, mix, mix3, PAL };
