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
  uniform vec3 uA, uB, uC, uRim;
  uniform float uKind, uTime, uLit, uCap, uSpot, uSpotX, uBump, uBumpF;
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
      // rocky: continents or craters, plus ice where it is cold
      float m = fbm(n * 4.2);
      col = mix(uA, uB, smoothstep(0.36, 0.70, m));
      col = mix(col, uC, smoothstep(0.70, 0.94, fbm(n * 11.0)) * 0.5);
      // polar caps — every rocky planet here has them, and children look for them
      float cap = smoothstep(0.74, 0.93, abs(n.y) - fbm(n * 5.0) * 0.10);
      col = mix(col, vec3(0.93, 0.95, 0.99), cap * uCap);
    } else if (uKind < 1.5) {
      // banded: latitude stripes, warped so they never read as ruled lines
      float lat = n.y + fbm(n * 2.4) * 0.18;
      float band = sin(lat * 15.0) * 0.5 + 0.5;
      band = mix(band, sin(lat * 31.0) * 0.5 + 0.5, 0.35);   // finer belts inside
      col = mix(uA, uB, smoothstep(0.30, 0.70, band));
      col = mix(col, uC, smoothstep(0.78, 1.0, fbm(n * 3.2)) * 0.6);

      /* The Great Red Spot. The copy on the page tells children about it, so
         the planet has to actually have one — a render that contradicts its
         own caption is worse than a plainer render. */
      vec2 sp = vec2(atan(n.z, n.x), asin(clamp(n.y, -1.0, 1.0)));
      vec2 d = vec2((sp.x - uSpotX) * 0.55, sp.y + 0.32);
      float spot = 1.0 - smoothstep(0.0, 0.30, length(d));
      col = mix(col, vec3(0.72, 0.30, 0.20), spot * uSpot);
    } else {
      // icy: smooth, faintly mottled, with a brighter pole
      float m = fbm(n * 2.6);
      col = mix(uA, uB, smoothstep(0.40, 0.78, m));
      col = mix(col, uC, smoothstep(0.80, 1.0, abs(n.y)) * 0.35);
    }

    /* One sun, at the origin. The first version dotted a view-space normal
       against a world-space direction and every planet came out nearly black:
       the spaces have to match. */
    vec3 N = normalize(vNormalW);

    /* Bend the normal along the gradient of the same field that coloured the
       surface, so the light agrees with what you can see. This one block is
       the difference between a painted ball and a world. */
    float e = 0.035;
    float h0 = fbm(n * uBumpF);
    vec3 grad = vec3(
      fbm(n * uBumpF + vec3(e, 0.0, 0.0)) - h0,
      fbm(n * uBumpF + vec3(0.0, e, 0.0)) - h0,
      fbm(n * uBumpF + vec3(0.0, 0.0, e)) - h0) / e;
    N = normalize(N - (grad - N * dot(grad, N)) * uBump);

    vec3 toSun = normalize(-vWorld);
    float lam = max(dot(N, toSun), 0.0);
    // a soft terminator rather than a hard one: real ones are not knife edges
    float sun = mix(0.18, 1.0, smoothstep(-0.12, 0.55, dot(N, toSun)) * 0.65 + pow(lam, 0.8) * 0.35);
    col *= mix(1.0, sun, uLit);

    /* Rim light along the lit limb. On a plain sphere this one term is most of
       what separates "a ball" from "a world with air around it". */
    vec3 V = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * max(dot(N, toSun) + 0.35, 0.0);
    col += uRim * rim * 0.9;

    gl_FragColor = vec4(col, 1.0);
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
  let sunCorona = null;
  const sun = new THREE.Mesh(sunGeo, new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
  scene.add(sun);
  {
    /* An opaque-ish sphere at 16% read as a muddy brown ring. A corona has to
       fade to nothing at its edge, so it is a shader, and it faces the camera
       so it never shows as a sphere silhouette. */
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `precision mediump float; varying vec2 vUv; uniform float uTime;
        void main(){
          float d = length(vUv - 0.5) * 2.0;
          float core = pow(max(0.0, 1.0 - d * 3.2), 2.0);
          float glow = pow(max(0.0, 1.0 - d), 3.4) * 0.55;
          float flick = 0.94 + 0.06 * sin(uTime * 1.7);
          vec3 c = mix(vec3(1.0, 0.62, 0.18), vec3(1.0, 0.90, 0.62), core);
          gl_FragColor = vec4(c * (core + glow) * flick, (core + glow) * 0.95);
        }`,
    }));
    corona.renderOrder = -1;
    scene.add(corona);
    sunCorona = corona;
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

  /* Ice caps only where there are ice caps, and rim colour only where there is
     an atmosphere to scatter it: Mercury has neither. */
  const CAP = { Mercury: 0, Venus: 0, Earth: 0.9, Mars: 1.0, Jupiter: 0, Saturn: 0, Uranus: 0, Neptune: 0 };
  const RIM = { Mercury: 0x000000, Venus: 0x6a5426, Earth: 0x2f6ea8, Mars: 0x5a3520,
                Jupiter: 0x4a3a28, Saturn: 0x4a4130, Uranus: 0x2c5f68, Neptune: 0x24386f };

  const bodyGeo = new THREE.SphereGeometry(1, LOW ? 32 : 56, LOW ? 20 : 36);
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
        uCap: { value: CAP[name] ?? 0 },
        uSpot: { value: name === "Jupiter" ? 1 : 0 },
        uSpotX: { value: 1.1 },
        uRim: { value: new THREE.Color(RIM[name] ?? 0x000000) },
        // rocky worlds are rough; gas and ice giants are smooth banded fluid
        uBump:  { value: KIND[name] === 0 ? 0.55 : (KIND[name] === 1 ? 0.16 : 0.10) },
        uBumpF: { value: KIND[name] === 0 ? 7.0  : (KIND[name] === 1 ? 3.0  : 2.4) },
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
        new THREE.RingGeometry(rWorld * 1.35, rWorld * 2.5, 96, 1),
        new THREE.ShaderMaterial({
          side: THREE.DoubleSide, transparent: true, depthWrite: false,
          uniforms: { uIn: { value: rWorld * 1.35 }, uOut: { value: rWorld * 2.5 } },
          vertexShader: `varying vec3 vP; void main(){ vP=position;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
          fragmentShader: `precision mediump float; varying vec3 vP;
            uniform float uIn, uOut;
            void main(){
              float t = (length(vP.xy) - uIn) / (uOut - uIn);      // 0 inner .. 1 outer
              // banding, and the Cassini division: the rings are not one disc
              float band = 0.55 + 0.45 * sin(t * 46.0);
              float cassini = smoothstep(0.60, 0.66, t) * (1.0 - smoothstep(0.70, 0.76, t));
              float a = (0.30 + band * 0.55) * (1.0 - cassini * 0.92);
              a *= smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.93, 1.0, t));
              gl_FragColor = vec4(vec3(0.90, 0.83, 0.66) * (0.7 + band * 0.3), a);
            }`,
        }));
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
  const aimA = new THREE.Vector3();
  const aimB = new THREE.Vector3();
  const smoothstep = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
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
    if (sunCorona) {
      sunCorona.material.uniforms.uTime.value += dt;
      sunCorona.quaternion.copy(camera.quaternion);   // always face the viewer
    }

    /* p runs 0..1 across the whole page. 0 = the sun, 1 = Neptune.
       In between it eases from one planet to the next and sits on each. */
    const n = planets.length;
    const seg = state.p * n;                 // 0..n
    const idx = Math.min(n - 1, Math.floor(seg));
    state.focus = idx;
    const local = seg - idx;

    /* The camera travels BETWEEN planets instead of teleporting to the next
       one. The first version picked planets[floor(seg)] and let a position
       lerp hide the jump, which is why each arrival felt like a cut: the
       *target* was discontinuous, and no amount of smoothing fixes a target
       that moves instantly. `local` was even computed and then never used.
       Now the aim point is itself interpolated, so the journey between two
       worlds is something you watch rather than something you skip. */
    const a = planets[idx];
    const b = planets[Math.min(n - 1, idx + 1)];
    a.holder.getWorldPosition(aimA);
    b.holder.getWorldPosition(aimB);

    // ease so the camera lingers on a planet and hurries across the gap
    /* Sit on a planet for three quarters of its panel, then cross. At 0.55 the
       camera had already left by the time the panel was centred, so arriving at
       #jupiter showed Jupiter from a fifth of the way to Saturn. */
    const travel = local < 0.78
      ? 0                                   // sitting on this planet
      : smoothstep((local - 0.78) / 0.22);   // crossing to the next
    camAim.copy(aimA).lerp(aimB, travel);

    // the Sun is the first stop, so ease off it rather than starting beside it
    if (state.p < 0.06) {
      const t0 = smoothstep(state.p / 0.06);
      camAim.multiplyScalar(t0);
    }

    const rA = a.rWorld, rB = b.rWorld;
    const r = state.p < 0.03 ? 1.0 : rA + (rB - rA) * travel;

    /* Distance is solved for the framing we want rather than guessed: to fill
       a fraction F of the frame height, d = r / tan(F * fov / 2). The earlier
       version multiplied an offset by 1.5 on two axes and added 0.9 on a third,
       which compounded to ~14x the radius and left every planet a speck. */
    const FILL = 0.42;
    const half = THREE.MathUtils.degToRad(camera.fov) * 0.5;
    /* The floor has to scale with the planet, not be a constant: 2.2 world
       units is nothing next to Jupiter and a mile away from Mars, which is
       why the small rocky worlds still came out as specks (Mars filled 9%
       of frame height while Jupiter filled 35%). */
    const dist = Math.max(r * 2.6, r / Math.tan(FILL * half));

    // one continuous swing around the system rather than a per-planet reset
    const ang = 0.55 + state.p * 3.1;
    camPos.set(
      camAim.x + Math.cos(ang) * dist * 0.82,
      camAim.y + dist * 0.30,
      camAim.z + Math.sin(ang) * dist * 0.82 + dist * 0.42
    );
    // slower follow while crossing, so the gap reads as distance covered
    camera.position.lerp(camPos, Math.min(1, dt * (travel > 0 ? 2.4 : 4.0)));
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
