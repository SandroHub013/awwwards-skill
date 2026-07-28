# descent — self-score

Scored against `references/01-scoring.md` by the person who built it, which is the
weakest possible jury. Treat it as a claim with its evidence attached, not a verdict.

**Predicted: 7.5** — Design 7.5 · Usability 7.2 · Creativity 8.0 · Content 8.0

## Measured

Chrome against a local server, emulating **Fast 3G + 4× CPU**.

| Metric | Budget | Measured |
|---|---|---|
| LCP | < 1.5s | **1.58s** — over |
| CLS | < 0.05 | **0** |
| First-view transfer | < 3MB | **280 KB** cold |
| WebGL draw calls | < 100 | **2** |
| Geometries / textures | must not climb | **2 / 0**, flat over 57s |
| JS heap after 57s scrolling | stable | **6.1 MB** |
| Lighthouse Accessibility | 100 | **100** |
| Lighthouse Best Practices | ≥ 95 | **100** |
| Lighthouse SEO | ≥ 95 | **100** |
| Text contrast | ≥ 4.5:1 | **5.4:1** lowest |

Found and fixed during the audit:

- `--ink-3` measured **4.14:1** on the ground colour. Raised to L61 (5.4:1), with extra
  margin because the copy sits on a translucent scrim over a scene that is sometimes bright.
- The scrim used `inset: 0 -50vw`, which put a **horizontal scrollbar on every phone**.
  Replaced with the gutter width exactly.
- Imported the unminified `three.module.js`. The minified build is **87 KB gzipped
  against 130 KB** for a one-word change.

## Scored

**Design ×0.40 → 7.5.** The register is consistent — instrument, not poster — and the
colour ramp is the depth legend rather than decoration. Contrast is measured. Marked
down because the composition is at the mercy of where the data happens to be dense: the
scrim solves legibility but it also dims a scene that is the reason to be here, and that
compromise is visible.

**Usability ×0.30 → 7.2.** CLS is a true zero, memory is flat under a minute of
continuous scrolling at 4× throttle, and two draw calls is about as cheap as 8,556
points get, and reduced motion is **verified**. **LCP is 1.58s, over the 1.5s budget**,
and I am recording that as a miss rather than rounding it. Marked down further for INP
and a real frame-rate trace, neither of which was measured.

**Creativity ×0.20 → 8.0.** The concept survives its own removal: even frozen, the page
argues that a flat quake map hides the dimension the events differ in most. The reveal —
the recognisable Ring of Fire turning out to be the top face of a solid — is one moment,
describable in a sentence, and it is the data doing it rather than an effect applied to
it. Deliberately nothing is hidden as you descend, because hiding the deep events would
repeat the exact omission the page is about.

**Content ×0.10 → 8.0.** 8,556 real events from the USGS catalog, public domain, query
and retrieval date printed on the page. The vertical exaggeration is ×15 and stated on
screen rather than buried, because an unstated exaggeration in a piece about a hidden
dimension would be self-defeating. Imagery is generative from the data itself.

## Verified

- **`prefers-reduced-motion`** — Chrome launched with `--force-prefers-reduced-motion`.
  The scene renders exactly one composed frame at 415 km and stops, still at two draw
  calls; every beat is revealed rather than waiting on an observer, and all four
  distribution bands are present. The instrument holds still and the data stays.

## Not verified

- INP, and sustained frame rate under a real trace
- Any physical device, and no low-end GPU; all checks are emulated
- Safari and Firefox — Chrome only
- WebGL-absent fallback was written and reviewed but never forced at runtime
