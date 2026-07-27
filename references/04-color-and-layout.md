# Color, layout & spacing

## Color

### Build roles, not a palette

A palette is a list of colors. A system is a set of roles. Define these, then instantiate
them per theme:

```css
:root {
  /* ink / surface */
  --bg:        oklch(97% 0.005 90);
  --bg-elev:   oklch(99% 0.004 90);
  --ink:       oklch(18% 0.01 260);
  --ink-muted: oklch(48% 0.01 260);
  --line:      oklch(85% 0.008 260);

  /* one accent, with a deliberate role */
  --accent:      oklch(62% 0.19 32);
  --accent-ink:  oklch(99% 0 0);

  /* state */
  --focus:  oklch(70% 0.2 250);
  --danger: oklch(58% 0.2 25);
}
```

Rules:
- **Author in OKLCH.** Lightness is perceptually uniform, so a ramp actually looks even and
  hue stays stable when you shift lightness. `color-mix(in oklch, …)` gives predictable tints.
- **One accent.** Two accents need a written reason. Three means the palette is decoration.
- Neutrals must be *tinted*, never pure `#000`/`#fff`/`#888`. Give the greys a consistent
  hue drift toward the accent's complement — this is a large part of why award sites look
  "art-directed" and default sites look flat.
- Give each color a **job**: what does the accent mark? Interactive? Live? The brand's one
  idea? If it appears on 14 unrelated things, it means nothing.
- Dark mode is optional; a *badly done* dark mode costs more points than none. If you ship
  it, re-tune, don't invert: raise surface lightness in steps, lower accent chroma, and
  never use pure black with a bright accent (halation).

### Contrast is scored, not optional

- Body text ≥ **4.5:1**, large text (≥24px or ≥19px bold) ≥ **3:1**, UI borders and icons
  that carry meaning ≥ **3:1**.
- Text over imagery: use a gradient scrim, a solid plate, or `backdrop-filter: blur()`
  plus a tint — and verify against the *lightest* frame of any video.
- Do not carry information by hue alone (links, chart series, states) — add weight,
  underline, icon or label.
- Verify with a tool, not by eye. Every "designer eye" contrast failure is a Usability
  point loss and a Developer Award blocker.

### Making color feel expensive

- Limit the number of *values* on screen: 2 surfaces + 1 ink + 1 muted ink + 1 accent
  covers 90% of award sites.
- Big fields of one color beat many small colored elements.
- Add grain/noise at 2–5% opacity over flat fills — it removes the "CSS gradient" look.
  Use a tiled PNG/SVG or a cheap fragment shader, never a per-frame canvas.
- Use `color-mix()` for hover/active states so they stay in-family:
  `background: color-mix(in oklch, var(--accent) 88%, black);`

## Layout & grid

### Grid discipline

- Define **one** grid and honour it: typically 12 columns desktop, 6 tablet, 4 mobile, with
  a fluid gutter and a max content width.
- Set it as tokens and use `subgrid` where nesting must stay aligned:

```css
:root {
  --gutter: clamp(1rem, 0.6rem + 1.6vw, 2.5rem);
  --page:   min(100% - var(--gutter) * 2, 1440px);
}
.layout {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--gutter), 1fr)
    [content-start] repeat(12, minmax(0, calc(var(--page) / 12)))
    [content-end] minmax(var(--gutter), 1fr) [full-end];
}
.layout > * { grid-column: content; }
.bleed      { grid-column: full; }
```

- **Break the grid deliberately, once or twice.** One full-bleed asset, one element that
  crosses the margin. Unintentional breaks read as bugs; a single intentional one reads
  as art direction.
- Avoid centering everything. Asymmetry, a strong left edge, and a wide margin on one side
  are the cheapest ways to look designed.

### Spacing rhythm

Use a single spacing scale derived from one base, and nothing else:

```css
:root {
  --space-3xs: 0.25rem; --space-2xs: 0.5rem; --space-xs: 0.75rem;
  --space-s: 1rem;  --space-m: 1.5rem; --space-l: 2.5rem;
  --space-xl: 4rem; --space-2xl: 6rem; --space-3xl: clamp(6rem, 10vw, 12rem);
}
```

- Section rhythm is what separates premium from cramped: `--space-3xl` between major
  sections on desktop, at least `--space-xl` on mobile. Whitespace is not wasted space —
  it is the main signal of confidence.
- **Related elements closer than unrelated ones.** Most amateur layouts fail proximity, not
  alignment.
- Vertical rhythm: pick a baseline unit (e.g. 8px) and keep block spacing on multiples.
- Give every section a consistent internal structure: label → heading → body → media. The
  repetition is invisible to users and legible to jurors.

### Composition moves that score

- **Full-bleed → contained** alternation to create pacing.
- **Sticky column + scrolling column** for feature or case-study lists.
- **Horizontal band** (marquee or horizontally-scrolled section) breaking a vertical page —
  once, not thrice.
- **Overlap**: media overlapping type or another block by 5–15% of its height, on a real
  grid, with z-order and shadowing considered.
- **Edge-to-edge type**: a headline set to exactly the content width using fluid sizing,
  so it locks to both margins. Extremely effective; requires testing at every width.
- **Corner metadata**: small mono labels pinned to layout corners (index numbers, coords,
  time, status). Cheap, immediately "studio-grade" — but only fits technical registers.

## Layout anti-patterns

- Everything centered, everything the same width, every section the same height.
- Cards with a shadow *and* a border *and* a radius *and* a gradient.
- Inconsistent radii — pick one or two (`--radius-s`, `--radius-l`), never five.
- Content that touches the viewport edge on mobile (always keep `--gutter`).
- 100vh sections everywhere — on mobile browser chrome makes them wrong; use `100svh`/`100dvh`
  deliberately and never assume the viewport height is stable.
- Fixed heights on text containers; they break in other languages and at other font sizes.
