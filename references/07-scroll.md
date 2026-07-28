# Scroll systems

Scroll is the primary interface of an award site. It must feel authored *and* stay
predictable. Every scroll technique below trades Usability points for Creativity points —
spend deliberately.

## The one-loop rule

DOM animation, smooth scroll and WebGL must be driven by **one** requestAnimationFrame loop.
Two loops = the canvas lags the DOM by a frame or more, which is instantly visible.

```ts
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({ autoRaf: false, duration: 1.1 });

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);      // gsap gives seconds, Lenis wants ms
  renderGL?.();                // WebGL renders in the same tick, after scroll updates
});
gsap.ticker.lagSmoothing(0);   // do not let GSAP "catch up" after a stall
```

## Smooth scroll: when and how

Use Lenis when the concept needs scrubbed continuity (a camera path, a horizon, a scene
transformation). Skip it for a fast content site — native scroll is faster and safer.

Non-negotiables when you do use it:
- Keep the native scrollbar and native scroll position (Lenis does; ScrollSmoother-style
  transform wrappers can break find-in-page and anchor restoration).
- `duration` 1.0–1.2. Above ~1.4 the page feels laggy and jurors call it scroll-jacking.
- `syncTouch: false` on touch devices unless the concept requires it — fighting native
  inertia on mobile is a Usability failure.
- Destroy Lenis under `prefers-reduced-motion`.
- Anchor links: `lenis.scrollTo("#target", { offset: -headerHeight })`.
- Modals/drawers: `lenis.stop()` on open, `lenis.start()` on close, plus scroll-lock on body.

## ScrollTrigger patterns

### Scrubbed value (the workhorse)

```js
ScrollTrigger.create({
  trigger: ".scene",
  start: "top top",
  end: "+=300%",
  pin: true,
  scrub: 0.6,               // 0.4–1.0 adds inertia; `true` is 1:1 and feels rigid
  onUpdate: (self) => { state.progress = self.progress; },
});
```

Drive **one normalized progress value (0–1)** per scene and derive everything from it —
never attach ten independent triggers to one section. Sub-ranges keep choreography readable:

```js
const EXPLODE = [0.10, 0.42];
const CARDS   = [0.45, 1.00];
const t = gsap.utils.mapRange(EXPLODE[0], EXPLODE[1], 0, 1, state.progress);
const explode = gsap.utils.clamp(0, 1, t);
```

### Pinning

- Pin the *section*, animate its children. Never pin something with `position: fixed` inside.
- `pinSpacing: true` (default) keeps document flow correct; turn it off only when overlapping
  scenes intentionally.
- Pinned length: `end: "+=" + (window.innerHeight * n)` — pick `n` from how many beats the
  scene has, typically 1.5–3 per beat. Too long and users feel trapped.
- Always give a pinned scene a visible progress signal (a counter, a rule, a chapter label)
  so users know how long it lasts. This single detail converts "scroll-jacking" complaints
  into "considered pacing".
- Recalculate on resize: `ScrollTrigger.refresh()` on `resize` (debounced) and after fonts load.

### Horizontal scroll section

```js
const track = document.querySelector(".track");
const panels = gsap.utils.toArray(".track__panel");

gsap.to(track, {
  x: () => -(track.scrollWidth - window.innerWidth),
  ease: "none",
  scrollTrigger: {
    trigger: ".track-wrap",
    pin: true,
    scrub: 0.5,
    end: () => "+=" + (track.scrollWidth - window.innerWidth),
    invalidateOnRefresh: true,
  },
});
```

`invalidateOnRefresh: true` is mandatory — without it the distance is wrong after resize.
On mobile, replace with a native `overflow-x: auto; scroll-snap-type: x mandatory` track:
native horizontal scroll with snap feels better than a pinned hijack on touch.

### Sticky + scroll narrative (safest high-value pattern)

Media column `position: sticky; top: 0; height: 100svh`, text column scrolls past. Zero
scroll-jacking, high perceived craft, works with reduced motion, cheap to make responsive.
Use this when the concept doesn't justify a pinned scene.

## Native CSS scroll-driven animations

Supported in Chromium 115+ and Safari 26+; Firefox has it behind a flag only (MDN BCD,
mid-2026). Use for *decorative* effects with progressive enhancement — zero JS, runs off
the main thread.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      animation: reveal linear both;
      animation-timeline: view();
      animation-range: entry 10% cover 35%;
    }
    .progress-bar {
      animation: grow linear both;
      animation-timeline: scroll(root block);
    }
  }
}
@keyframes reveal { from { opacity: 0; transform: translateY(24px); } }
@keyframes grow   { from { scale: 0 1; } to { scale: 1 1; } }
```

Named ranges: `entry`, `exit`, `contain`, `cover`. Use `scroll()` for page-level progress
(reading bars, nav state), `view()` for element reveals.

Rule: never make *content visibility* depend on a scroll-driven animation without a
`@supports` fallback that leaves it visible. Content hidden in an unsupported browser is a
catastrophic Usability failure.

## Performance of scroll-linked work

- Never read layout (`getBoundingClientRect`, `offsetTop`) inside a scroll handler. Cache
  on resize/refresh.
- Never write inline styles from a raw `scroll` event — go through the ticker.
- Gate expensive per-frame work by visibility:

```js
const inView = () => {
  const m = window.innerHeight;
  return rect.bottom > -m && rect.top < window.innerHeight + m;
};
gsap.ticker.add(() => { if (inView()) render(); });
```

- Pause offscreen video, WebGL scenes and canvases with `IntersectionObserver`.
- Use `content-visibility: auto; contain-intrinsic-size: <estimate>` on long, heavy sections
  below the fold — big rendering win, but supply the intrinsic size or you cause CLS.
- Lerp toward targets instead of tweening every input event:
  `current += (target - current) * 0.1;` — frame-rate dependent, so scale by `dt` if you
  support high-refresh displays: `current += (target - current) * (1 - Math.pow(0.001, dt));`

## Scroll anti-patterns

- Hijacking `wheel` to jump between full screens with no scrollbar feedback.
- Scroll direction inversion or "scroll to go horizontal" with no affordance.
- Pinned sections longer than ~4 viewport heights with no progress indicator.
- Breaking browser back/forward scroll restoration (`history.scrollRestoration`).
- Animations that only trigger once and leave elements invisible if the user lands
  mid-page from an anchor or a refresh. Always guard: if the element is already in view at
  init, set its end state immediately.
- Forgetting keyboard scrolling: `Space`, `PageDown`, `Home`/`End`, and arrow keys must work.
