# Performance

Usability is 30% of the score and it is the only criterion a juror can measure objectively.
Performance is also explicitly part of the Developer Award evaluation. Treat these numbers
as build constraints, not as a post-launch cleanup.

## Budgets (award tier vs. industry average)

| Metric | Award target | Typical site |
|---|---|---|
| LCP | **< 1.5s** | 2.5–4s |
| CLS | **< 0.05** | 0.1–0.25 |
| INP | **< 100ms** | 200–500ms |
| TTFB | < 400ms | 800ms+ |
| Sustained FPS | **60fps** | 30–45fps |
| First-view transfer | **< 3MB** | 5–10MB |
| JS (compressed, first view) | < 250KB | 1MB+ |
| Fonts | < 150KB total | 400KB+ |
| Lighthouse Performance (mobile, throttled) | ≥ 90 | 40–70 |

Set these in CI (`lighthouse-ci`, `size-limit`, or `bundlesize`) so a regression fails the
build rather than the jury.

## The load sequence to design toward

1. **HTML arrives with the hero content already in it.** Server-render or pre-render. A
   client-rendered hero cannot hit LCP < 1.5s.
2. **Critical CSS inline**, rest deferred. Keep the inline block under ~14KB.
3. **Hero image/video preloaded** at the right size and format; `fetchpriority="high"` on
   the LCP element; `loading="eager"` and never `lazy` above the fold.
4. **Fonts preloaded**, metric-matched fallback so swap causes no shift.
5. **JS deferred/module**, split by route and by section; the heavy stuff (Three.js,
   shaders, Lottie) dynamically imported when its section approaches the viewport.
6. Everything below the fold: `loading="lazy"`, `decoding="async"`,
   `content-visibility: auto` with `contain-intrinsic-size`.

```html
<link rel="preload" as="image" href="/hero-1600.avif"
      imagesrcset="/hero-800.avif 800w, /hero-1600.avif 1600w" imagesizes="100vw">
<link rel="preload" as="font" type="font/woff2" href="/fonts/Display-var.woff2" crossorigin>
```

## Images

- **AVIF first, WebP fallback, JPEG last.** AVIF typically 30–50% smaller than WebP.
- Generate the exact sizes used; serve with `srcset`/`sizes`. One 4000px hero for a 1440px
  viewport is the most common single cause of a blown budget.
- Always set `width`/`height` or `aspect-ratio` — this is most of your CLS.
- `decoding="async"` everywhere; `fetchpriority="high"` only on the LCP image; `low` on
  decorative ones.
- Use an image CDN (Vercel/Netlify/Cloudinary/imgix) or pre-generate at build time.
- LQIP/blurhash placeholders only if they do not delay the real image.

## Video

- Prefer a short, muted, looping **AV1/HEVC + H.264** MP4 over a GIF (always) and over a
  WebGL video texture unless the concept needs it.
- `preload="metadata"`, `playsinline`, `muted`, `loop`, and a `poster` that matches frame 0.
- Never let a background video be the LCP element — put a poster image behind it.
- Pause offscreen video with `IntersectionObserver`; pause on `visibilitychange`.
- Hero video budget: < 1.5MB for 6–10s at 1080p with a good encoder (`-crf 30` AV1 /
  `-crf 24` h264).
- Video-*first* sites (reels, post-production, case films — encoding ladders, HLS, preview
  patterns, accessible custom players): `references/17-video.md`.

## JavaScript

- Dynamic-import heavy modules:

```js
const io = new IntersectionObserver(async ([e], obs) => {
  if (!e.isIntersecting) return;
  obs.disconnect();
  const { initScene } = await import("./modules/webgl-scene");
  initScene(e.target);
}, { rootMargin: "200px" });
io.observe(document.querySelector("[data-scene]"));
```

- Import GSAP plugins individually (`gsap/ScrollTrigger`), not the whole bundle.
- Avoid duplicate libraries (two animation libs, two carousels, moment + date-fns).
- No layout reads inside RAF or scroll handlers; batch reads then writes.
- `{ passive: true }` on `scroll`, `wheel`, `touchstart`, `pointermove` listeners.
- Long tasks are INP killers: break work with `scheduler.yield?.()` or
  `requestIdleCallback` for non-critical init.
- Third parties are the usual disaster: analytics, chat widgets, cookie banners and font
  scripts. Load them after interaction, or self-host, or drop them. A cookie banner that
  shifts the layout is a double failure (CLS + Design).

## CSS

- One stylesheet, tokenized, no unused framework payload. If using Tailwind, ensure the
  build purges and that the design is not visibly "default Tailwind".
- Avoid `@import` in CSS (serializes requests).
- Avoid full-screen `backdrop-filter` and `filter: blur()` on large animated elements —
  the single most common cause of 30fps on mobile. If needed, blur a small element and
  scale it up, or bake the blur into an image.
- `contain: layout paint` on independent sections; `content-visibility: auto` below the fold.

## Runtime frame budget

16.6ms per frame at 60Hz. Practical allocation: ≤ 4ms JS, ≤ 4ms style+layout, ≤ 8ms
paint+composite. Anything that forces synchronous layout during a scroll is out of budget.

Check in DevTools Performance: look for purple "Layout" bars during scroll (should be
absent), long yellow scripting blocks, and "Forced reflow" warnings.

## Verify, do not assume

Test at **4× CPU throttle + Fast 3G**, in an incognito window, on a cold cache. Then on a
real mid-range Android. Your laptop is not the jury's device, and a MacBook Pro hides every
performance sin you have.

See `references/15-audit.md` for the runnable browser procedure.

## Performance anti-patterns

- Shipping the design tool's export (uncropped PNGs, 12 font weights, an SVG with 40k nodes).
- A preloader that hides an already-painted hero (self-inflicted LCP).
- Animating `width`/`height`/`top`/`left`/`box-shadow`.
- `will-change` left on permanently.
- Loading Three.js on a page with no 3D.
- Re-rendering a WebGL scene while it is offscreen or the tab is hidden.
- 100+ `ScrollTrigger` instances (one per element) instead of grouped triggers.
- Fonts loaded from a third-party CDN with no preconnect, blocking first paint.
