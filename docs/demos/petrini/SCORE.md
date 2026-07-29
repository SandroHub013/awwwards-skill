# petrini — measured, then scored

Phase 6 of the skill, run against `references/15-audit.md`. Every number below came
out of a real Chrome. Nothing here is estimated.

Build: `docs/demos/petrini/` — 1 HTML, 1 CSS, 1 JS, 1 OG image. No framework, no
web fonts, no raster assets in the page itself.

---

## 1. Measured numbers

Chrome 144, `chrome-devtools-axi`, served over loopback.

| Metric | Budget | Measured | Conditions |
|--------|--------|----------|------------|
| LCP | < 1.5s | **0.99s** | 390×844×3, Fast 3G, CPU 4× |
| LCP | < 1.5s | **0.81s** | 1440×900×2, Fast 3G, CPU 4× |
| LCP element | — | the hero `<h1>` (mobile: the lede `<p>`) | as designed — text, not an image |
| CLS | < 0.05 | **0.000** | both, and 0 in the Lighthouse run |
| Click → next paint | INP < 100ms | **22.7ms** | rail jump, CPU 4× |
| Long tasks on interaction | 0 | **0** | CPU 4× |
| Requests | — | **3** (document, stylesheet, script) | |
| First-view transfer | < 3MB | **44.1 KB** | |
| Lighthouse Accessibility | 100 | **100** | 0 failed audits |
| Lighthouse Best Practices | ≥ 95 | **100** | |
| Lighthouse SEO | ≥ 95 | **100** | |
| Console on load | clean | **clean** | no errors, no warnings |

### Frame rate on the signature moment

Scroll-scrubbed takeover, CPU throttled 4×, 3255 sampled frames over a continuous
60-second scroll cycle:

| | median | p95 | worst | frames > 33ms |
|---|--------|-----|-------|---------------|
| full 60s | **16.7ms** | 18.8ms | 250ms | 107 / 3255 (3.3%) |
| first quarter | 16.7ms | | | |
| last quarter | **16.7ms** | | | |

60fps sustained, and the median is identical at second 1 and second 60 — no thermal or
GC drift. The single 250ms frame is the instrumentation's own read, not a page stall.
There are no scroll handlers: the takeover is six `@property`-registered colours
interpolated by the compositor, so scrolling costs the page nothing per frame.

### Responsive sweep

`document.scrollWidth > clientWidth` at every width — must be false:

| 320 | 390 | 768 | 844×390 (landscape) | 1440 | 1920 |
|-----|-----|-----|---------------------|------|------|
| false | false | false | false | false | false |

Tap targets under 44px after fixes: two, both inline links inside a paragraph
(WCAG 2.5.8 spacing exception applies — their neighbours are >24px away). Every
standalone control measures ≥44px on a coarse pointer.

### Keyboard & reduced motion

- Tab 1 = skip link, Tab 2 = header, Tab 3–6 = the four index buttons. Focus outline
  `2px solid` at every stop, in the current identity's accent.
- Rail jump moves focus to the target `<h2>`, so the next Tab continues from the
  section, not from the rail.
- `--force-prefers-reduced-motion`: takeover still happens (verified: root tokens hold
  §03's values), and elements with `opacity: 0` and height > 40px = **0**.

---

## 2. Self-score

Scored against `references/01-scoring.md`, pessimistically.

### Design — 6.8 (×0.40)
| Row | Score | Evidence |
|-----|-------|----------|
| Type system | 6.0 | Roles, one 1.333 ratio, fluid clamps, no ad-hoc sizes, `font-synthesis: none`. But the display face is the *system* serif. A jury of designers will name Iowan/Palatino on sight, and on a typography-led page that is a visible ceiling. |
| Colour | 8.5 | OKLCH throughout, six roles instantiated five times, ≤5 values on screen, every contrast verified (Lighthouse a11y 100), tinted neutrals, one accent per identity — two only where two are justified. |
| Layout | 7.0 | One grid, one deliberate full-bleed break, `--space-3xl` section rhythm. Weak spot: at ≥1440 the right half of each chapter below the specimen table is dead space that is not composed, just empty. |
| Detail | 7.0 | Hover, focus, active, current, reduced-motion and no-JS states all designed. No empty/error states exist to design — and no 404. |
| Consistency | 6.0 | One page, so nothing contradicts. Also nothing proves it: jurors click through, and here there is nowhere to click through to. |
| Craft | 7.0 | Nothing looks accidental at any of six viewports. The grain, the rail rule and the two-gold split are the kind of detail that reads as intentional. |

### Usability — 8.8 (×0.30)
Every row measured above. Navigation is legible in under 3s (a numbered index, labelled
on hover and always labelled on touch), the page is 44KB, 60fps holds for a minute,
keyboard order is correct with focus management on jump, reduced motion is complete and
calm, body copy is 16px+ at a 46ch measure. The only deduction: the rail's meaning is
carried by numbers alone above 720px until you hover.

### Creativity — 6.8 (×0.20)
| Row | Score | Evidence |
|-----|-------|----------|
| Concept exists | 8.0 | One sentence, and it survives with animation removed — each chapter still owns its identity via scoped `[data-theme]`, even with JS disabled. |
| Signature moment | 6.5 | Describable in one line and repeatable within 3 seconds. But it is a token crossfade: technically modest, and "the section retints the page" is not unseen. |
| Originality | 6.0 | Not a copy of this season's SOTD, not new either. The *reason* it is here (an identity is a system that takes over what it touches) is stronger than the mechanism. |
| Risk serves the user | 7.5 | The riskiest thing on the page is the dark fourth identity, and it inverts cleanly because chrome, focus ring and selection all read the same tokens. |

### Content — 5.5 (×0.10)
| Row | Score | Evidence |
|-----|-------|----------|
| Real copy | 8.0 | Written in one voice, proof-read, no marketing filler, no placeholder strings (regex-verified against the DOM). Every colour and typeface named is traceable to the source case. |
| Original imagery | 3.5 | **There is none.** Deliberate and declared in the colophon, and better than stock — but this is a portfolio of *visual* work presented without a single piece of that work. A Content juror marks this, and it leaks into Design. |
| Microcopy | 6.5 | Considered labels, sector lines, honest colophon, OG image and alt text present. No 404 page. |

### Weighted total

```
Design      6.8 × 0.40 = 2.72
Usability   8.8 × 0.30 = 2.64
Creativity  6.8 × 0.20 = 1.36
Content     5.5 × 0.10 = 0.55
                        ──────
                          7.27
```

**Verdict: 7.3 — SOTD-contender mechanics, Honorable-Mention reality.**

The engineering rows are award-grade and would survive a Developer Award pass. The
ceiling is not craft, it is the missing artwork: no amount of polish makes a branding
portfolio complete without the branding in it. With Petrini's real marks, packaging
photography and the four licensed families, Design moves to ~8 and Content to ~8, which
puts the same build at **~8.1**. Without them, 7.3 is the honest number.

---

## 3. Anti-pattern check

`references/14-anti-patterns.md`, RED list:

| # | RED | Status |
|---|-----|--------|
| 1 | Template smell | Clear — hand-written, no component library, no default spacing |
| 2 | Placeholder content | Clear — regex-verified; no stock imagery because there is no imagery |
| 3 | Broken on mobile | Clear — no overflow 320→1920, 44px targets, rail reachable, no hover-gated affordance |
| 4 | Slow | Clear — 0.99s LCP on a throttled phone, no preloader at all |
| 5 | Sub-30fps | Clear — 16.7ms median held for 60s under 4× CPU |
| 6 | Inaccessible core journey | Clear — a11y 100, keyboard complete, all content in the DOM |
| 7 | Unfinished edges | **Partial hit** — no 404 page for the demo path |
| 8 | Homepage-only design | N/A — single page by design, which is its own limit (see Consistency) |

Three fixes were made because the audit found them, not because they were predicted:

1. **Themes read as neutral.** `app.js` cached the four identity themes at startup, but
   `styles.css` loads non-blocking (`media="print"` → `all`), so the script read six
   neutral values four times and the takeover never fired. Now read on demand.
2. **CLS 0.107.** The index `<nav>` was moved before `<main>` for keyboard order, which
   put a `position: fixed` element first in the body — unstyled, it laid out in flow and
   pushed the hero down until the stylesheet arrived. Rail positioning moved into the
   critical block. Now 0.000.
3. **Gold failed contrast.** "Borromeo" set in the palette's real gold measured 1.96:1
   against linen; large text needs 3:1. Split into `--accent-2` (the sample) and
   `--accent-2-ink` (the same hue at L .52), and the chapter copy now says why.

Also fixed from measurement: a persistent rail label overlapping the specimen table at
1440; the "Black" swatch invisible on the dark identity; the header meta line wrapping
and pushing the mobile hero off-screen; four rail labels wrapping to different heights;
and reveals left at `opacity: 0` under reduced motion when a reader jumped past a section.

---

## 4. What the skill could not do

This build was also a test of the skill's reach on a real portfolio
([the source case](https://www.behance.net/gallery/253504203/Graphic-Design-Portfolio-2026)).
Where it ran out of road:

- **It cannot make the work.** Logos, packaging dielines, liturgical print layouts, the
  1930s mascot — none of it is in scope, and none of it can be faked without
  fabricating someone's portfolio. The skill builds the *container*; Illustrator and a
  designer build the contents.
- **It cannot license type.** Four specified families, none available to this build. The
  skill's own guidance ("go typographic-only rather than stock") covers imagery but says
  nothing about what to do when the *type* is the thing you cannot have. The substitution
  is declared on the page; that is a workaround, not a solution, and it costs the
  Typography row about two points.
- **`references/01-scoring.md` demands real photography, and offers no path when there
  is none.** The rubric is right — Content is 10% and leaks into Design — but a
  zero-asset build has a hard ceiling the skill does not name. Worth adding: *how high
  can a typographic-only site score, and what has to be true for that to be enough?*
- **No route for print-to-screen colour.** The gold problem is not a bug, it is a
  discipline gap: a print palette carries metallics, spot inks and paper stock that have
  no screen equivalent. `04-color-and-layout.md` covers contrast, but not translating an
  inherited print palette. The two-gold split here was invented in the audit loop, not
  read off a reference.

## 5. Remaining gaps

- **No 404 page** for the demo path (RED #7, partial).
- **Not linked from the showcase index.** `docs/media/demo-petrini.webp` is captured and
  in place, but the card is deliberately not added: publishing a study of a named
  designer's work on the public index is a permission question, not a build step.
- **Single page.** The strongest available upgrade is a real inner page per identity —
  it would let jurors click through, and it is where a Consistency 6.0 becomes an 8.
