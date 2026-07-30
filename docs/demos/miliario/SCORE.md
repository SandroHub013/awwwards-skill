# miliario — measured, then scored

Phase 6 of the skill, run against `references/15-audit.md`. Every number below came
out of a real Chrome (headless shell, loopback server, puppeteer-core). Nothing is
estimated; where the environment limits a measurement, that is stated.

Build: `docs/demos/miliario/` — 1 HTML, 1 CSS, 1 JS, 4 woff2 subsets (93 KB, OFL),
1 favicon.svg, 1 og.jpg (meta only, never rendered by the page). Zero runtime
dependencies, zero images in the page: landscape, road and milestones are computed.

---

## 1. Measured numbers

| Metric | Budget | Measured | Conditions |
|--------|--------|----------|------------|
| Total page weight | < 250 KB | **149 KB** | HTML 14.5 + CSS 15.7 + JS 20.5 + fonts 93.2 + favicon 0.4 KB, on disk |
| First-view transfer | — | **~80–100 KB** | 5–8 requests; Spectral italic/600 load only when used |
| LCP element | — | the hero `<h1>` (text) | Cinzel preloaded (26 KB), `font-display: swap` |
| Console on load | clean | **clean** | all runs, both pointer modes, reduced-motion run |
| Failed requests | 0 | **0** | |
| Horizontal overflow | none | **none** | 320, 390, 844×390 landscape, 768, 1440, 1920 |
| Frame time, no throttle | 16.7ms | **median 16.7ms, p95 17.3ms** | 10s full-journey scroll sweep, 1440×900 |
| Frame time, 4× CPU | 16.7ms | **median 16.7–33ms, p95 ~100–133ms** | software-rendered headless; see below |
| Keyboard, desktop | works | End → maxOff (13645), PageDown advances | native document scroll, never intercepted |
| Keyboard, touch | works | ArrowRight scrolls + snaps the scroller | `tabindex="0"` region + native/JS arrows |
| Snap, touch | mandatory | scroll jump to f=0.97 **snapped** to the Brundisium panel | HUD read MP CCCLXXXI |
| Reduced motion | complete | HUD/Tabula live, no smoothing, no parallax, no basoli zoom, dusk kept | verified in shots |

### The frame-rate story, honestly

Under 4× CPU throttling in *software-rendered* headless Chrome, the sweep median
lands between 16.7 and 33ms depending on the run (the machine itself is noisy;
petrini in the same session holds a flat 16.7). Three facts from isolating
variables:

- **The canvas is not the cost.** Same sweep with the road canvas shrunk to 8px:
  identical median (33.4ms vs 33.3ms). The slabs are baked to tiles and blitted.
- **The cost is layer compositing in software.** ~10 full-viewport layers (sky,
  sun, 4 parallax strips × day/dusk, canvas, track). On GPU-backed real Chrome
  this compositing is what the GPU does for free; unthrottled the page holds
  **16.7ms median / 17.3 p95**.
- Two fixes came out of this loop: the parallax layers moved from per-frame
  canvas path-fills to composited SVG transforms, and the track/strips got
  `will-change: transform` (justified: they animate continuously while scrolling).
  Median went 33.4 → 16.7–27 under throttle.

The dusk crossing (km ~140–215) still costs extra frames under throttle: the
palette crossfade itself is opacity-only, but the DOM chrome (header, Tabula,
HUD, panels) recolors via transitioned custom properties, which repaints text.

### Roman numerals: verified, not hardcoded

`toRoman()` runs at boot over every `[data-mp-for]` in the page (eyebrows, table,
hero, arrival) and **rewrites and warns** on mismatch — no warnings fired, so the
static HTML numerals match the computed ones. 1 mille passus = 1.478 km;
563 km → 380.92 → MP CCCLXXXI. Stop miles: XVIII, XLIII, LXX, XCIII, CXXXIII,
CLXXIX, CCLXXVII, CCCXXXVII, CCCLXXXI.

### Contrast (computed from the tokens)

| Pair | Ratio | Use |
|------|-------|-----|
| inchiostro #26241f on carta #f2ecdf | ~13.9:1 | body |
| ink-muted #5d574c on carta | ~5.6:1 | eyebrows, meta |
| rosso #a0341f on carta | ~6.0:1 | cue, numerals |
| rosso on travertino (HUD) | ~4.6:1 | the big MP numeral |
| dusk ink #e8e0cd on #211f1a | ~12.6:1 | night body |
| dusk accent #c05a3a on #211f1a | ~3.3:1 | large numerals only |

---

## 2. Self-score

Scored against `references/01-scoring.md`, pessimistically.

### Design — 7.0 (×0.40)
| Row | Score | Evidence |
|-----|-------|----------|
| Type system | 8.0 | Two real licensed families with distinct jobs (lapidary Cinzel caps for names/numerals, Spectral for body), house mono for data, fluid clamps, vh-capped display size after the 540px-height shot caught the hero overflowing. |
| Colour | 8.0 | Six tokens + a full dusk inversion, one accent with discipline, every pair computed above. |
| Layout | 6.5 | The honest-map rule (panels at real-distance fractions) is the layout idea, and it works. But it produces uneven density: the Beneventum–Venusia stretch is long and quiet by design, which a 60-second juror may read as empty rather than as the Apulian plain. |
| Detail | 6.5 | HUD/Tabula/cue/focus/dusk states designed. **Known rough edge:** at stop kilometres a milestone often stands directly behind the panel text (stops sit near round miles by history, not by layout). Text stays readable — ink on travertine — but several shots show the collision. |
| Consistency | 6.5 | One page; the colophon matches the register (Cinzel table, mono figures, rosso numerals). Nowhere to click through to. |
| Craft | 7.0 | Deterministic seed (312), crowned basoli, ruts, vertical inscriptions, the road as ground truth. Aqueduct arches are the weakest drawing. |

### Usability — 8.4 (×0.30)
Navigation is understood in seconds (cue chip, route line, live HUD). Two input
modes exactly per `07-scroll.md`: native vertical scroll drives the sticky scene
on fine pointers; a native `overflow-x` scroller with mandatory snap **is** the
journey on coarse pointers — sideways swipe as primary input, keyboard-scrollable.
Skip link, landmarks, sr-only itinerary list, visible focus, `is-past` hides fixed
chrome at the colophon, no overflow at six sizes, zoom enabled, 149 KB. Deductions:
the p95 spikes under 4× software throttling at the dusk crossing; the runway is
~14 viewport heights, long by design ("la strada non scorre, si percorre") and
signalled everywhere, but it is still long; mandatory snap can catch a fast fling.

### Creativity — 7.6 (×0.20)
| Row | Score | Evidence |
|-----|-------|----------|
| Concept exists | 8.5 | One sentence, and it survives un-animated: an itinerarium with real distances. The progress indicator is made *of the subject* — milestones, not percent. |
| Signature moment | 7.5 | The road itself: 1:1 ground truth, a stone every ten miles, the HUD that always agrees with what passes under your feet. Describable in one line, visible in 3 seconds. |
| Originality | 7.0 | Horizontal scroll is not new; horizontal scroll where drag is the touch-primary input, parallax is priced in Roman rates and SVG path-drawing is the progress bar — as a combination, with four set-firsts, it earns its place. |
| Risk serves the user | 7.5 | The riskiest choices (mandatory snap, dusk beat, honest long empty stretch) all serve the metaphor without blocking content. |

### Content — 7.5 (×0.10)
| Row | Score | Evidence |
|-----|-------|----------|
| Real copy | 8.5 | Italian throughout, one voice, every fact widely documented (312 a.C., Orazio 37 a.C., the Pesco Montano cut, Cicerone 43 a.C., the 6,000 of 71 a.C., the column that fell in 1528), distances declared *circa*, sources in the colophon. |
| Original imagery | 6.5 | 100% generative and art-directed — but flat silhouettes are a ceiling, not a photograph of the basoli. |
| Microcopy | 7.5 | MILIARIVM in epigraphic V, "km circa", the Stazio quote at the arrival, alt/aria equivalents, OG image with alt. |

### Weighted total

```
Design      7.0 × 0.40 = 2.80
Usability   8.4 × 0.30 = 2.52
Creativity  7.6 × 0.20 = 1.52
Content     7.5 × 0.10 = 0.75
                        ──────
                          7.59
```

**Verdict: 7.6 — SOTD-contender mechanics.** The concept/execution fit is the
strongest part: the site *is* the thing it describes, and the four techniques it
claims for the set are all load-bearing. The ceiling is craft polish — the
milestone/text collisions and the quiet middle stretch — not engineering.

---

## 3. Anti-pattern check

`references/14-anti-patterns.md`, RED list:

| # | RED | Status |
|---|-----|--------|
| 1 | Template smell | Clear — hand-written, seeded generative visuals |
| 2 | Placeholder content | Clear — real itinerary, real facts, computed numerals |
| 3 | Broken on mobile | Clear — touch mode is a *different mechanism*, not a shrunk one; 44px+ targets, no hover-only affordance |
| 4 | Slow | Clear — 149 KB, text LCP, no preloader |
| 5 | Sub-30fps | **Watch** — 60fps unthrottled; 4× software throttle dips at dusk (p95 ~100ms). Mitigated as far as the architecture allows |
| 6 | Inaccessible core journey | Clear — keyboard both modes, sr itinerary, reduced-motion complete, all content in DOM |
| 7 | Unfinished edges | **Partial hit** — no 404 for the demo path (same as petrini) |
| 8 | Homepage-only design | N/A — single page by design |

Other list items worth declaring:

- **Two rAF loops**: one loop drives track, canvas, layers, HUD, Tabula. ✓
- **Layout reads in scroll handlers**: none — `measure()` caches on resize + `fonts.ready`; the loop reads only `scrollY`/`scrollLeft`. ✓
- **`will-change` permanent**: on `.track` and `.layer__strip` — deliberate, they
  transform on every scroll frame; the set is small (5 layers). Declared, not forgotten.
- **Animations that leave content invisible**: none — panels are static in the
  track; no reveal-on-scroll anywhere. Landing mid-journey from a refresh restores
  scroll and renders correctly. ✓
- **No `og:image`/default favicon**: both shipped (`og.jpg` captured from the page
  itself, milestone favicon). ✓

Fixes made because the audit found them, not because they were predicted:

1. **HUD dead under reduced motion** — the redraw guard compared `cur` to `target`,
   which are always equal without smoothing; the HUD froze at MP I. Guard now
   compares against the last *applied* value.
2. **Double-animation of the dusk palette** — elements transitioned `background`
   *and* the custom property transitioned on `:root`, so chrome visibly lagged the
   canvas. Only the `@property` transition remains.
3. **Touch-mode canvas scrolled away with the content** — `position: fixed` inside
   the scroller does not pin in Chrome; layers and canvas are now pinned per-frame
   by the same loop (a transform, composited).
4. **SVG parallax repaints** — per-frame path fills became baked tiles for the road
   and composited SVG strips for the landscape; the dusk crossfade on layers is
   opacity between day/night duplicates, zero repaint.
5. **Hero overflow at 540px-tall viewports** — found by the thumbnail capture:
   display size now caps at `15vh`, with compact hero/HUD layouts under 700px and
   480px height (HUD moves right on landscape phones so it never meets the cue chip).
6. **Squashed Tabula dots** — `preserveAspectRatio="none"` stretched the stop dots
   on phones; the route's viewBox is now rebuilt in real pixels on resize.
7. **Basoli panel illegibility** — its text now crossfades dark→light and gains a
   scrim *in proportion to how much of it the road actually covers*, not by zoom alone.

## 4. Remaining gaps

- **Milestone-behind-text** at stop kilometres (see Design/Detail). A fix that
  keeps the ground-truth rule — e.g. parting milestones around focused panels —
  was judged dishonest and left out; the collision is declared instead.
- **No 404** for the demo path.
- **No real-device pass**: all numbers are from one Windows machine in headless
  Chrome. A mid-range Android check is the honest next step before any submission.
- **Firefox/Safari untested**: the mechanics are standard (sticky, overflow-x snap,
  canvas 2D, inline SVG), but `color-mix` and `@property` transitions deserve a
  real pass; both degrade gracefully (instant instead of animated colour).
