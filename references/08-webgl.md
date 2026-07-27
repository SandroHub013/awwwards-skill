# WebGL & 3D

Read this only if the concept is spatial or material. WebGL is not a score multiplier by
itself — a slow, purposeless 3D scene scores *below* a fast typographic site. The jury
rewards WebGL that carries the idea and still runs at 60fps on a mid-range phone.

## Choose the right level

| Need | Use |
|---|---|
| One image/text distortion, hover effect, infinite gallery | **OGL** (~10KB) or a raw WebGL quad. Do not ship Three.js for a shader plane. |
| Product viewer, scene, camera path, lights, GLTF | **Three.js** |
| React app with 3D | `@react-three/fiber` + `drei` |
| >100k particles, compute, heavy simulation | Three.js **WebGPURenderer** + TSL compute |

## Renderer baseline

```js
import * as THREE from "three";

const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile && !usingPostFX,
  alpha: false,
  powerPreference: "high-performance",
  stencil: false,
  depth: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
```

- **Cap pixel ratio.** Rendering at DPR 3 on a phone is 9× the pixels for no visible gain.
- `antialias: false` when using post-processing (the composer handles it) — otherwise you
  pay for MSAA on a buffer you discard.
- WebGPU: `const renderer = new THREE.WebGPURenderer(); await renderer.init();` before the
  first render. Falls back to WebGL2 automatically.

## Syncing WebGL to the DOM

The dominant award-site architecture: **one canvas, fixed full-screen, behind or above the
DOM**, with GL objects positioned from DOM element rects. This keeps HTML semantic,
accessible and SEO-visible while the visuals are GPU-rendered.

```js
// Orthographic camera in CSS pixel units — 1 world unit = 1 px
const camera = new THREE.OrthographicCamera(
  -innerWidth / 2, innerWidth / 2, innerHeight / 2, -innerHeight / 2, -1000, 1000
);

function syncToDOM(mesh, el, scrollY) {
  const r = el.getBoundingClientRect();          // cached; re-read only on resize
  mesh.scale.set(r.width, r.height, 1);
  mesh.position.set(
    r.left - innerWidth / 2 + r.width / 2,
    -r.top + innerHeight / 2 - r.height / 2,
    0
  );
}
```

Rules:
- Cache `getBoundingClientRect()` on resize/`ScrollTrigger.refresh()`, then offset by the
  scroll value each frame. Reading rects per frame forces layout and destroys frame time.
- Render **after** Lenis updates in the same ticker tick (see `07-scroll.md`).
- Keep real text in the DOM. If display type must be WebGL, keep an accessible DOM copy
  (visually hidden or `aria-hidden` on the canvas + real heading in markup).
- One canvas, not one per element. Use viewport-scissored rendering or a shared scene with
  frustum culling if you need "multiple canvases" visually.

## Draw calls and geometry

Target **< 100 draw calls/frame** (`renderer.info.render.calls`).

- `InstancedMesh` for repeated objects: 1000 meshes → 1 draw call.
- `BatchedMesh` for many different geometries sharing a material.
- `BufferGeometryUtils.mergeGeometries()` for static scenery at load time.
- Share material instances — distinct materials break batching.
- LOD for anything the camera moves away from (30–40% frame time win).
- Verify bounding boxes so frustum culling actually works (`geometry.computeBoundingSphere()`).

## Materials, lights, shadows

- ≤ 3 active lights. Each light multiplies shader complexity.
- A `PointLight` shadow = 6 shadow renders (cube). Prefer a single `DirectionalLight`
  shadow, or bake.
- Shadow maps: 1024–2048 desktop, 512–1024 mobile. Never 4096.
- Static scenes: `renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;`
  once.
- Prefer an **HDRI environment map** (`RoomEnvironment` or a small `.hdr`) over multiple
  lights — better looking and cheaper.
- Transmission/refraction materials (`MeshPhysicalMaterial` with `transmission`) are the
  "premium glass" look but are very expensive: they render the scene again. Limit to one
  object, low `resolution`, and disable on mobile.

## Shaders

Keep GLSL in `.glsl` files (`vite-plugin-glsl`), not template strings.

```glsl
// fragment: cheap, branchless, mobile-safe
precision mediump float;             // highp only for position/depth
uniform sampler2D uTex;
uniform float uProgress;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  uv.x += sin(uv.y * 8.0 + uProgress * 3.14159) * 0.02 * uProgress;
  vec3 c = texture2D(uTex, uv).rgb;
  gl_FragColor = vec4(c, 1.0);
}
```

- Replace `if/else` with `mix()`/`step()`/`smoothstep()` — branchless GPU code.
- Keep varyings under ~3 for mobile.
- Fixed loop bounds only; dynamic loops cannot be unrolled.
- `mediump` gives ~2× speed on mobile; use `highp` only where precision matters.
- Pack up to 4 values per texel (RGBA) to cut texture fetches.
- Prefer TSL when targeting WebGPU + WebGL from one codebase.

## Assets

- **Draco** for geometry (90–95% smaller; decode in a worker via `DRACOLoader`).
- **KTX2/Basis** for textures — stays compressed in VRAM (~10× less than PNG). `UASTC` for
  normal maps, `ETC1S` for diffuse.
- Texture atlases to reduce material binds. Power-of-two sizes; mipmaps on.
- Model budget for a hero object: < 2MB compressed, < 100k triangles.
- Progressive: show a low-poly/low-res version instantly, swap when the full asset decodes.
- `<link rel="preload">` the above-the-fold 3D asset; lazy-load everything below with
  `IntersectionObserver`.

## Memory: Three.js does not garbage-collect the GPU

```js
function disposeScene(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      for (const k in m) {
        const v = m[k];
        if (v?.isTexture) { v.source?.data?.close?.(); v.dispose(); }
      }
      m.dispose();
    }
  });
  renderTarget?.dispose();
  renderer.renderLists.dispose();
}
```

Watch `renderer.info.memory` — counts must stabilize, not climb. Leaks show up on route
changes and on resize handlers that recreate render targets.

## Unified state, not competing tweens

The pattern behind smooth multi-input scenes (scroll + hover + click + intro all affecting
the same object): compute **one value per frame** from all sources, then apply.

```js
const explode = Math.max(state.scrollProgress, state.hoverAmt, state.burst, state.introAmt);
for (const p of particles) {
  const a = Math.max(0, explode - p.delay);
  p.mesh.position.copy(p.dir).multiplyScalar(a * 5.5);
}
```

Decay values exponentially instead of tweening them:
`state.flash *= 0.92;` — no tween conflicts, no cleanup, frame-stable.

## Frame budget & gating

```js
const clock = new THREE.Clock();
let running = true;
gsap.ticker.add(() => {
  if (!running) return;
  const dt = Math.min(clock.getDelta(), 1 / 30);   // clamp after tab-switch stalls
  update(dt);
  renderer.render(scene, camera);
});
new IntersectionObserver(([e]) => { running = e.isIntersecting; }).observe(canvas);
document.addEventListener("visibilitychange", () => { running = !document.hidden; });
```

- Warm up shaders before the first visible frame to avoid a compile hitch:
  `renderer.compile(scene, camera)`, render once, then clear.
- Render at 0.5–0.75 resolution and upscale on low-end devices — often doubles the frame rate.
- Detect low-end: `navigator.hardwareConcurrency <= 4`, `navigator.deviceMemory <= 4`, or a
  first-second FPS probe; then drop DPR, disable post-processing and particle counts.

## Mandatory fallbacks

- **WebGL context lost**: listen for `webglcontextlost`, prevent default, show a static
  poster image. This *will* happen on some devices.
- **No WebGL / blocked**: feature-detect and render the DOM/CSS version. The site must be
  complete without the canvas.
- **Reduced motion**: freeze the scene at a beautiful default frame; do not autoplay a
  camera path.
- **Mobile**: a genuinely designed lighter version, not a disabled canvas.
