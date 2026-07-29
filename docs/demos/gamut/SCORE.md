# gamut — self-score

Scored against `references/01-scoring.md` by the person who built it.

**Predicted: 7.75** — Design 7.5 · Usability **8.0** · Creativity 7.5 · Content 8.5

The first demo in the set whose subject is the visitor's own machine, and the first with
Core Web Vitals actually measured rather than deferred to the "not verified" list.

## The idea

A display has three lights in it, so every colour it can emit is a mixture of three points,
so every colour it can emit is inside the triangle those points make. That is not an
engineering limit waiting to be lifted — it is what mixing means.

The page draws the CIE 1931 chromaticity diagram from the original colour-matching
functions, detects which gamut the browser claims for your display, and then **scrolling
closes a grey front onto that gamut's triangle** until everything your screen cannot emit
is flat grey. The number beside the diagram is not a caption: it is the area of the locus
still inside the front, clipped and measured on every frame, so it lands on 33.5% for sRGB
because that is what the polygon says.

Everything else on the page is grey. Nothing is coloured except the thing being measured —
which is a colorimetric decision before it is a stylistic one, since a hue anywhere in the
frame changes how the diagram beside it reads.

## Data

**CIE 1931 2° standard observer**, x̄ ȳ z̄ at 1 nm from 360–830 nm, 471 rows, shipped
byte-identical in `data/` with its provenance in `data/SOURCE.txt`. Retrieved 29 July 2026
from `cvrl.ioo.ucl.ac.uk/database/data/cmfs/ciexyz31_1.csv`.

The path matters: `/database/text/cmfs/` — the directory most citations point at — returns
a 404 page with a 200-shaped body. Check the parsed row count, not the response.

"Byte-identical" also has to survive the checkout: the file is CRLF, this repo normalises
to LF, and the claim would have been false on every clone. `.gitattributes` now marks
`docs/demos/*/data/*.csv` as `-text`.

The primaries of sRGB (IEC 61966-2-1), Display P3 (SMPTE ST 431-2 with D65 and the sRGB
transfer) and Rec. 2020 (ITU-R BT.2020) are typed in, because they are the *inputs*. Every
matrix is derived from them at runtime — a pasted matrix cannot be checked against the
figures printed on the page. The derived sRGB matrix agrees with the published one to four
decimals.

## Measured

Chrome, cold load on a fresh origin, gzip on (as GitHub Pages serves it).

| Metric | Budget | Measured |
|---|---|---|
| LCP — Fast 4G, 4× CPU | < 1.5 s | **0.58 s** |
| CLS | < 0.05 | **0.000** |
| Transfer, first view | < 3 MB | **31.4 KB** in 6 requests |
| Frame rate through the cut, 4× CPU | 60 fps | **58.3 fps** over 135 frames, worst 26.8 ms |
| Gamut switch | INP < 100 ms | **7–16 ms** |
| Wavelength drag | INP < 100 ms | **0.41 ms** per update |
| Lighthouse (mobile) | a11y 100 | **A11y 100 · BP 100 · SEO 100**, 0 failed |
| Horizontal overflow, 320–1920 px | none | **none**, and none at 720 px (200% zoom) |
| Focusable elements without a visible ring | 0 | **0** of 15 |

At **Fast 3G** the same load measures LCP 2.58 s, and that number is mostly the preset:
four serial 562 ms round trips (connect, HTML, stylesheet, module → data) before the H1 can
paint. Inlining the 4.9 KB of gzipped CSS would remove one of them. It is not done here
because the rest of the set ships a stylesheet and one page is not worth the divergence —
but that is the trade, stated rather than hidden.

The colour field is **334,292 chromaticities** converted once at 800 × 900 samples.
Scrolling moves a clipping path over the result and recomputes nothing.

### Failures found while building it

- **The gamut switch cost 83 ms**, because changing the cut rebuilt the entire colour
  field. The field depends only on the space being *painted* in, which never changes; only
  the out-of-gamut flags do. Splitting the two, and replacing the per-pixel matrix multiply
  with the scanline fill a convex triangle allows, took it to 7–16 ms.
- **`document.querySelector('[data-surround]')` matched `<html>`.** The theme switch writes
  that attribute onto the root, so after the first paint the selector for the *button*
  returned the document element instead. It worked only because the lookup happened one
  line earlier. The button's hook is now `data-surround-toggle`.
- **The x-axis label was drawn on top of the 0.8 tick**, printing `0x8`. Each axis now ends
  with its own name in place of its last number.
- **Wavelengths below 480 nm labelled the axis numbers.** Down there the locus doubles back
  into the bottom-left corner; the violet end is left unlabelled instead.
- **On a phone the readout sat on top of the plot.** The stage was one grid area with the
  HUD overlaid, which only worked because a desktop stage is taller than the diagram it
  centres. It is two rows now.
- **CLS 0.0048** from one line: the placeholder sentence under the headline was shorter than
  the measured sentence that replaced it. The placeholder is now the same length and the box
  reserves three lines. 0.000.
- **D65 disappeared in the dark surround.** It was drawn in the ink colour — which is white
  there — and D65 sits on the white point of the diagram by definition. It and the probe
  ring are drawn in fixed tones now, dark under light, because they live on the colour
  rather than on the page.
- **Contrast failed at 4.17:1** on the small mono labels, caught by Lighthouse, not by eye.
  Now 4.83:1 on paper and 5.67:1 on graphite.

## Scored

**Design ×0.40 → 7.5.** One decision runs the whole page: it is achromatic, so the only
colour on screen is the measurement. Type is a two-family system, sans for prose and mono
for anything numeric, and every number is tabular. The hero carries an index in its right
margin rather than empty paper. Marked down because the type is system-ui — no webfont is
the right call for a page about colour fidelity, but it costs distinctiveness against a
jury that reads type first — and because the three reading sections below the instrument
are conventional in a way the instrument is not.

**Usability ×0.30 → 8.0.** 31 KB in six requests, LCP 0.58 s under throttle, CLS 0.000,
Lighthouse 100/100/100 with no failed audits, 15 of 15 focusables with a visible ring, skip
link first, no horizontal overflow from 320 px to 1920 px or at 200% zoom, and a
reduced-motion path that shows the cut applied beside an inset of the untouched locus
rather than freezing or blanking. Marked down for the Fast 3G number above, for no physical
device, and for no Safari or Firefox.

**Creativity ×0.20 → 7.5.** The concept is one sentence and the moment is describable out
loud: *scroll, and the colour your screen cannot make drains away.* Tying the counter to
the clipped polygon area rather than to a tween means the picture and the number cannot
disagree. Against that, the chromaticity horseshoe is a known image and a scroll-driven
reveal is a known device; the combination is the new part, not the parts.

**Content ×0.10 → 8.5.** Primary source, shipped whole, with the retrieval path and the
trap that path contains. Every percentage on the page is computed from that file at
runtime. The colophon states what the page is not: not a colorimeter, not a measurement of
your panel, and — the one that matters — a picture of the colours you cannot see, drawn in
the colours you can. The diagram is rendered in your display's own space, so everything
outside your gamut was already substituted before it reached you. That is the subject, not
a bug, and it is said on the page rather than in this file.

## Not verified

- A real Display P3 panel. The wide-gamut path is taken when the browser reports P3 and the
  canvas can address it; both were confirmed available in Chrome (`color(display-p3 …)`,
  `getContext('2d', {colorSpace})` and `ImageData` all return `display-p3`), but every
  measurement here was made on an sRGB display, so the P3 rendering itself is untested.
- Safari and Firefox. Firefox's canvas `colorSpace` support in particular decides whether
  the page paints in P3 or falls back to sRGB there.
- Any physical device, and any device with a real touch screen.
- Sustained frame rate beyond ~2.5 s of scrolling; the 60-second thermal check in
  `references/15-audit.md` was not run.
- A screen-reader pass. The diagram is `role="img"` with a label that updates when the cut
  gamut changes, and every number it shows also exists as text, but no assistive technology
  has been pointed at it.
