/* ============================================================
   WebGL layer synced to the DOM.
   One fixed canvas, orthographic camera in CSS-pixel units, meshes
   positioned from cached element rects. HTML stays semantic and
   crawlable; the visuals are GPU-rendered.

   Requires: three, and the shared gsap.ticker from ../starter/main.js
   ============================================================ */
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LOW_END =
  (navigator.hardwareConcurrency ?? 8) <= 4 ||
  (navigator.deviceMemory ?? 8) <= 4;

export function initGL({ selector = "[data-gl]", canvas } = {}) {
  const nodes = [...document.querySelectorAll(selector)];
  if (!nodes.length) return null;

  /* ---- renderer ---- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,          // composer/FXAA handles it; MSAA is wasted here
      alpha: true,
      stencil: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;                 // no WebGL: the DOM version is already on screen
  }

  const dprCap = LOW_END ? 1 : (matchMedia("(pointer: coarse)").matches ? 1.5 : 2);
  renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -innerWidth / 2, innerWidth / 2, innerHeight / 2, -innerHeight / 2, -1000, 1000
  );

  /* ---- one quad per DOM node ---- */
  const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);   // shared: 1 geometry, N meshes
  const loader = new THREE.TextureLoader();

  const items = nodes.map((el) => {
    const img = el.querySelector("img");
    const texture = img ? loader.load(img.currentSrc || img.src) : null;
    if (texture) { texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = false; }

    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTex: { value: texture },
        uTime: { value: 0 },
        uHover: { value: 0 },
        uProgress: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uHover;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(uv.x * 6.2831 + uTime) * 0.04 * uHover;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        precision mediump float;
        uniform sampler2D uTex;
        uniform float uHover;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          // branchless RGB split, scaled by hover
          float a = 0.006 * uHover;
          vec3 c = vec3(
            texture2D(uTex, uv + vec2(a, 0.0)).r,
            texture2D(uTex, uv).g,
            texture2D(uTex, uv - vec2(a, 0.0)).b
          );
          gl_FragColor = vec4(c, 1.0);
        }`,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const state = {
      el, img, mesh, material, rect: null, hover: 0, hoverTarget: 0,
      imageOpacity: img?.style.opacity ?? "",
    };
    state.onPointerEnter = () => { state.hoverTarget = 1; };
    state.onPointerLeave = () => { state.hoverTarget = 0; };

    if (img) img.style.opacity = "0";      // DOM image stays for a11y/SEO/fallback
    el.addEventListener("pointerenter", state.onPointerEnter);
    el.addEventListener("pointerleave", state.onPointerLeave);

    return state;
  });

  /* ---- cache rects; never read layout per frame ---- */
  function measure() {
    const scrollY = window.scrollY;
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      it.rect = { top: r.top + scrollY, left: r.left, width: r.width, height: r.height };
      it.mesh.scale.set(r.width, r.height, 1);
    }
  }

  function position() {
    const scrollY = window.scrollY;
    for (const it of items) {
      const { rect } = it;
      if (!rect) continue;
      const top = rect.top - scrollY;
      it.mesh.position.set(
        rect.left - innerWidth / 2 + rect.width / 2,
        -top + innerHeight / 2 - rect.height / 2,
        0
      );
      it.mesh.visible = top < innerHeight + 200 && top + rect.height > -200;
    }
  }

  /* ---- render in the SHARED ticker, after Lenis has updated ---- */
  let running = true;
  const clock = new THREE.Clock();

  const render = () => {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 1 / 30);   // clamp after tab-switch stalls
    position();
    for (const it of items) {
      it.hover += (it.hoverTarget - it.hover) * (1 - Math.pow(0.001, dt));
      it.material.uniforms.uHover.value = it.hover;
      it.material.uniforms.uTime.value += dt;
    }
    renderer.render(scene, camera);
  };

  gsap.ticker.add(render);

  const onVisibilityChange = () => { running = !document.hidden; };
  document.addEventListener("visibilitychange", onVisibilityChange);

  /* ---- resize ---- */
  let rt;
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      renderer.setSize(innerWidth, innerHeight, false);
      camera.left = -innerWidth / 2; camera.right = innerWidth / 2;
      camera.top = innerHeight / 2;  camera.bottom = -innerHeight / 2;
      camera.updateProjectionMatrix();
      measure();
      ScrollTrigger.refresh();
    }, 200);
  };
  addEventListener("resize", onResize);

  /* ---- context loss WILL happen on some devices ---- */
  const restoreImages = () => {
    for (const it of items) if (it.img) it.img.style.opacity = it.imageOpacity;
  };
  const onContextLost = (e) => {
    e.preventDefault();
    running = false;
    restoreImages();                        // reveal the DOM fallback
  };
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);

  /* ---- reduced motion: render one beautiful static frame, then stop ---- */
  if (REDUCED) {
    measure(); position(); renderer.render(scene, camera);
    gsap.ticker.remove(render);
  } else {
    measure();
    renderer.compile(scene, camera);         // warm up shaders: avoids the first-frame hitch
    render();
  }

  let destroyed = false;
  document.fonts.ready.then(() => { if (!destroyed) measure(); });

  /* ---- teardown: three does NOT garbage-collect the GPU ---- */
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    running = false;
    clearTimeout(rt);
    gsap.ticker.remove(render);
    removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
    restoreImages();
    geometry.dispose();
    for (const it of items) {
      it.el.removeEventListener("pointerenter", it.onPointerEnter);
      it.el.removeEventListener("pointerleave", it.onPointerLeave);
      const u = it.material.uniforms.uTex.value;
      u?.source?.data?.close?.();
      u?.dispose();
      it.material.dispose();
      scene.remove(it.mesh);
    }
    renderer.renderLists.dispose();
    renderer.dispose();
  }

  // window.__renderer = renderer;   // uncomment while auditing draw calls / memory
  return { destroy, measure, renderer };
}
