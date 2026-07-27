# webgl-hero — integration

`gl.js` is a drop-in layer on top of `../starter/`. It is not standalone: it shares
starter's `gsap.ticker`, Lenis spine and preloader. Four edits wire it in.

## 1. Import map — add `three`

`gl.js` does `import * as THREE from "three"`. In `starter/index.html`:

```html
<script type="importmap">
{
  "imports": {
    "gsap": "https://esm.sh/gsap@3",
    "gsap/ScrollTrigger": "https://esm.sh/gsap@3/ScrollTrigger",
    "gsap/SplitText": "https://esm.sh/gsap@3/SplitText",
    "lenis": "https://esm.sh/lenis@1",
    "three": "https://esm.sh/three@0.184.0"
  }
}
</script>
```

(r184+ per `references/06-stack.md`: fixes per-frame allocation. With a bundler instead:
`npm i three` and drop the import map.)

## 2. Canvas — markup + CSS

One fixed canvas, first child of `<body>` (below text overlays, above the page background):

```html
<canvas class="gl-canvas" data-gl-canvas aria-hidden="true"></canvas>
```

```css
.gl-canvas {
  position: fixed; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 0;
}
```

Keep real content above it (`z-index: 1` on `main`, or whatever your stacking scale says).
The DOM images stay in the document — they are the a11y/SEO/no-WebGL fallback; the layer
sets them to `opacity: 0` only after the renderer initializes.

## 3. Markup — wrap images in `data-gl`

```html
<figure class="card__media" data-gl>
  <img src="./media/work-01.avif" alt="Vela — kinetic identity for a sailmaker"
       width="1200" height="900" loading="lazy" decoding="async">
</figure>
```

One quad per `[data-gl]` node, sized from the element's cached rect. Shared geometry,
meshes culled 200px outside the viewport — dozens of nodes are fine, hundreds are not.

## 4. Boot — call `initGL` after the preloader

In `starter/main.js`, inside the existing boot sequence:

```js
import { initGL } from "../webgl-hero/gl.js";

initPreloader().then(() => {
  initGL({ canvas: document.querySelector("[data-gl-canvas]") });
  initSplitHeadings();
  initReveals();
  // ...rest unchanged
});
```

After the preloader, not before: textures and rects must be measured against the real,
post-preloader layout. The layer renders inside starter's single `gsap.ticker` — do not
add a second RAF loop.

`initGL` returns `null` when WebGL is unavailable or no `[data-gl]` nodes exist; the DOM
images simply stay visible. It returns `{ destroy, measure, renderer }` otherwise — call
`destroy()` on route change if you add a router; the GPU does not garbage-collect itself.

## Verify

Run `references/15-audit.md` against the result. The checks that bite here:
`renderer.info.memory` flat across route changes, one RAF loop in DevTools Performance,
context-loss recovery (DevTools → Rendering → "Lose WebGL context") revealing the DOM
images, and a static single frame under `prefers-reduced-motion`.
