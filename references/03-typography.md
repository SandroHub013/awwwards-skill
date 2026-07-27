# Typography

Typography is the single largest lever inside Design's 40%. On a jury pass, type is what
reads as "designed" or "assembled". Award sites are typographically *systemic*, not just
big-headline.

## The system, in order

1. **Choose 1–2 families.** One display/heading + one text. A third family is only allowed
   if it is monospace used for a functional role (labels, meta, numbers). Extremes work:
   pair a high-contrast display with a neutral grotesk. Avoid two families that occupy the
   same slot.
2. **Prefer a variable font** for the display role. It enables weight/width/optical-size
   animation with no extra requests, and cuts payload.
3. **Define roles, not sizes**: `display`, `h1`, `h2`, `h3`, `body`, `body-sm`, `label`,
   `caption`, `mono`. Every text node maps to a role. No ad-hoc font sizes anywhere.
4. **Set the scale with a ratio**, then round: 1.2 (dense/editorial), 1.25, 1.333, or 1.5
   (dramatic, display-led). Use one ratio for the whole site.

## Fluid type without breakpoint hopping

```css
:root {
  /* fluid clamp: min at 360px, max at 1600px viewport */
  --step--1: clamp(0.83rem, 0.79rem + 0.18vw, 0.94rem);
  --step-0:  clamp(1.00rem, 0.94rem + 0.28vw, 1.19rem);
  --step-1:  clamp(1.20rem, 1.10rem + 0.45vw, 1.50rem);
  --step-2:  clamp(1.44rem, 1.28rem + 0.70vw, 1.89rem);
  --step-3:  clamp(1.73rem, 1.49rem + 1.06vw, 2.38rem);
  --step-4:  clamp(2.07rem, 1.73rem + 1.55vw, 3.00rem);
  --display: clamp(3rem, 1.2rem + 9vw, 12rem);
}
```

Rules:
- Body text: `--step-0`, never below 16px effective on mobile.
- Measure: **60–75 characters** for body (`max-width: 65ch`). Display type can be 1–3 words
  per line by design.
- Line-height inverse to size: body `1.5–1.65`, h2 `1.15`, display `0.9–1.05`.
- Tighten tracking as size grows: `letter-spacing: -0.02em` at h1, `-0.03em` to `-0.04em`
  at display. Loosen for small caps/labels: `+0.08em` with `text-transform: uppercase`.
- `text-wrap: balance` on headings, `text-wrap: pretty` on body. Both are cheap wins.
- Use `font-optical-sizing: auto` and, for variable fonts, animate `font-variation-settings`
  rather than swapping weights.

## Hierarchy that jurors read as intentional

- Maximum **three** levels of emphasis visible in one viewport. More = mush.
- Contrast hierarchy by *two* channels at once (size + weight, or size + color), never by
  size alone in tiny increments. A 15% size jump reads as a mistake.
- Small caps or mono labels above sections create structure cheaply and look expensive.
- Numbers: use `font-variant-numeric: tabular-nums` for anything that animates or aligns.
- Align optically, not mathematically: hang punctuation, adjust the first letter of large
  display type, and check that the cap-height, not the box, aligns to neighbours.

## Loading fonts without hurting CWV

```html
<link rel="preconnect" href="https://fonts.example" crossorigin>
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/Display-var.woff2" crossorigin>
```

```css
@font-face {
  font-family: "Display";
  src: url("/fonts/Display-var.woff2") format("woff2-variations");
  font-weight: 100 900;
  font-display: swap;      /* or optional for zero-CLS if the fallback is close */
  size-adjust: 97%;        /* tune so the fallback occupies the same space */
  ascent-override: 92%;
  descent-override: 24%;
}
```

- **Self-host.** Third-party font CDNs cost a connection and a privacy question.
- Subset aggressively (`pyftsubset`, `glyphhanger`) — Latin subset of a variable font is
  typically 20–60KB.
- Match the fallback metrics with `size-adjust`/`ascent-override` so `font-display: swap`
  produces no layout shift. This is the difference between CLS 0.00 and CLS 0.12.
- Never block first paint on a font. Never ship 6 static weights when one variable file works.

## Kinetic typography (do it, but scope it)

Type in motion is the dominant award-site language. GSAP `SplitText` is free since
April 2025 (all GSAP plugins are), rewritten with screen-reader-safe output and built-in
masking.

```js
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(SplitText);

const split = new SplitText("[data-split]", {
  type: "lines,words",
  mask: "lines",            // built-in overflow mask for reveals
  autoSplit: true,          // re-splits on font load / resize
  linesClass: "line",
});

gsap.from(split.lines, {
  yPercent: 110,
  duration: 1.1,
  ease: "expo.out",
  stagger: 0.08,
});
```

Rules for kinetic type:
- **Split after fonts load**, or lines rewrap and the animation breaks. `autoSplit: true`
  handles it; otherwise wrap in `document.fonts.ready.then(...)`.
- Reveal by **line** for paragraphs, by **word** for short statements, by **character**
  only for a display headline — per-character on body copy is illegible and jank-prone.
- Stagger 0.04–0.09s. Beyond 0.12s a headline feels slow and people scroll past it.
- Always `revert()` the split on teardown and re-split on resize; leave the DOM restorable
  so screen readers and copy-paste still work.
- Under `prefers-reduced-motion`, skip the split entirely and fade the intact element.

Effects worth using, in rough order of cost/benefit: line-mask reveal, word stagger,
weight/width variable-font morph on hover, marquee with velocity-linked skew, per-character
scramble (only for one label), text along a path, WebGL distorted display type (only if the
site is already WebGL).

## Anti-patterns

- Fake bold/italic (`font-synthesis` artifacts) — ship the real cut or set `font-synthesis: none`.
- Justified text without hyphenation.
- Display type at `line-height: 1.5` (looks unset) or body at `1.2` (unreadable).
- All-caps paragraphs.
- Type over busy imagery with no scrim, overlay or backdrop-filter.
- Uppercase labels with no tracking.
- Animating `font-size` (layout) instead of `transform: scale` or variation settings.
- Hero headline that is an image — kills SEO, a11y, and looks blurry on retina.
