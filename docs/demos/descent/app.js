/* ============================================================
   descent — 8,556 real events, plotted at their own depth.

   The scene is an enhancement. Every figure the page states lives
   in the DOM; if WebGL is missing, the canvas stays a dark plate
   and the page is still the whole argument.

   Projection: equirectangular. x = lon/2, z = -lat/2, y = -depth.
   1 world unit ≈ 222 km across, ≈ 14.9 km down → ×15 exaggeration,
   which the page states rather than hides.
   ============================================================ */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/+esm";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/ScrollTrigger.js/+esm";
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.3.25/+esm";

gsap.registerPlugin(ScrollTrigger);
document.documentElement.classList.add("js");

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MAX_DEPTH = 670;          // km — the floor of the year, 669.6 rounded up
const SLAB_Y = 45;              // world units for those 670 km
const BANDS = [35, 70, 300, 500, 670];

/* ---- reveals first: they must work even if the scene never boots ---- */
{
  const beats = document.querySelectorAll("[data-beat], .beat--table, .beat--colophon");
  if (REDUCED || !("IntersectionObserver" in window)) {
    beats.forEach((b) => b.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -18% 0px" });
    beats.forEach((b) => io.observe(b));
  }
}

/* ---- smooth scroll ---- */
let lenis = null;
if (!REDUCED) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const t = document.querySelector(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t);
    });
  });
}

/* ============================================================
   the instrument
   ============================================================ */
async function boot() {
  const canvas = document.getElementById("stage");
  if (!canvas) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: true,
      powerPreference: "high-performance", stencil: false,
    });
  } catch {
    return null;                       // no WebGL: the DOM already says everything
  }

  const res = await fetch("data/quakes-2025.bin");
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();

  /* ---- decode: "QUK1", count, then four packed columns ---- */
  const head = new Uint32Array(buf, 0, 2);
  if (head[0] !== 0x51554b31) return null;
  const n = head[1];
  let o = 8;
  const lon = new Int16Array(buf, o, n); o += n * 2;
  const lat = new Int16Array(buf, o, n); o += n * 2;
  const dep = new Uint16Array(buf, o, n); o += n * 2;
  const mag = new Uint8Array(buf, o, n);

  const LOW = navigator.hardwareConcurrency <= 4 || (navigator.deviceMemory ?? 8) <= 4;
  const dprCap = LOW ? 1 : (matchMedia("(pointer: coarse)").matches ? 1.5 : 2);
  renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.5, 2000);

  /* ---- points ---- */
  const pos = new Float32Array(n * 3);
  const aDepth = new Float32Array(n);
  const aMag = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const d = dep[i] / 10;                       // km
    pos[i * 3]     = (lon[i] / 100) / 2;
    pos[i * 3 + 1] = -(d / MAX_DEPTH) * SLAB_Y;
    pos[i * 3 + 2] = -(lat[i] / 100) / 2;
    aDepth[i] = Math.min(1, d / MAX_DEPTH);
    aMag[i] = (mag[i] / 20 + 4 - 4.5) / 4.3;     // 4.5..8.8 → 0..1
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(aDepth, 1));
  geometry.setAttribute("aMag", new THREE.BufferAttribute(aMag, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uReveal: { value: 0.06 },                  // how far down has been "reached"
      uPix:    { value: renderer.getPixelRatio() },
      uShallow:{ value: new THREE.Color("#ffb066") },
      uMid:    { value: new THREE.Color("#8fd66a") },
      uDeep:   { value: new THREE.Color("#4fc0f0") },
    },
    vertexShader: /* glsl */ `
      attribute float aDepth;
      attribute float aMag;
      uniform float uReveal;
      uniform float uPix;
      uniform vec3 uShallow, uMid, uDeep;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 c = aDepth < 0.5
          ? mix(uShallow, uMid, aDepth * 2.0)
          : mix(uMid, uDeep, (aDepth - 0.5) * 2.0);
        vColor = c;

        // Nothing is hidden — hiding data would be the same lie the flat map
        // tells. The band the descent is passing through simply burns brighter.
        float near = 1.0 - smoothstep(0.0, 0.10, abs(aDepth - uReveal));
        vAlpha = 0.30 + near * 0.70;

        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (2.2 + aMag * 9.0) * uPix * (150.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision mediump float;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d);
        if (r > 0.25) discard;
        float edge = smoothstep(0.25, 0.02, r);
        gl_FragColor = vec4(vColor, vAlpha * edge);
      }`,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  /* ---- the depth grid: instrument furniture, and it carries the scale ---- */
  const gridGeo = new THREE.BufferGeometry();
  const seg = [];
  for (const km of BANDS) {
    const y = -(km / MAX_DEPTH) * SLAB_Y;
    for (let x = -90; x <= 90; x += 10) { seg.push(x, y, -45, x, y, 45); }
    for (let z = -45; z <= 45; z += 10) { seg.push(-90, y, z, 90, y, z); }
  }
  gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
  const gridMat = new THREE.LineBasicMaterial({
    color: 0x2b3a52, transparent: true, opacity: 0.30, depthWrite: false,
  });
  const grid = new THREE.LineSegments(gridGeo, gridMat);
  scene.add(grid);

  /* ---- camera path: keyframes, lerped by scroll ---- */
  /* The opening has to read as the map everyone recognises, so the whole
     180×90 slab must fit whatever viewport it lands in. Computed, not
     hand-tuned to one window. */
  const fitTop = () => {
    const half = THREE.MathUtils.degToRad(camera.fov) / 2;
    const needY = 45 / Math.tan(half);
    const needX = 90 / (Math.tan(half) * camera.aspect);
    return Math.max(needX, needY) * 1.12;
  };

  const KEYS = [
    { p: 0.00, pos: [0, fitTop(), 0.6], tgt: [0, 0, 0] },  // top-down: the flat map
    { p: 0.22, pos: [0, 62, 96],    tgt: [0, -5, 0] },     // tilt in, crust edge-on
    { p: 0.46, pos: [-44, 16, 100], tgt: [0, -15, 0] },    // the ramps appear
    { p: 0.70, pos: [-18, -18, 92], tgt: [0, -30, 0] },    // the sparse deep
    { p: 0.87, pos: [46, -34, 66],  tgt: [40, -40, 6] },   // toward Fiji, the floor
    { p: 1.00, pos: [12, -30, 104], tgt: [0, -26, 0] },    // pull back, whole solid
  ];
  const cp = new THREE.Vector3(), ct = new THREE.Vector3();
  const lerpPath = (p) => {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = THREE.MathUtils.smoothstep(p, a.p, b.p);
    cp.set(
      THREE.MathUtils.lerp(a.pos[0], b.pos[0], t),
      THREE.MathUtils.lerp(a.pos[1], b.pos[1], t),
      THREE.MathUtils.lerp(a.pos[2], b.pos[2], t));
    ct.set(
      THREE.MathUtils.lerp(a.tgt[0], b.tgt[0], t),
      THREE.MathUtils.lerp(a.tgt[1], b.tgt[1], t),
      THREE.MathUtils.lerp(a.tgt[2], b.tgt[2], t));
  };

  /* ---- HUD ---- */
  const hud = document.querySelector(".hud");
  const hudDepth = document.querySelector("[data-hud-depth]");
  const hudHead = document.querySelector("[data-hud-head]");
  const state = { p: 0, shown: 0 };

  const paintHud = () => {
    const km = state.shown * MAX_DEPTH;
    if (hudDepth) hudDepth.textContent = km < 10 ? km.toFixed(1) : Math.round(km);
    if (hudHead) hudHead.style.transform = `translate(0, ${state.shown * 100}%)`;
    hud?.classList.toggle("is-deep", state.shown > 0.45);
  };

  /* ---- one shared ticker ---- */
  let running = true;
  const render = () => {
    if (!running) return;
    state.shown += (state.p - state.shown) * 0.09;
    material.uniforms.uReveal.value = Math.max(0.06, state.shown);
    lerpPath(state.shown);
    camera.position.copy(cp);
    camera.lookAt(ct);
    gridMat.opacity = 0.06 + state.shown * 0.26;
    paintHud();
    renderer.render(scene, camera);
  };

  const onVisibility = () => { running = !document.hidden; };
  document.addEventListener("visibilitychange", onVisibility);

  let rt;
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      renderer.setSize(innerWidth, innerHeight, false);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      KEYS[0].pos[1] = fitTop();     // the opening reframes with the window
      ScrollTrigger.refresh();
    }, 200);
  };
  addEventListener("resize", onResize);

  const onContextLost = (e) => { e.preventDefault(); running = false; };
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);

  /* ---- scroll drives depth ---- */
  const st = ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => { state.p = self.progress; },
  });

  if (REDUCED) {
    /* One composed frame at the depth where the story lives, then stop.
       Not a dead page: the DOM carries every number either way. */
    state.p = state.shown = 0.62;
    material.uniforms.uReveal.value = 1;
    lerpPath(0.62);
    camera.position.copy(cp); camera.lookAt(ct);
    gridMat.opacity = 0.3;
    paintHud();
    renderer.render(scene, camera);
  } else {
    gsap.ticker.add(render);
    render();
  }
  hud?.classList.add("is-live");

  function destroy() {
    running = false;
    clearTimeout(rt);
    gsap.ticker.remove(render);
    removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
    st.kill();
    geometry.dispose(); material.dispose();
    gridGeo.dispose(); gridMat.dispose();
    scene.clear();
    renderer.renderLists.dispose();
    renderer.forceContextLoss();
    renderer.dispose();
  }
  return { destroy, renderer, scene };
}

boot().then((inst) => {
  if (!inst) {
    /* No scene. Say so honestly in the one place that claims there is one. */
    document.querySelector(".hud")?.remove();
    const claim = document.querySelector(".beat--table .beat__body");
    if (claim) claim.innerHTML =
      "This browser did not start a WebGL context, so the scene above is not running &mdash; " +
      "every figure on this page is measured from the same catalog either way, packed to " +
      "<b>59,900 bytes</b> at seven bytes an event.";
    return;
  }
  window.__descent = inst;   // teardown handle, for the audit
}).catch(() => {
  document.querySelector(".hud")?.remove();
});
