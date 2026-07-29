/* ============================================================
   sakura — the ground the draw happens on.

   Flat colour, no lights, no textures: this is a print, not a
   render. Depth comes from overlap and from air, the way it does
   in a woodblock — near things are ink, far things fade toward the
   paper. That is also why it costs almost nothing to draw.
   ============================================================ */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";
import { createFigure, poseFigure } from "./figure.js";

const PAPER = 0xf2e7e1;
const INK   = 0x17111a;
const FAR   = 0xcfbcbe;
const MID   = 0x9c8288;
const PETAL = 0xe8a6b8;

/* One tree: a recursive trunk, then blossom as a cloud of points.
   Branch segments are lines because a line is one draw and reads as
   brushwork at this scale. */
function tree(depth, spread, len, rng) {
  const pts = [];
  const grow = (from, dir, l, d) => {
    const to = from.clone().addScaledVector(dir, l);
    pts.push(from.x, from.y, from.z, to.x, to.y, to.z);
    if (d <= 0) return [to];
    const tips = [];
    const n = d > depth - 2 ? 2 : (rng() > 0.45 ? 3 : 2);
    for (let i = 0; i < n; i++) {
      const nd = dir.clone();
      nd.x += (rng() - 0.5) * spread;
      nd.z += (rng() - 0.5) * spread;
      nd.y += rng() * 0.25 - 0.05;
      nd.normalize();
      tips.push(...grow(to, nd, l * (0.66 + rng() * 0.12), d - 1));
    }
    return tips;
  };
  const tips = grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), len, depth);
  return { pts, tips };
}

// deterministic rng, so the grove is the same for everyone who visits
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createScene({ canvas } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch { return null; }

  const LOW = (navigator.hardwareConcurrency ?? 8) <= 4 ||
              matchMedia("(pointer: coarse)").matches;

  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(PAPER, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PAPER, 14, 46);      // air, and it hides the far grove
  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 120);

  const inkMat  = new THREE.MeshBasicMaterial({ color: INK, fog: true });
  const midMat  = new THREE.LineBasicMaterial({ color: MID, fog: true });
  const farMat  = new THREE.LineBasicMaterial({ color: FAR, fog: true });

  /* ---- the grove ---- */
  const rng = mulberry(20260729);
  const blossomPts = [];
  const groves = [];

  const plantRow = (count, zBase, scale, mat, sway) => {
    const all = [];
    for (let i = 0; i < count; i++) {
      const t = tree(LOW ? 4 : 5, 0.95, 1.5 * scale, rng);
      const ox = (rng() - 0.5) * 26;
      const oz = zBase - rng() * 8;
      for (let k = 0; k < t.pts.length; k += 3) {
        all.push(t.pts[k] * scale + ox, t.pts[k + 1] * scale, t.pts[k + 2] * scale + oz);
      }
      for (const tip of t.tips) {
        // blossom clusters sit at the branch tips, which is where they grow
        for (let b = 0; b < (LOW ? 5 : 11); b++) {
          blossomPts.push(
            tip.x * scale + ox + (rng() - 0.5) * 0.85,
            tip.y * scale + (rng() - 0.5) * 0.85,
            tip.z * scale + oz + (rng() - 0.5) * 0.85,
            sway
          );
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(all, 3));
    const lines = new THREE.LineSegments(g, mat);
    lines.frustumCulled = false;
    scene.add(lines);
    groves.push({ g, mat });
  };

  plantRow(LOW ? 4 : 8, -11, 1.5, midMat, 1);
  plantRow(LOW ? 4 : 9, -22, 2.1, farMat, 0.6);
  plantRow(LOW ? 2 : 4, -34, 2.8, farMat, 0.35);

  /* ---- blossom on the branches ---- */
  const bGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(blossomPts.length / 4 * 3);
    const s = new Float32Array(blossomPts.length / 4);
    for (let i = 0, j = 0; i < blossomPts.length; i += 4, j++) {
      p[j * 3] = blossomPts[i]; p[j * 3 + 1] = blossomPts[i + 1]; p[j * 3 + 2] = blossomPts[i + 2];
      s[j] = blossomPts[i + 3];
    }
    bGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    bGeo.setAttribute("aSway", new THREE.BufferAttribute(s, 1));
  }
  const U = {
    uTime: { value: 0 },
    uPix: { value: renderer.getPixelRatio() },
    uPetal: { value: new THREE.Color(PETAL) },
    uPaper: { value: new THREE.Color(PAPER) },
    uFogNear: { value: 14 }, uFogFar: { value: 46 },
  };
  const blossomMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aSway;
      uniform float uTime, uPix;
      varying float vFog;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.6 + p.y * 1.7) * 0.09 * aSway;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFog = -mv.z;
        gl_PointSize = (6.0 + aSway * 7.0) * uPix * (12.0 / max(-mv.z, 1.0));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform vec3 uPetal, uPaper;
      uniform float uFogNear, uFogFar;
      varying float vFog;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        if (dot(d, d) > 0.25) discard;
        float f = smoothstep(uFogNear, uFogFar, vFog);
        gl_FragColor = vec4(mix(uPetal, uPaper, f), 1.0 - f * 0.85);
      }`,
  });
  const blossom = new THREE.Points(bGeo, blossomMat);
  blossom.frustumCulled = false;
  scene.add(blossom);

  /* ---- falling petals: the thing that makes it move ---- */
  const FALL = LOW ? 260 : 900;
  const fGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(FALL * 3), s = new Float32Array(FALL);
    for (let i = 0; i < FALL; i++) {
      p[i * 3] = (Math.random() - 0.5) * 26;
      p[i * 3 + 1] = Math.random() * 14;
      p[i * 3 + 2] = -Math.random() * 22 + 4;
      s[i] = Math.random();
    }
    fGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    fGeo.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
  }
  const fallMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uPix;
      varying float vFog;
      varying float vSeed;
      void main() {
        vec3 p = position;
        float t = uTime * (0.30 + aSeed * 0.34);
        // fall, and drift sideways the way a petal does rather than a raindrop
        p.y = mod(p.y - t, 14.0);
        p.x += sin(t * 1.5 + aSeed * 40.0) * 1.15;
        p.z += cos(t * 0.9 + aSeed * 22.0) * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFog = -mv.z; vSeed = aSeed;
        gl_PointSize = (3.0 + aSeed * 4.5) * uPix * (12.0 / max(-mv.z, 1.0));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform vec3 uPetal, uPaper;
      uniform float uFogNear, uFogFar;
      varying float vFog; varying float vSeed;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        if (dot(d, d) > 0.25) discard;
        float f = smoothstep(uFogNear, uFogFar, vFog);
        gl_FragColor = vec4(mix(uPetal, uPaper, f * 0.7), (0.55 + vSeed * 0.45) * (1.0 - f));
      }`,
  });
  const falling = new THREE.Points(fGeo, fallMat);
  falling.frustumCulled = false;
  scene.add(falling);

  /* ---- ground: a plane in paper, so the fog can eat its far edge.
     An earlier single horizon line rendered as a diagonal wire, because a
     line has no horizon — a surface does. ---- */
  {
    const g = new THREE.PlaneGeometry(90, 70);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ color: 0xe7d8d4, fog: true });
    const ground = new THREE.Mesh(g, m);
    ground.position.set(0, -0.01, -18);
    scene.add(ground);
  }

  /* ---- the figure ---- */
  const fig = createFigure(inkMat);
  scene.add(fig.root);

  const state = { p: 0, target: 0, running: true };
  const clock = new THREE.Clock();
  let onFrame = null;

  function update(dt) {
    state.p += (state.target - state.p) * Math.min(1, dt * 3.0);
    U.uTime.value += dt;
    poseFigure(fig, state.p, U.uTime.value);

    /* The camera closes in over the draw: wide and cool at the start,
       nearer and lower at the cut, then it lets the stillness breathe. */
    const p = state.p;
    const dist = 7.4 - p * 2.5;
    const ang = -0.62 + p * 0.50;
    camera.position.set(Math.sin(ang) * dist, 1.55 - p * 0.22, Math.cos(ang) * dist);
    camera.lookAt(0, 1.02 + p * 0.10, 0);
  }

  function render() {
    if (!state.running) return;
    const dt = Math.min(clock.getDelta(), 1 / 30);
    update(dt);
    renderer.render(scene, camera);
    onFrame?.(dt);
  }

  let raf = 0;
  const loop = () => { raf = requestAnimationFrame(loop); render(); };

  const onVis = () => { state.running = !document.hidden; };
  document.addEventListener("visibilitychange", onVis);
  let rt;
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      renderer.setSize(innerWidth, innerHeight, false);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    }, 180);
  };
  addEventListener("resize", onResize);
  const onLost = (e) => { e.preventDefault(); state.running = false; };
  renderer.domElement.addEventListener("webglcontextlost", onLost);

  renderer.compile(scene, camera);
  update(0.016);
  renderer.render(scene, camera);

  return {
    renderer, scene, camera, state, fig,
    start() { if (!raf) loop(); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    setProgress(v) { state.target = Math.min(1, Math.max(0, v)); },
    snap() { state.p = state.target; },
    render,
    onFrame(fn) { onFrame = fn; },
    counts() {
      const i = renderer.info;
      return { calls: i.render.calls, tris: i.render.triangles, points: i.render.points,
               lines: i.render.lines, textures: i.memory.textures, geometries: i.memory.geometries };
    },
    destroy() {
      state.running = false;
      cancelAnimationFrame(raf); clearTimeout(rt);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      bGeo.dispose(); fGeo.dispose();
      blossomMat.dispose(); fallMat.dispose();
      inkMat.dispose(); midMat.dispose(); farMat.dispose();
      for (const g of groves) g.g.dispose();
      scene.traverse((o) => { if (o.isMesh || o.isLineSegments) o.geometry?.dispose(); });
      scene.clear();
      renderer.renderLists.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
    },
  };
}
