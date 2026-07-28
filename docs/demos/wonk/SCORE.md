# wonk — self-score

Scored against `references/01-scoring.md` by the person who built it, which is the
weakest possible jury. Treat it as a claim with its evidence attached, not a verdict.

**Predicted: 7.4** — Design 7.5 · Usability 7.4 · Creativity 7.5 · Content 7.5

## Measured

All numbers below were taken in Chrome against a local server, emulating
**Fast 3G + 4× CPU** — the throttled cold load `references/15-audit.md` calls the
jury's worst case. They are not lab-clean numbers from an unthrottled desktop.

| Metric | Budget | Measured |
|---|---|---|
| LCP | < 1.5s | **1.40s** |
| CLS | < 0.05 | **0.0042** |
| First-view transfer | < 3MB | **158 KB** |
| Lighthouse Accessibility | 100 | **100** |
| Lighthouse Best Practices | ≥ 95 | **100** |
| Lighthouse SEO | ≥ 95 | **100** |
| Range touch target | ≥ 44px | **44px** |
| Text contrast | ≥ 4.5:1 | **5.2:1** lowest |

Two of those were failures found by the audit rather than passes by design:

- `--ink-3` measured **3.89:1** and the mono labels are all 12px. Darkened to L51.
- The font `<link rel="preload">` cost bandwidth the stylesheet needed on Fast 3G and
  pushed LCP to **2.99s**. Removing it halved LCP to 1.40s. The fallback face is
  metric-matched from the same binary, so nothing was traded for it.

## Scored

**Design ×0.40 → 7.5.** The type system is the subject, so scale, measure and optical
sizing had to be right. One accent, and it means "as shipped" rather than decorating.
Marked down for having no inner pages, forms or error states to prove consistency
across — a jury clicks through, and here there is nowhere to click.

**Usability ×0.30 → 7.4.** Core Web Vitals measured and inside budget, keyboard order
sane, skip link, focus visible, 44px targets, no horizontal overflow at 390px, and
reduced motion **verified** rather than assumed. Marked down for two things I did not
measure: INP and a real frame-rate trace on the scrub. The scrub animates
`font-variation-settings`, which is layout-bound by nature; it is scoped with `contain`
to the two morphing blocks, but that is a mitigation, not a measurement.

**Creativity ×0.20 → 7.5.** The concept is one verifiable number — `WONK` defaults to 1,
so the typeface is crooked as shipped — and the whole page argues it. Scroll-driven axis
morphing is not a new technique; the framing is what is original here, and I am not
going to score a familiar mechanic as if it were novel.

**Content ×0.10 → 7.5.** Every figure is parsed from the font binary: axes from `fvar`,
metrics from `head`/`hhea`/`OS/2`, credits from the project's own metadata. Typographic
only, no photography — a deliberate choice the doctrine prefers over stock, but it is
still a narrower content range than a site with commissioned imagery.

## Verified

- **`prefers-reduced-motion`** — Chrome launched with `--force-prefers-reduced-motion`.
  No reveal is left hidden, the scrub does not run, the progress rail sits full, and both
  static specimens still show `WONK 1` against `WONK 0` side by side, so the argument
  survives without a single frame of motion. The sliders remain live: the hero word
  answers the control at `WONK 0.30`, which is the point — this page is an instrument,
  and reduced motion does not mean a dead one.

## Not verified

- INP, and sustained frame rate under a real trace
- Any physical device; all mobile checks are emulated
- Safari and Firefox — Chrome only
