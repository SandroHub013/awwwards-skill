/* ============================================================
   abyss — the water column, in real time.

   No textures, no models, no photographs. Every surface is a
   signed-distance-ish displacement of a sphere and every pixel is
   lit by one moving lamp, so the whole scene is arithmetic.

   Deep water is the cheapest photoreal target there is: the medium
   hides everything. Exponential fog does the depth work, darkness
   hides polygon poverty, and the only thing that has to be right is
   how light falls off through suspended matter.
   ============================================================ */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

export function createAbyss({ canvas, onReady } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false,
      powerPreference: "high-performance", stencil: false, depth: true,
    });
  } catch {
    return null;                       // no WebGL: the DOM version stands alone
  }

  const LOW = (navigator.hardwareConcurrency ?? 8) <= 4 ||
              (navigator.deviceMemory ?? 8) <= 4 ||
              matchMedia("(pointer: coarse)").matches;

  const dprCap = LOW ? 1 : 1.75;
  renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x02060b, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 260);
  camera.position.set(0, 0, 0);

  /* ---- shared uniforms: one source of truth for the whole scene ---- */
  const U = {
    uTime:     { value: 0 },
    uDepth:    { value: 0 },            // 0..1, driven by scroll
    uLampDir:  { value: new THREE.Vector3(0, 0, -1) },
    uLampPos:  { value: new THREE.Vector3(0, 0, 0) },
    // Two angles, not one plus a guess. The first version used
    // smoothstep(cos(0.52), cos(0.52)+0.30, …) whose upper bound is 1.168 —
    // past the maximum a dot product can return, so the cone topped out at 42%
    // of full brightness and the whole scene read as black.
    uLampCos:  { value: Math.cos(0.62) },   // outer edge
    uLampCosIn:{ value: Math.cos(0.30) },   // full brightness inside this
    uLampWarm: { value: new THREE.Color(0xffdcb0) },
    uCold:     { value: new THREE.Color(0x3f86ad) },
    // Tuned by looking, not by taste: at 0.055 the fog swallowed everything
    // past ~15 units and the frame read as black.
    uFog:      { value: 0.021 },
  };

  /* ---- the walls: two instanced belts of displaced rock ----
     Deep water only ever shows you what the lamp reaches, so the geometry
     can be crude. What has to be right is the falloff. */
  const rockGeo = new THREE.IcosahedronGeometry(1, LOW ? 2 : 3);

  const rockMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vRough;

      // cheap value noise — enough to break the silhouette of a sphere
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float noise(vec3 p){
        vec3 i = floor(p), f = fract(p);
        f = f*f*(3.0-2.0*f);
        float n = mix(
          mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
              mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
              mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y), f.z);
        return n;
      }

      void main() {
        vec3 p = position;
        float n1 = noise(p * 2.1 + float(gl_InstanceID) * 7.3);
        float n2 = noise(p * 6.4 + float(gl_InstanceID) * 3.1);
        float d = n1 * 0.42 + n2 * 0.16;
        p += normal * d;
        vRough = n2;

        vec4 world = instanceMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(instanceMatrix) * (normal + vec3(n2 - 0.5) * 0.7));
        gl_Position = projectionMatrix * modelViewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uLampPos, uLampDir, uLampWarm, uCold;
      uniform float uLampCos, uLampCosIn, uFog, uTime;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vRough;

      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float noise(vec3 p){
        vec3 i = floor(p), f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(
          mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
              mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
              mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y), f.z);
      }
      // three octaves is enough to break a flat facet into something that
      // reads as stone; more just costs fill rate nobody can see
      float fbm(vec3 p){
        return noise(p) * 0.55 + noise(p * 2.03) * 0.28 + noise(p * 4.11) * 0.17;
      }

      void main() {
        vec3 toFrag = vWorld - uLampPos;
        float dist = length(toFrag);
        vec3 L = toFrag / max(dist, 0.001);

        // Per-face normal from screen-space derivatives. Interpolated vertex
        // normals made these read as melted clay; faceting is what says "rock",
        // and it costs one cross product instead of more geometry.
        vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        if (dot(N, -L) < 0.0) N = -N;

        // Bump the face normal from a noise gradient. The geometry stays a
        // 20-triangle-per-instance blob; the surface stops looking like one.
        float e = 0.09;
        float n0 = fbm(vWorld * 1.15);
        vec3 grad = vec3(
          fbm(vWorld * 1.15 + vec3(e, 0.0, 0.0)) - n0,
          fbm(vWorld * 1.15 + vec3(0.0, e, 0.0)) - n0,
          fbm(vWorld * 1.15 + vec3(0.0, 0.0, e)) - n0) / e;
        N = normalize(N - (grad - N * dot(grad, N)) * 0.55);

        // spot: hard-ish edge, then inverse-square through the water
        float cone = smoothstep(uLampCos, uLampCosIn, dot(L, uLampDir));
        float fall = 1.0 / (1.0 + dist * dist * 0.0045);
        float lambert = max(dot(N, -L), 0.0);

        // a tight specular sheen reads as wet rock
        vec3 V = normalize(-toFrag);
        float spec = pow(max(dot(reflect(L, N), V), 0.0), 22.0) * 0.5;

        vec3 lit = uLampWarm * cone * fall * (0.30 + lambert * 2.1 + spec);

        // the water itself scatters a trace of cold light back — without this
        // everything outside the beam is pure black and reads as a hole
        vec3 ambient = uCold * 0.16 * (0.40 + vRough * 0.60);

        vec3 col = (lit + ambient) * (0.50 + n0 * 0.62);   // albedo varies with the same field

        // exponential-squared fog: this is what makes it read as water
        float f = 1.0 - exp(-uFog * uFog * dist * dist);
        // water absorbs red first, so distance shifts everything cyan — this one
        // line is most of what separates deep water from a dry cave
        col = mix(col * vec3(0.72, 0.95, 1.12), vec3(0.010, 0.035, 0.058), clamp(f, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  const ROCKS = LOW ? 34 : 70;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS);
  rocks.frustumCulled = false;
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(),
          pos = new THREE.Vector3(), scl = new THREE.Vector3(),
          e = new THREE.Euler();
    for (let i = 0; i < ROCKS; i++) {
      // two loose walls either side of a corridor the camera falls down
      const side = i % 2 === 0 ? -1 : 1;
      const t = i / ROCKS;
      // A corridor, not a pile: the middle stays open so the lamp has somewhere
      // to reach, and the walls recede in z so the frame has depth instead of
      // one boulder in the camera's face.
      const z = -11.0 - Math.random() * 38.0;
      const spread = 7.0 + (-z) * 0.22;          // walls splay with distance
      pos.set(
        side * (spread + Math.random() * 5.0),
        -t * 210 - Math.random() * 4.0,
        z
      );
      e.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      q.setFromEuler(e);
      const s = 2.6 + Math.random() * 5.2;
      scl.set(s, s * (0.7 + Math.random() * 0.8), s);
      m.compose(pos, q, scl);
      rocks.setMatrixAt(i, m);
    }
    rocks.instanceMatrix.needsUpdate = true;
  }
  scene.add(rocks);

  /* ---- marine snow: the single most convincing detail in deep water ---- */
  const SNOW = LOW ? 1800 : 5200;
  const snowGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(SNOW * 3), seed = new Float32Array(SNOW);
    for (let i = 0; i < SNOW; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 40;
      p[i * 3 + 1] = -Math.random() * 220;
      p[i * 3 + 2] = -Math.random() * 44 + 2;   // in front, where the lamp is
      seed[i] = Math.random();
    }
    snowGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    snowGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  }
  const snowMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uPix: { value: renderer.getPixelRatio() } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uPix;
      uniform vec3 uLampPos, uLampDir;
      uniform float uLampCos, uLampCosIn;
      varying float vLit;
      varying float vSeed;
      void main() {
        vec3 p = position;
        // slow settle plus a lateral drift, so it never reads as a static field
        p.y += mod(uTime * (0.35 + aSeed * 0.5), 220.0);
        p.y = mod(p.y + 110.0, 220.0) - 110.0 + position.y * 0.0;
        p.x += sin(uTime * 0.25 + aSeed * 30.0) * 0.55;

        vec3 toP = p - uLampPos;
        float dist = length(toP);
        float cone = smoothstep(uLampCos, uLampCosIn, dot(normalize(toP), uLampDir));
        vLit = cone / (1.0 + dist * dist * 0.006);
        vSeed = aSeed;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.6 + aSeed * 4.0) * uPix * (34.0 / max(-mv.z, 0.6));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform vec3 uLampWarm, uCold;
      varying float vLit;
      varying float vSeed;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d);
        if (r > 0.25) discard;
        float soft = smoothstep(0.25, 0.0, r);
        vec3 col = mix(uCold * 0.5, uLampWarm, clamp(vLit, 0.0, 1.0));
        gl_FragColor = vec4(col, soft * (0.10 + vLit * 1.5) * (0.45 + vSeed * 0.55));
      }`,
  });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  scene.add(snow);

  /* ---- the beam itself: a cone of additive haze in front of the lamp ----
     Without a visible shaft the lamp reads as a flashlight in a vacuum. */
  const beamGeo = new THREE.ConeGeometry(1, 1, 28, 1, true);
  beamGeo.translate(0, -0.5, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying float vAlong;
      varying vec3 vPos;
      void main() {
        vAlong = clamp(position.z, 0.0, 1.0);
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform vec3 uLampWarm;
      uniform float uTime;
      varying float vAlong;
      varying vec3 vPos;
      void main() {
        // fades along its length and hollows out at the edge, so it looks like
        // light through water rather than a solid cone
        float edge = 1.0 - clamp(length(vPos.xy) / max(vAlong, 0.001), 0.0, 1.0);
        float body = pow(1.0 - vAlong, 1.5) * pow(edge, 1.3);
        float flicker = 0.94 + 0.06 * sin(uTime * 3.1);
        gl_FragColor = vec4(uLampWarm * body * 0.55 * flicker, body * 0.50);
      }`,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.frustumCulled = false;
  scene.add(beam);

  /* ---- surface light: only visible in the first metres ---- */
  const shaftGeo = new THREE.PlaneGeometry(46, 130, 1, 1);
  const shaftMat = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform float uTime, uDepth;
      uniform vec3 uCold;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5); }
      void main() {
        // a few soft vertical blades, drifting
        float x = vUv.x * 9.0 + sin(uTime * 0.13) * 0.6;
        float blades = 0.0;
        for (int i = 0; i < 3; i++) {
          float o = float(i) * 2.7;
          blades += smoothstep(0.86, 1.0, sin(x + o) * 0.5 + 0.5);
        }
        float down = pow(1.0 - vUv.y, 2.2);
        float near = 1.0 - smoothstep(0.0, 0.34, uDepth);   // gone by 34% depth
        gl_FragColor = vec4(uCold * blades * down * near * 0.5, blades * down * near * 0.42);
      }`,
  });
  const shafts = new THREE.Mesh(shaftGeo, shaftMat);
  shafts.position.set(0, 8, -16);
  shafts.frustumCulled = false;
  scene.add(shafts);

  /* ---- state ---- */
  const state = {
    depth: 0, depthTarget: 0,
    lamp: new THREE.Vector2(0, 0),        // -1..1 pointer
    lampSmooth: new THREE.Vector2(0, 0),
    running: true, frames: 0, slow: 0,
  };

  const clock = new THREE.Clock();
  const tmpDir = new THREE.Vector3();

  function update(dt) {
    state.depth += (state.depthTarget - state.depth) * Math.min(1, dt * 3.2);
    state.lampSmooth.lerp(state.lamp, Math.min(1, dt * 5.0));

    U.uTime.value += dt;
    U.uDepth.value = state.depth;

    // the camera falls down the corridor; it never turns, so the lamp is the
    // only thing that changes what you can see
    camera.position.y = -state.depth * 195;
    camera.position.x = Math.sin(state.depth * 3.1) * 1.4;
    camera.lookAt(camera.position.x * 0.6, camera.position.y - 6.5, -14);

    // lamp: aimed from the camera, following the pointer
    tmpDir.set(state.lampSmooth.x * 0.85, state.lampSmooth.y * 0.6 - 0.12, -1).normalize();
    tmpDir.applyQuaternion(camera.quaternion);
    U.uLampDir.value.copy(tmpDir);
    U.uLampPos.value.copy(camera.position);

    beam.position.copy(camera.position);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tmpDir);
    const reach = 26;
    beam.scale.set(reach * 0.52, reach * 0.52, reach);

    shafts.position.y = 8;
  }

  let onFrame = null;
  function render() {
    if (!state.running) return;
    const dt = Math.min(clock.getDelta(), 1 / 30);
    update(dt);
    renderer.render(scene, camera);
    state.frames++;
    onFrame?.(dt);
  }

  /* ---- lifecycle ---- */
  let raf = 0;
  const loop = () => { raf = requestAnimationFrame(loop); render(); };

  const onVisibility = () => { state.running = !document.hidden; };
  document.addEventListener("visibilitychange", onVisibility);

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

  const onContextLost = (e) => { e.preventDefault(); state.running = false; };
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);

  // warm the shaders so the first visible frame is not a compile hitch
  renderer.compile(scene, camera);
  update(0.016);
  renderer.render(scene, camera);
  onReady?.();

  function destroy() {
    state.running = false;
    cancelAnimationFrame(raf);
    clearTimeout(rt);
    removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
    rockGeo.dispose(); snowGeo.dispose(); beamGeo.dispose(); shaftGeo.dispose();
    rockMat.dispose(); snowMat.dispose(); beamMat.dispose(); shaftMat.dispose();
    scene.clear();
    renderer.renderLists.dispose();
    renderer.forceContextLoss();
    renderer.dispose();
  }

  return {
    renderer, scene, camera, state, destroy, render,
    start() { if (!raf) loop(); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    setDepth(v) { state.depthTarget = Math.min(1, Math.max(0, v)); },
    setLamp(x, y) { state.lamp.set(x, y); },
    onFrame(fn) { onFrame = fn; },
    counts() {
      return {
        calls: renderer.info.render.calls,
        tris: renderer.info.render.triangles,
        points: renderer.info.render.points,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
      };
    },
  };
}
