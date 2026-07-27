# Responsive & Mobile Excellence

Jurors open sites on phones. "Mobile as an afterthought" is one of the fastest routes to a
sub-6.5 score, and Mobile Excellence is its own award. The rule: **mobile is designed in
parallel, not derived by shrinking**.

## Design in parallel

- Draw the mobile composition for every section at the same time as the desktop one. Some
  sections should be *structurally different*, not just narrower — a pinned horizontal
  gallery becomes a snap-scrolling carousel; a 3-column grid becomes a stacked list with a
  different hierarchy.
- Decide the mobile version of the **signature moment** explicitly. Disabling it is a
  6.0-tier decision. Replace it with a touch-native equivalent: drag instead of hover,
  tap-to-explode instead of hold, scroll-scrub instead of cursor-tracking.
- Mobile-first CSS: write the small layout, add complexity upward with `min-width` queries.

## Viewport & units

```css
.hero { min-height: 100svh; }          /* small viewport: never clipped by browser chrome */
.full { height: 100dvh; }              /* dynamic: use only where the resize is acceptable */
```

- `100vh` on mobile is wrong (it ignores the collapsing URL bar). Use `svh`/`dvh`/`lvh`.
- Never lock scroll on `body` without preserving position; use `overscroll-behavior: contain`
  on scrollable panels.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
  — and never `user-scalable=no` or `maximum-scale=1`.
- Respect safe areas on notched devices:
  `padding-bottom: max(var(--space-l), env(safe-area-inset-bottom));`

## Touch

- Tap targets ≥ **44×44 CSS px**, with ≥8px between adjacent targets.
- Every hover affordance needs a touch equivalent. A card that only reveals its title on
  hover is invisible on a phone.
- Use `@media (hover: hover) and (pointer: fine)` to scope hover-only behaviour, and
  `@media (hover: none)` for the touch design. Do not detect by width.
- `touch-action: manipulation` on buttons removes the 300ms delay legacy.
- Do not intercept `touchmove` for custom scrolling unless the concept truly requires it —
  native inertia beats anything you will write.
- Gestures need a visible affordance (peeking next card, a hint, arrows). Hidden gestures
  are not discoverable.

## Typography & layout on small screens

- Body ≥ 16px effective (also prevents iOS input zoom on focus).
- Display type: reduce more aggressively than the ratio suggests; a 12rem headline that
  becomes 3rem often needs a different line break, not just a smaller size. Use
  `<br class="mobile-only">` or `text-wrap: balance` deliberately.
- Keep the gutter — content must never touch the edge.
- Reduce section spacing to roughly 60% of desktop, but keep the rhythm proportional.
- Avoid horizontal overflow at every nesting level: grid children need `minmax(0, 1fr)`,
  flex children need `min-width: 0`, and long unbreakable strings need
  `overflow-wrap: anywhere`. Wide tables/code go in their own `overflow-x: auto` container —
  **the page body must never scroll horizontally.**

## Performance on mobile is different

- Mobile GPUs are 5–10× slower. Cap `devicePixelRatio` at 1.5, reduce particle counts, drop
  post-processing, use `mediump` precision, and render at reduced resolution if needed.
- Test on a real mid-range Android (a 3-4 year old device), not just an iPhone Pro.
- Emulate: 4× CPU throttle + Fast 3G is a fair approximation of the jury's worst case.
- Lazy-load everything below the first screen; dynamic-import the heavy modules.
- Battery/thermal: a scene that runs at 60fps for 10s and then throttles to 20fps reads as
  broken. Test for 60+ seconds.

## Orientation & sizes to verify

| Width | Represents |
|---|---|
| 320px | Smallest realistic phone — nothing may break |
| 390px | iPhone standard |
| 430px | Large phone |
| 768px | Tablet portrait — usually the most neglected and most often broken |
| 1024px | Tablet landscape / small laptop |
| 1280 / 1440px | Common desktop |
| 1920px+ | Large desktop — check that layout does not stretch or float |

Also verify: landscape phone (short viewport — pinned 100vh scenes are the usual casualty),
browser zoom 200%, and a window resized *while* a pinned scroll scene is active
(`ScrollTrigger.refresh()` must run, debounced).

## Mobile Excellence checklist

```
[ ] Layout designed per breakpoint, not scaled down
[ ] Signature moment has a real touch version
[ ] No horizontal overflow at 320px
[ ] Tap targets ≥44px, spacing ≥8px
[ ] No hover-only affordances
[ ] svh/dvh used; no clipped hero under browser chrome
[ ] Safe-area insets respected
[ ] Zoom enabled; 200% zoom usable
[ ] Forms: correct inputmode/type/autocomplete, no iOS zoom-on-focus
[ ] Fixed elements do not cover content or the keyboard
[ ] 60fps sustained on a mid-range Android for 60s
[ ] LCP < 1.5s / CLS < 0.05 on throttled mobile
[ ] Images served at mobile sizes (not desktop assets)
[ ] Reduced motion + dark mode verified on device
[ ] Tested in mobile Safari and Chrome Android, portrait and landscape
```
