# Templates

These are **starting structures that encode the doctrine**, not designs to ship as-is.
A juror recognizes a reused template instantly, and pre-made templates are explicitly
rejected by Awwwards. Take the architecture; throw away the art direction and make your own.

## `starter/`

No build step — open `index.html` with any static server (`npx serve`) and it runs from
CDN import maps. For production, `npm i gsap lenis` and switch the import map for a bundler.

What it demonstrates:

| File | Encoded practice |
|---|---|
| `index.html` | Semantic landmarks, skip link, one `<h1>`, real alt text, sized images, complete meta/OG, preloader that never hides painted content |
| `styles.css` | All tokens in one place (type scale, spacing, OKLCH colour roles, one easing family), metric-matched font fallback, `:focus-visible`, hover scoped to `(hover: hover)`, reduced-motion safety net, reveal start-state that only applies when JS is present |
| `main.js` | Single `gsap.ticker` driving Lenis + everything else, real-progress skippable preloader, SplitText after `fonts.ready`, one reveal used everywhere with a guard for already-in-view elements, `will-change` released on complete, marquee paused offscreen, magnetic clamped, cursor only on fine pointers, debounced `ScrollTrigger.refresh()` |

Deliberate omissions you must supply: the concept, the fonts, real content, real imagery,
and the signature moment.

## `webgl-hero/gl.js`

The DOM-synced WebGL layer: one fixed canvas, orthographic camera in CSS-pixel units,
rects cached on resize (never read per frame), meshes culled offscreen, shared geometry,
DPR capped by device class, shader warm-up, `visibilitychange` gating, context-loss
fallback that reveals the DOM images, reduced-motion single static frame, and a real
`destroy()` that disposes GPU resources.

Drop it next to `starter/`, add `<canvas>` plus `data-gl` wrappers around your images, and
call `initGL({ canvas })` after the preloader resolves.

## Before you ship anything built from these

Run `references/15-audit.md`, then `references/14-anti-patterns.md`. The template gets you
to a technically clean 6.0. The concept, the art direction and the signature moment are
what take it past 7.
