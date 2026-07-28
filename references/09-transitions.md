# Preloaders & page transitions

These two moments frame the whole experience. They are also where sites most often lose
Usability points by making people wait.

## Preloader

A preloader is justified when (a) the first view needs assets that cannot be streamed
(a WebGL scene, a video hero) or (b) the intro *is* part of the concept. Otherwise skip it —
a preloader on a fast content site is a self-inflicted delay.

### Rules

- **Hard cap ~2.0s** for a first-time visitor; 0.6–0.8s for repeat visits (persist a flag in
  `sessionStorage`). Anything longer must be *doing* something the user can see progressing.
- Show **real** progress, not a fake counter. Fake progress that snaps to 100% is obvious.
- The preloader must be **skippable**: any click/keypress finishes it, or it self-completes
  on a timeout even if an asset fails.
- Make it the *first* beat of the hero, not a separate screen: transition the preloader's
  own elements into hero elements (the counter becomes a label, the mask becomes the hero
  reveal). This is one of the cheapest "premium" signals.
- Never hide already-loaded content behind it — LCP is measured on what the user sees.
  If the preloader covers content for 3s, your LCP is 3s.
- Under `prefers-reduced-motion`: cut it to a 150ms fade.

### Real progress from real assets

```js
export function initPreloader() {
  const bar = document.querySelector("[data-preload-bar]");
  const num = document.querySelector("[data-preload-num]");
  const critical = [...document.querySelectorAll("[data-critical]")];  // imgs/videos

  let loaded = 0;
  const total = critical.length || 1;
  const state = { shown: 0 };

  const tick = () => {
    const target = loaded / total;
    gsap.to(state, {
      shown: target, duration: 0.4, ease: "power2.out",
      onUpdate: () => {
        bar.style.transform = `scaleX(${state.shown})`;
        num.textContent = String(Math.round(state.shown * 100)).padStart(3, "0");
      },
    });
  };

  const done = Promise.all(
    critical.map((el) =>
      el.complete ? Promise.resolve() :
      new Promise((res) => el.addEventListener("load", res, { once: true }))
    ).map((p) => p.then(() => { loaded++; tick(); }))
  );

  const timeout = new Promise((res) => setTimeout(res, 4000));  // never trap the user

  return Promise.race([Promise.all([done, document.fonts.ready]), timeout])
    .then(() => outro());
}
```

Give the counter `font-variant-numeric: tabular-nums` so it does not jitter.

## Page transitions

### Option 1 — View Transitions API (default choice in 2026)

Same-document view transitions are **Baseline newly available** (Chrome, Edge, Safari 18+,
Firefox 144+). Cross-document (`@view-transition`) animates in Chromium 126+ and Safari
18.2+; Firefox ignores the at-rule and falls back to an instant navigation — which is a
perfectly acceptable degradation.

Cross-document, zero JS:

```css
@view-transition { navigation: auto; }

::view-transition-old(root) { animation: fade-out 0.35s cubic-bezier(0.4,0,1,1) both; }
::view-transition-new(root) { animation: fade-in  0.45s cubic-bezier(0,0,0.2,1) both; }

/* element continuity: same name on both pages = morph */
.card__media  { view-transition-name: var(--vt-name); }   /* set per item */
.detail__hero { view-transition-name: var(--vt-name); }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation: none !important; }
}
```

Same-document (SPA / custom router):

```js
async function navigate(url) {
  const html = await fetch(url).then((r) => r.text());
  if (!document.startViewTransition) return swap(html);
  const t = document.startViewTransition(() => swap(html));
  await t.finished;
  ScrollTrigger.refresh();
}
```

`view-transition-name` must be **unique per snapshot**. Two visible elements with the same
name abort the transition — generate names per item (`--vt-name: item-7`).

### Option 2 — Custom overlay transition (MPA, full control)

Classic award-site pattern: an overlay panel or shape wipes in, the new document loads
behind it, the overlay wipes out. Use Barba.js / Taxi.js, or hand-roll with the History API.

```js
const overlay = document.querySelector(".transition");

async function go(href) {
  await gsap.to(overlay, { scaleY: 1, transformOrigin: "bottom", duration: 0.5, ease: "expo.inOut" });
  const doc = new DOMParser().parseFromString(await (await fetch(href)).text(), "text/html");
  document.querySelector("main").replaceWith(doc.querySelector("main"));
  document.title = doc.title;
  history.pushState({}, "", href);
  window.scrollTo(0, 0); lenis.scrollTo(0, { immediate: true });
  initModules();                        // re-init section modules
  ScrollTrigger.refresh();
  await gsap.to(overlay, { scaleY: 0, transformOrigin: "top", duration: 0.6, ease: "expo.inOut" });
}
```

Mandatory with custom routers — this is where most sites break and lose Usability points:
- Handle `popstate` (back/forward) with the same transition.
- Update `document.title`, `<meta>` description, `og:` tags and canonical.
- Move focus to the new `<h1>` (or a `tabindex="-1"` main) and announce via a live region.
- Kill old ScrollTriggers/tweens/GL resources before init'ing the new page.
- Reset scroll position; restore it on `popstate`.
- Support `cmd/ctrl/shift/middle`-click and external/`target` links → let the browser handle.
- Keep server-rendered HTML for every route. Never make navigation JS-only.

### Option 3 — Persistent canvas across routes

Highest craft: the WebGL scene never unmounts, only the DOM swaps, so a hero object
travels between pages. Requires a shared renderer module outside the router and a scene
graph keyed by route. Only attempt with a strict `destroy()` discipline per section.

### Timing

- Total transition **≤ 700ms** for a same-site navigation. Users notice above ~800ms.
- Out 250–400ms / hold / in 350–600ms. Never leave the screen blank in the middle.
- Prefetch on hover/`pointerenter` (`<link rel="prefetch">` or a fetch cache) so the hold
  phase has nothing to wait for.

## Scene-to-scene transitions (single page)

Between sections of one page, use masks not fades: a `clip-path` wipe, an SVG mask, a
column blind, or a scaling shape. Fades are the default; masks read as authored.

```css
.section-mask {
  clip-path: inset(0 0 100% 0);
  transition: clip-path 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}
.section-mask.is-in { clip-path: inset(0 0 0% 0); }
```

Keep clip-path animations off very large elements on mobile — they can force full-screen
repaint. Test with the FPS meter before committing.
