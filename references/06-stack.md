# Stack & project setup

## Decision matrix

Pick the *smallest* stack that can express the concept. Jurors do not score your framework;
they score speed, craft and originality. Custom code beats configured templates every time.

| Concept needs | Recommended |
|---|---|
| Static/marketing, motion-led, no app state | **Astro** or plain Vite + vanilla TS. Ship near-zero JS, add islands. |
| Content-driven with a CMS, many pages | **Astro** + headless CMS (Sanity / DatoCMS / Prismic / Contentful). |
| App-like, routing, shared WebGL canvas across routes | **Next.js** (App Router) or **Nuxt**. |
| Heavy 3D with React ergonomics | Next.js + **react-three-fiber** + drei + postprocessing. |
| Heavy 3D, maximum control/perf | Vite + vanilla **Three.js** (or **OGL** for small scenes). |
| E-commerce | Shopify Hydrogen, or headless Shopify + Astro/Next. |
| Designer-owned, no dev handoff | Webflow (GSAP is built in and free) or Framer — but expect a template-smell penalty unless the design is genuinely custom. |

**Never** ship a purchased theme, a page-builder default, or an AI-generated layout with
default spacing. A jury of working designers identifies these in seconds and it is an
automatic rejection path (pre-made templates are explicitly rejected).

## Canonical libraries (current as of 2026)

| Role | Library | Notes |
|---|---|---|
| Animation | **GSAP 3.x** | 100% free since April 2025 including SplitText, MorphSVG, DrawSVG, ScrollTrigger, ScrollSmoother, Flip, Observer. No license key, no auth token. |
| Scroll | **Lenis** (`lenis`, darkroomengineering) | Smooth scroll that keeps native scrollbar, `position: sticky`, and anchor links working. |
| 3D | **Three.js** (r171+ for production `WebGPURenderer`; r184+ fixes per-frame allocation) | `WebGPURenderer` auto-falls back to WebGL2. TSL compiles one shader to both WGSL and GLSL. |
| 3D (light) | **OGL** | ~10× smaller than Three for single-effect scenes (image distortion, infinite gallery). |
| Post-processing | `postprocessing` (pmndrs) or three's own `EffectComposer` | Use selective bloom, not full-screen everything. |
| React 3D | `@react-three/fiber` + `drei` | Only inside a React app. |
| Alternative animation | **Motion** (`motion`, ex Framer Motion) | Good for React UI state animation; GSAP still wins for timelines/scroll. |
| Lottie | `lottie-web` / `dotlottie` | For AE-authored vector motion; keep files under ~150KB. |
| Page transitions | Native **View Transitions API**, or Barba.js/Taxi for MPA, or framework router | See `09-transitions.md`. |

Do not stack all of these. A typical SOTD front-end is: framework + GSAP + Lenis, plus
Three.js only if the concept is spatial.

## Baseline project setup (vanilla Vite)

```bash
npm create vite@latest my-site -- --template vanilla-ts
cd my-site
npm i gsap lenis
# only if 3D:  npm i three
npm i -D sass vite-plugin-glsl
```

`src/lib/scroll.ts` — the scroll spine every other module hooks into:

```ts
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const lenis = new Lenis({
  autoRaf: false,            // GSAP drives the loop — never two RAF loops
  duration: 1.1,
  smoothWheel: true,
  syncTouch: false,          // keep native inertia on touch devices
});

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));  // seconds → ms
gsap.ticker.lagSmoothing(0);

// Re-measure after fonts and images settle
document.fonts.ready.then(() => ScrollTrigger.refresh());
```

`src/main.ts`:

```ts
import "./styles/index.scss";
import { lenis } from "./lib/scroll";
import { initReveals } from "./modules/reveals";
import { initPreloader } from "./modules/preloader";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduced) lenis.destroy();     // hand scrolling back to the browser

initPreloader().then(() => initReveals());
```

## File structure that stays maintainable

```
src/
  styles/
    _tokens.scss      # type scale, color roles, spacing, easing, durations
    _reset.scss
    _base.scss
    index.scss
  lib/
    scroll.ts         # Lenis + ScrollTrigger wiring
    gl.ts             # renderer + shared ticker (only if 3D)
    utils.ts          # lerp, clamp, mapRange, raf helpers
  modules/
    preloader.ts
    reveals.ts
    cursor.ts
    nav.ts
    <section>.ts      # one module per authored section
  shaders/
    *.vert / *.frag
```

Rules:
- **One module per section**, each exporting `init()` and `destroy()`. Destroy kills its
  ScrollTriggers, GSAP tweens, listeners and GPU resources. Without this, route changes leak.
- **All tokens in one file.** If a hex code or a duration appears inline in a component,
  it is a bug.
- **One shared ticker.** `gsap.ticker` drives Lenis, WebGL render, and any lerped value.
  Multiple RAF loops cause desync between DOM and canvas — the single most visible
  "amateur" artifact on scroll-driven sites.

## Hosting & delivery

- Vercel / Netlify / Cloudflare Pages: HTTP/2+, Brotli, immutable asset hashing, edge caching.
- Set long `Cache-Control: public, max-age=31536000, immutable` on hashed assets.
- Serve images through an image CDN or pre-generate AVIF/WebP at the exact sizes used.
- Enable HTTPS, HSTS, and a sane CSP. Security headers are part of the Developer Award's
  "quality code" read.
- Custom domain, real favicon set, `og:image` at 1200×630, `robots.txt`, `sitemap.xml`.
  Missing these is a visible sign of an unfinished project.

## Versions & gotchas

- GSAP: register every plugin once, at module scope. In React use `@gsap/react`'s `useGSAP`
  for automatic cleanup.
- Lenis: with `autoRaf: false` you *must* call `lenis.raf()` from your loop or the page will
  not scroll at all. Call `ScrollTrigger.refresh()` after any layout-changing async work.
- Three.js `WebGPURenderer` requires `await renderer.init()` before the first render.
- `vite-plugin-glsl` lets you `#include` shader chunks; keep GLSL out of template strings.
