/* ============================================================
   orbit — the solar system, drawn honestly.

   Every planet here is a sphere and a shader. No textures: the
   bands, the storm, the rust and the ice are arithmetic, which
   means the whole solar system downloads in nothing and a school
   laptop can run it.

   Sizes and distances both come from JPL. They cannot both be
   shown at once — that is the lesson, not a limitation — so the
   scene carries a scale factor the page states out loud.
   ============================================================ */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

const VERT = /* glsl */ `
  varying vec3 vPos;      // object space, for the surface pattern
  varying vec3 vWorld;    // world space, for the light
  varying vec3 vNormalW;
  void main() {
    vPos = position;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

/* One shader for every planet. A `uKind` switch is cheaper than eight
   programs and keeps the whole family looking like one drawing. */
const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uA, uB, uC;
  uniform float uKind, uTime, uLit;
  varying vec3 vPos;
  varying vec3 vWorld;
  varying vec3 vNormalW;

  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
  float noise(vec3 p){
    vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ return noise(p)*0.55 + noise(p*2.1)*0.27 + noise(p*4.3)*0.18; }

  void main() {
    vec3 n = normalize(vPos);
    vec3 col;

    if (uKind < 0.5) {
      // rocky: craters and patches
      float m = fbm(n * 5.0);
      col = mix(uA, uB, smoothstep(0.35, 0.72, m));
      col = mix(col, uC, smoothstep(0.72, 0.95, fbm(n * 12.0)) * 0.55);
    } else if (uKind < 1.5) {
      // banded: latitude stripes, warped so they are not ruled lines
      float lat = n.y + fbm(n * 2.6) * 0.16;
      float band = sin(lat * 17.0) * 0.5 + 0.5;
      col = mix(uA, uB, smoothstep(0.32, 0.68, band));
      col = mix(col, uC, smoothstep(0.80, 1.0, fbm(n * 3.4)) * 0.7);
    } else {
      // icy: smooth, faintly mottled
      float m = fbm(n * 3.0);
      col = mix(uA, uB, smoothstep(0.40, 0.75, m));
    }

    /* One sun, at the origin. The first version dotted a view-space normal
       against a world-space direction and every planet came out nearly black:
       the spaces have to match. */
    vec3 toSun = normalize(-vWorld);
    float lam = max(dot(normalize(vNormalW), toSun), 0.0);
    float sun = mix(0.22, 1.0, pow(lam, 0.65));
    gl_FragColor = vec4(col * mix(1.0, sun, uLit), 1.0);
  }`;

export function createOrbit({ canvas, data } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); }
  catch { return null; }

  const LOW = (navigator.hardwareConcurrency ?? 8) <= 4 ||
              matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x05060e, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 400);

  /* ---- stars: the only thing here that is decoration ---- */
  {
    const N = LOW ? 500 : 1600, p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 150 + Math.random() * 120, t = Math.random() * 6.283, u = Math.random() * 2 - 1;
      const s = Math.sqrt(1 - u * u);
      p[i * 3] = r * s * Math.cos(t); p[i * 3 + 1] = r * u; p[i * 3 + 2] = r * s * Math.sin(t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8dcf0, size: 0.55, sizeAttenuation: false })));
  }

  /* ---- the sun ---- */
  const sunGeo = new THREE.SphereGeometry(1, 40, 28);
  const sun = new THREE.Mesh(sunGeo, new THREE.MeshBasicMaterial({ color: 0xffcf6b }));
  scene.add(sun);
  {
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.55, 32, 20),
      new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: 0.16 }));
    sun.add(halo);
  }

  /* ---- the planets ----
     Sizes are exaggerated against distance, because the honest version is
     invisible. The exaggeration is a single number the page prints. */
  const SIZE_EXAG = 1400;
  const AU = 9.0;                     // world units per astronomical unit
  const EARTH_R = 6371.0084;

  const KIND = { Mercury:0, Venus:0, Earth:0, Mars:0, Jupiter:1, Saturn:1, Uranus:2, Neptune:2 };
  const PAL = {
    Mercury: [0x8d8a86, 0x5f5c59, 0xb0aca6],
    Venus:   [0xe6c98a, 0xc8a45e, 0xf2e2b8],
    Earth:   [0x2f6fb5, 0x3f8f52, 0xf2f6ff],
    Mars:    [0xb4552f, 0x8a3d22, 0xd9a077],
    Jupiter: [0xd8b58a, 0x9c6a47, 0xe4e0d4],
    Saturn:  [0xe0c893, 0xb99a63, 0xf1e6c8],
    Uranus:  [0x9fd8dd, 0x6fb6c4, 0xcdeef0],
    Neptune: [0x4a6fd0, 0x2f4aa0, 0x8fa8e8],
  };

  const bodyGeo = new THREE.SphereGeometry(1, LOW ? 24 : 40, LOW ? 16 : 28);
  const planets = [];
  const names = Object.keys(data).filter((k) => !k.startsWith("__"));

  for (const name of names) {
    const d = data[name];
    const rWorld = (d.radius_km / EARTH_R) * 0.16 * (SIZE_EXAG / 1400);
    const pal = PAL[name];
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uA: { value: new THREE.Color(pal[0]) },
        uB: { value: new THREE.Color(pal[1]) },
        uC: { value: new THREE.Color(pal[2]) },
        uKind: { value: KIND[name] },
        uTime: { value: 0 },
        uLit: { value: 1 },
      },
    });
    const mesh = new THREE.Mesh(bodyGeo, mat);
    mesh.scale.setScalar(rWorld);
    const pivot = new THREE.Group();          // holds the orbital angle
    const holder = new THREE.Group();         // holds the distance
    holder.position.x = d.au * AU;
    holder.add(mesh);
    pivot.add(holder);
    scene.add(pivot);

    // a faint ring on the orbital plane, so the geometry of the system reads
    {
      const seg = 128, pts = new Float32Array(seg * 3);
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pts[i * 3] = Math.cos(a) * d.au * AU; pts[i * 3 + 1] = 0; pts[i * 3 + 2] = Math.sin(a) * d.au * AU;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      scene.add(new THREE.LineLoop(g, new THREE.LineBasicMaterial({
        color: 0x2a3358, transparent: true, opacity: 0.55 })));
    }

    if (name === "Saturn") {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(rWorld * 1.5, rWorld * 2.4, 64),
        new THREE.MeshBasicMaterial({ color: 0xd9c396, side: THREE.DoubleSide,
                                      transparent: true, opacity: 0.7 }));
      ring.rotation.x = Math.PI / 2 - 0.42;
      mesh.add(ring);
    }

    planets.push({ name, d, mesh, pivot, holder, mat, rWorld, x: d.au * AU });
  }

  /* ---- state: scroll picks a planet and how close we are to it ---- */
  const state = { p: 0, target: 0, focus: 0, running: true };
  const clock = new THREE.Clock();
  let onFrame = null;

  const camPos = new THREE.Vector3();
  const camAim = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function update(dt) {
    state.p += (state.target - state.p) * Math.min(1, dt * 2.6);
    const t = clock.elapsedTime;

    // every planet keeps moving, at its own real relative rate
    for (const pl of planets) {
      pl.pivot.rotation.y = -t * 0.06 / pl.d.orbit_years + pl.d.au;
      pl.mesh.rotation.y += dt * (pl.d.rot_days < 0 ? -0.35 : 0.35) / Math.abs(pl.d.rot_days) * 8;
    }
    sun.rotation.y += dt * 0.05;

    /* p runs 0..1 across the whole page. 0 = the sun, 1 = Neptune.
       In between it eases from one planet to the next and sits on each. */
    const n = planets.length;
    const seg = state.p * n;                 // 0..n
    const idx = Math.min(n - 1, Math.floor(seg));
    state.focus = idx;
    const local = seg - idx;

    const from = idx === 0 ? new THREE.Vector3(0, 0, 0) : null;
    const target = planets[idx];
    target.holder.getWorldPosition(camAim);
    if (state.p < 0.02) camAim.set(0, 0, 0);

    // sit off to one side of whatever we are looking at, and pull back for
    // the big ones so they still fit the frame
    const r = state.p < 0.02 ? 1.0 : target.rWorld;
    const back = Math.max(0.9, r * 4.2);
    const ang = 0.6 + state.p * 2.2;
    camPos.set(
      camAim.x + Math.cos(ang) * back * 1.5,
      camAim.y + back * 0.55 + 0.15,
      camAim.z + Math.sin(ang) * back * 1.5 + back * 0.9
    );
    camera.position.lerp(camPos, Math.min(1, dt * 3.4));
    camera.lookAt(camAim);
  }

  function render() {
    if (!state.running) return;
    const dt = Math.min(clock.getDelta(), 1 / 30);
    update(dt);
    renderer.render(scene, camera);
    onFrame?.(dt, state.focus);
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
    renderer, scene, camera, state, planets,
    SIZE_EXAG, AU,
    start() { if (!raf) loop(); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    setProgress(v) { state.target = Math.min(1, Math.max(0, v)); },
    snap() { state.p = state.target; },
    render,
    onFrame(fn) { onFrame = fn; },
    counts() {
      const i = renderer.info;
      return { calls: i.render.calls, tris: i.render.triangles,
               points: i.render.points, lines: i.render.lines,
               textures: i.memory.textures, programs: i.programs?.length ?? 0 };
    },
    destroy() {
      state.running = false;
      cancelAnimationFrame(raf); clearTimeout(rt);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      bodyGeo.dispose(); sunGeo.dispose();
      for (const p of planets) p.mat.dispose();
      scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      scene.clear();
      renderer.renderLists.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
    },
  };
}
