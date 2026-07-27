# Interactions & micro-detail

Phase 4 work. This is where a 6.5 becomes a 7.5. Jurors register craft subconsciously
through hover states, focus rings, cursors and the behaviour of small things.

## Custom cursor

Use one only if the concept needs it. A custom cursor is a Usability liability: it can lag,
disappear on iframes, and confuse people. When you use one:

```js
const cursor = document.querySelector(".cursor");
const pos = { x: innerWidth / 2, y: innerHeight / 2 };
const target = { ...pos };
let scale = 1, tScale = 1;

addEventListener("pointermove", (e) => { target.x = e.clientX; target.y = e.clientY; }, { passive: true });

gsap.ticker.add(() => {
  pos.x += (target.x - pos.x) * 0.18;      // lower = more lag/"weight"
  pos.y += (target.y - pos.y) * 0.18;
  scale += (tScale - scale) * 0.15;
  cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${scale})`;
});

document.querySelectorAll("a, button, [data-cursor]").forEach((el) => {
  el.addEventListener("pointerenter", () => { tScale = 2.4; cursor.dataset.state = el.dataset.cursor ?? "link"; });
  el.addEventListener("pointerleave", () => { tScale = 1;   cursor.dataset.state = ""; });
});
```

Rules:
- **Never hide the native cursor entirely** unless the custom one is always visible and
  always accurate. `cursor: none` plus a lagging dot over a form field is a real usability bug.
- Only enable on `(hover: hover) and (pointer: fine)` — never on touch.
- Disable on `prefers-reduced-motion` (or drop the lag to 1.0 = instant).
- Give it states that *mean* something: link, drag, play, close, external. A cursor that
  only grows on hover adds nothing.
- Keep it in a `position: fixed` layer with `pointer-events: none` and `z-index` above all,
  and make sure it does not sit above modal focus traps.

## Magnetic elements

```js
function magnetic(el, strength = 0.35) {
  const state = { x: 0, y: 0 };
  const r = () => el.getBoundingClientRect();
  el.addEventListener("pointermove", (e) => {
    const b = r();
    gsap.to(state, {
      x: (e.clientX - (b.left + b.width / 2)) * strength,
      y: (e.clientY - (b.top + b.height / 2)) * strength,
      duration: 0.4, ease: "power3.out",
      onUpdate: () => gsap.set(el, { x: state.x, y: state.y }),
    });
  });
  el.addEventListener("pointerleave", () =>
    gsap.to(state, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)",
      onUpdate: () => gsap.set(el, { x: state.x, y: state.y }) })
  );
}
```

Keep `strength` ≤ 0.4 and clamp travel to ~25% of the element size — a button that runs
away from the pointer is a failure, not a delight. The hit area must stay under the visual.

## Hover states worth points

- Every interactive element needs **four** designed states: rest, hover, focus-visible,
  active. Plus disabled and loading where applicable.
- Link underlines: animate a pseudo-element's `transform: scaleX()` with
  `transform-origin` flipping from right to left on out — a 6-line detail everyone notices.

```css
.link { position: relative; }
.link::after {
  content: ""; position: absolute; left: 0; bottom: -0.1em; width: 100%; height: 1px;
  background: currentColor; transform: scaleX(0); transform-origin: right;
  transition: transform 0.4s var(--ease-out);
}
.link:hover::after, .link:focus-visible::after { transform: scaleX(1); transform-origin: left; }
```

- Image hover: prefer a mask/scale-inside-overflow (`img { transform: scale(1.06) }` inside
  `overflow: hidden`) over filters. Duration 0.6–0.8s, `ease-out`.
- Text swap on hover (two stacked copies, one translating in as the other translates out)
  inside `overflow: hidden` — a cheap, extremely legible craft signal.
- Cards: move *one* property, not five. Lift OR tint OR reveal, not all three.

## Micro-detail checklist (each item is worth real points)

- [ ] `:focus-visible` ring designed to match the brand — never `outline: none` without a
      replacement with ≥3:1 contrast.
- [ ] Selection colors: `::selection { background: var(--accent); color: var(--accent-ink); }`
- [ ] Scrollbar styled (`scrollbar-width`, `scrollbar-color`) but still visible and usable.
- [ ] Form fields: designed rest/focus/error/valid; real labels; inline validation messages
      with an icon *and* text; `autocomplete` attributes set.
- [ ] Buttons show a loading state and become non-interactive while submitting.
- [ ] Empty states, success states and error states are designed, not default.
- [ ] 404 page in the site's own art direction, with a way back.
- [ ] Favicon set (SVG + ICO + apple-touch), `theme-color`, and a real `og:image` (1200×630).
- [ ] Copy-to-clipboard, external-link icons, `mailto:` behaviour — small things, checked.
- [ ] Images have `width`/`height` or `aspect-ratio` (zero CLS) and meaningful `alt`.
- [ ] Nav shows current page state; logo links home; footer has the real legal + credits.
- [ ] Text is selectable everywhere it should be (`user-select: none` only on chrome/UI).
- [ ] Print stylesheet is not broken (rare, but jurors have printed).

## Drag & inertial interfaces

Draggable galleries/indexes are a strong creativity move.

```js
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
gsap.registerPlugin(Draggable, InertiaPlugin);

Draggable.create(".gallery__track", {
  type: "x", inertia: true, edgeResistance: 0.85,
  bounds: ".gallery", cursor: "grab", activeCursor: "grabbing",
  onDrag() { gsap.set(".gallery__item", { skewX: -this.deltaX * 0.15 }); },
  onThrowComplete() { gsap.to(".gallery__item", { skewX: 0, duration: 0.4 }); },
});
```

Always add: a visible affordance (a "drag" cursor state or a hint that fades after first
interaction), keyboard equivalents (arrow keys / prev-next buttons), and native touch
scrolling with `scroll-snap` as the mobile version.

## Sound

Sound is high-risk/high-reward. If you use it:
- **Never autoplay.** Browsers block it, and jurors mute-then-penalize.
- Provide a persistent, obvious global toggle; default to **off**; remember the choice.
- Initialize `AudioContext` only after a user gesture (`ctx.resume()` on first click).
- Synthesize short UI sounds with the Web Audio API instead of shipping mp3s — smaller and
  parameterizable by interaction intensity.
- Keep UI sounds under 120ms, at low gain, with variation so repetition is not grating.
- Respect `prefers-reduced-motion` as a hint to also mute ambience.

## Interaction anti-patterns

- Hover-only content on touch devices.
- Tap targets below 44×44 CSS px.
- Disabling zoom (`user-scalable=no`, `maximum-scale=1`).
- Custom scroll containers that swallow keyboard scrolling.
- Delays before content is interactive because a decorative library is still parsing.
- Long-press or triple-click "easter egg" as the *only* path to a feature.
- Cursor-follow effects still running on a page that is not visible.
