# Motion design

Motion is where award sites are won and where they most often break Usability. Treat motion
as a *language* with fixed vocabulary, not as a bag of effects.

## Define the motion language first

Write these five values into tokens before animating anything:

```css
:root {
  --dur-fast:   0.18s;   /* state change: hover, toggle */
  --dur-base:   0.4s;    /* element reveal, small move */
  --dur-slow:   0.9s;    /* hero, section transition */
  --dur-scene:  1.4s;    /* page/scene transition */
  --ease-out:   cubic-bezier(0.22, 1, 0.36, 1);      /* expo.out-ish, default */
  --ease-inout: cubic-bezier(0.65, 0.05, 0.36, 1);   /* travel between states */
  --ease-snap:  cubic-bezier(0.16, 1, 0.3, 1);       /* decisive, mechanical */
}
```

Rules that a jury feels even if they cannot name them:

- **One easing family per site.** Mixing bouncy elastic with sharp expo reads as inconsistent.
- **Entrances are fast-out (decelerate); exits are fast-in (accelerate).** Never linear,
  except for continuous loops (marquees, rotations) and scroll-scrubbed values.
- **Duration scales with distance and size.** A 40px nudge at 0.9s feels broken; a
  full-screen panel at 0.2s feels violent. Rough guide: 0.15–0.25s for state, 0.4–0.8s for
  element travel, 0.8–1.6s for scene.
- **Stagger 0.04–0.09s** for lists and split text; use `stagger: { each: 0.06, from: "start" }`
  and only use `"random"` when the concept is chaotic.
- **Nothing animates without a reason**: orient (where did this come from), relate (these
  belong together), or express (this is the concept). Decoration-only motion costs points.

## Only animate cheap properties

`transform` and `opacity` are composited. `filter` and `clip-path` are usually GPU but
expensive at full-screen size. Everything else (width, height, top/left, margin, font-size,
box-shadow, background-position) triggers layout or paint every frame — never animate those.

```js
gsap.set(el, { willChange: "transform, opacity" });
// …animate…
gsap.set(el, { willChange: "auto" });   // ALWAYS release it
```

Leaving `will-change` on permanently creates persistent GPU layers, drains memory and
tanks mobile performance. Set it at animation start, clear it on complete.

## The scroll-reveal baseline

Every site needs a consistent reveal. Pick one and use it everywhere:

```js
gsap.utils.toArray("[data-reveal]").forEach((el) => {
  gsap.from(el, {
    y: 24, autoAlpha: 0, duration: 0.9, ease: "expo.out",
    scrollTrigger: { trigger: el, start: "top 85%", once: true },
  });
});
```

- `once: true` unless the element genuinely needs to re-animate. Re-triggering on scroll-up
  feels cheap and costs Usability.
- Reveal *groups*, not every node. Twenty individually fading elements is noise.
- Never reveal above-the-fold content on scroll — it must be visible at first paint (and
  it protects LCP).
- Distance: 16–32px. Big translate-in distances (100px+) read as a template.

## The signature moment

The single most important motion decision. Specify it in writing before building:

```
NAME:        …
TRIGGER:     load / scroll range / hover / drag / click-hold
PHASES:      state A → transition → state B (with timings)
DURATION:    …
INPUT:       what the user controls, and how they discover it
FALLBACK:    what happens if WebGL / heavy assets fail
MOBILE:      the touch version — not a disabled version
REDUCED:     the prefers-reduced-motion version — not nothing
FIRST 3s:    what the user sees before they interact
```

Design guidance:
- It should be **discoverable within 3 seconds** and **repeatable**.
- It should express the concept, not just demonstrate a library.
- It should degrade to something still good. A signature moment that white-screens on a
  mid-range Android is a net negative.
- Prefer **one interaction with depth** (multiple states, responds to velocity, has sound
  or haptic-like feedback) over many shallow ones.

Common signature archetypes: a hero object that responds to cursor/hold and explodes or
assembles; a scroll-scrubbed camera path through a scene; a draggable/inertial index; a
transformation where the same element persists across pages; a generative system the user
perturbs; a physical simulation (cloth, fluid, springs) tied to input.

## Choreography of a scene

A section should read as one event with subordinate parts, not five simultaneous animations.

1. **Anchor** — one element establishes the change (the big move).
2. **Support** — 2–4 elements follow with stagger, smaller amplitude, same easing.
3. **Detail** — micro-elements (labels, rules, counters) resolve last, fastest.

Overlap phases by 30–50% (`"<0.2"` in GSAP position parameters). Fully sequential timelines
feel slow; fully simultaneous ones feel flat.

```js
const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
tl.from(".hero__title .line", { yPercent: 110, duration: 1.1, stagger: 0.07 })
  .from(".hero__media",       { scale: 1.12, autoAlpha: 0, duration: 1.4 }, "<0.15")
  .from(".hero__meta",        { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.05 }, "-=0.6");
```

## Continuous motion

Idle motion keeps a page alive but must be almost subliminal:
- Ambient drift: amplitude ≤ 2% of element size, period 4–12s.
- Marquees: constant speed, `will-change: transform`, duplicate content for a seamless loop,
  pause on hover *and* on `prefers-reduced-motion`.
- Velocity-linked distortion (skew/scale from scroll velocity) is effective, but clamp it —
  and always lerp back to 0.

```js
let skew = 0;
gsap.ticker.add(() => {
  const v = gsap.utils.clamp(-20, 20, lenis.velocity * 0.35);
  skew += (v - skew) * 0.1;
  gsap.set(".skewable", { skewY: skew * 0.15 });
});
```

## Reduced motion is part of the design

```js
const mm = gsap.matchMedia();
mm.add("(prefers-reduced-motion: no-preference)", () => {
  /* full choreography here; auto-reverted when the query stops matching */
});
mm.add("(prefers-reduced-motion: reduce)", () => {
  gsap.set("[data-reveal]", { autoAlpha: 1, y: 0, clearProps: "all" });
});
```

- Reduced motion means **no large translation, parallax, scale or scroll-hijack** — it does
  *not* mean a dead page. Keep opacity crossfades ≤0.2s and keep state feedback.
- The information conveyed by motion must survive: if a reveal signals "new section", keep
  a static divider or label.
- Test it: DevTools → Rendering → Emulate `prefers-reduced-motion`.

## Motion anti-patterns

- Scroll-jacking that breaks scrollbar position, keyboard `Space`/`PageDown`, or find-in-page.
- Parallax on text.
- Animation that delays content the user came for (a 4s preloader for a portfolio).
- Effects that only exist on the homepage hero, with dead inner pages.
- Reveal-on-scroll applied to every element including the footer's legal line.
- Hover effects with no touch equivalent.
- Simultaneous competing tweens on one property — drive one state value per frame instead
  (see the unified-state pattern in `08-webgl.md`).
- Motion at 30fps because of `filter: blur()` on a full-screen element every frame.
