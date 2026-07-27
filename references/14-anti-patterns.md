# Anti-patterns — the score killers

Ordered by how fast a juror notices them. Anything marked **RED** caps the site below 7 on
its own. Run this list in Phase 6, before submission.

## RED — automatic disqualifiers

1. **Template smell.** Purchased theme, page-builder defaults, unmodified component library,
   AI-generated layout with default spacing. Pre-made templates are explicitly rejected by
   Awwwards, and a jury of working designers recognizes them in seconds.
2. **Placeholder content.** Lorem ipsum, "Company Name", stock photography, three identical
   fake case studies, an empty blog with one "Hello world" post.
3. **Broken on mobile.** Horizontal overflow, clipped hero, unreachable navigation, dead
   hover-only interactions, tiny targets.
4. **Slow.** 5s+ to meaningful content, or a preloader that hides content that already loaded.
5. **Sub-30fps** on a mid-range device during the signature interaction.
6. **Inaccessible core journey.** No keyboard access, no focus indicator, essential content
   only inside a canvas.
7. **Unfinished edges.** 404 page unstyled, forms that do nothing, dead links, a "coming
   soon" section, `console` errors on load.
8. **Homepage-only design.** A stunning hero and an inner page that looks like a different
   project. Jurors always click through.

## Design failures

- Three greys, four border radii, five shadows: no token system.
- Section spacing that varies arbitrarily; cramped vertical rhythm.
- Everything centered, every section the same height, no compositional variety.
- Type set at default weights and sizes with no scale; body copy at 14px; 100+ character measure.
- Text over imagery with no contrast strategy.
- Icons from three different sets at three different stroke weights.
- A footer that was clearly built last, at 40% of the care of the header.
- Dark mode that is an inverted light mode.
- Decorative gradients and glows standing in for an idea.

## Motion failures

- Twenty effects, no signature moment. Noise reads as insecurity.
- Reveal-on-scroll applied indiscriminately, including to the legal line in the footer.
- Elements that animate in every time you scroll past them.
- Parallax on body text.
- Scroll-jacking: fighting the wheel, breaking the scrollbar, disabling `Space`/`PageDown`,
  hijacking direction without an affordance.
- Pinned sections longer than ~4 viewport heights with no progress signal.
- Easing inconsistency: elastic bounce next to sharp expo next to linear.
- Durations that ignore distance — 0.9s for a 40px nudge, 0.2s for a full-screen panel.
- Animation blocking content the user came for.
- `will-change` left on permanently, causing GPU memory bloat.
- No `prefers-reduced-motion` path, or one that makes the site blank.

## Technical failures

- Two RAF loops (Lenis + your own) causing DOM/canvas desync.
- Layout reads inside scroll/RAF handlers ("Forced reflow" warnings in DevTools).
- One `ScrollTrigger` per element, 100+ instances.
- Animating layout properties (`width`, `top`, `margin`, `font-size`, `box-shadow`).
- Full-screen `backdrop-filter`/`blur()` animating every frame.
- Three.js resources never disposed; `renderer.info.memory` climbing on route change.
- No WebGL context-loss handler.
- Uncapped `devicePixelRatio` on mobile.
- 4000px hero image for a 1440px viewport; PNG where AVIF belongs.
- Six static font weights instead of one variable file; fonts from a third-party CDN with
  no preconnect.
- Client-rendered hero (kills LCP and crawlability).
- Third-party scripts (chat, analytics, cookie banner) loaded eagerly, shifting layout.
- Custom router that forgets `popstate`, `document.title`, focus management or scroll reset.
- Duplicate `view-transition-name` values aborting the transition.
- No error handling: a failed fetch leaves a permanent skeleton.

## Content & meta failures

- Typos in the hero. Inconsistent capitalization across nav items.
- Alt text that says "image" or is missing entirely.
- No `og:image`, default favicon, `title` that reads "Home | Vite App".
- Copy written in generic marketing voice that contradicts the art direction.
- Case studies with no dates, no credits, no outcomes.
- Untranslated strings in a multilingual site.

## Submission failures

- Submitting before edge cases are fixed — the site cannot be edited once under review,
  and the jury sees the broken version.
- Submitting on day one of launch instead of waiting 2–4 weeks for real-world fixes.
- A thumbnail that does not represent the site (wrong crop, wrong moment, text unreadable
  at card size).
- Starting with Awwwards when the work is a 6.0 — a failed submission is public record.

## Fast pre-flight (5 minutes)

```
[ ] Console clean, network has no 404s
[ ] Cold-load on throttled mobile: content visible < 1.5s
[ ] Tab through the whole page: focus always visible, order sane
[ ] prefers-reduced-motion emulated: site complete and calm
[ ] 320px width: no horizontal scroll
[ ] Every inner page, 404, and form checked for design consistency
[ ] All copy proof-read; no placeholder strings anywhere in the DOM
[ ] Signature moment works on touch
[ ] Sustained 60fps for 60s on the heaviest scene
```
