# petrini — Phase 0-2, written before any markup

A test of the awwwards skill against a real, existing portfolio:
[Riccardo Petrini, *Graphic Design Portfolio 2026*](https://www.behance.net/gallery/253504203/Graphic-Design-Portfolio-2026)
(Behance, published 29 July 2026). Four branding case studies, all print/identity work,
made in Illustrator / Photoshop / InDesign.

**This is a build study, not a commissioned site.** The design work belongs to Petrini.
Nothing here reproduces his marks, packaging or photography — see *Content honesty* below.

---

## Phase 0 — Brief & concept

### The problem the source has
The Behance case is a stack of JPEGs with a one-line description. The four projects have
nothing visual in common — eco-minimal green, 1930s pizzeria red, liturgical red-and-gold,
acid-green corporate — so on a scrolling grid they read as noise, not as range. A jury reads
that as "no point of view".

But that spread *is* the argument, if the site says it out loud: this designer builds
**systems**, and a system is defined by taking over everything it touches.

### Concept statement
> This site is about four brand systems, and it feels like a specimen book because the page
> itself is repainted by whichever identity you are currently reading.

Removing all animation leaves the idea intact: each project still owns its own full-bleed
palette, its own display face, its own inverted chrome. That is the test in
`references/02-concept.md` §The concept statement — passed.

### Axes (no contradictions)
| Axis | Decision |
|------|----------|
| Structure | **Index** — the register `02-concept.md` recommends for portfolios. The index rail is permanent and is also the control surface. |
| Pacing | Slow, 6 beats, one full screen per identity. Air over density — this is print work. |
| Type | Editorial. Serif display + grotesk text + mono labels (mono in a functional role only). Display family *changes per project* to echo the real specification. |
| Color | Neutral ink-on-linen for the site's own voice; then each project's real palette, as large fields, one at a time. Never two identities on screen. |
| Imagery | **Typographic only.** Deliberate — see below. |
| Motion | Editorial and mechanical: token crossfade + one wipe rule per section. No parallax, no elastic. One easing family. |
| Sound | Absent. |
| Signature | The takeover. |

### Beat list
| # | Beat | Purpose | One visual event |
|---|------|---------|------------------|
| 0 | Hero, unbranded | Establish the designer's own quiet voice as the baseline the projects will overwrite | Display line reveals by line-mask; the chrome is ink-on-linen |
| 1 | The thesis | Name the idea in one sentence before proving it | A single accent rule draws across the measure |
| 2 | BioBox | Identity 1 — eco packaging | First takeover: page goes green/linen/charcoal, display face turns grotesk |
| 3 | La Bussola | Identity 2 — 1930s pizzeria | Takeover to red/beige/black, display face turns high-contrast serif |
| 4 | San Carlo Borromeo | Identity 3 — liturgical | Takeover to red/gold/linen, the only beat with two accents (and it is justified: gold is liturgical, not decorative) |
| 5 | CentroFallimenti | Identity 4 — corporate rebrand | The only dark takeover: acid green on near-black. Inverts the whole page, including chrome |
| 6 | Colophon | Return to the designer's own voice; credits, honesty note, real contact route | Tokens travel back to neutral — the page "lets go" |

### Content honesty (the constraint that shaped the build)
`references/01-scoring.md` punishes fake content harder than thin content, and
`references/02-concept.md` says: *if the budget forbids original imagery, go typographic-only
rather than stock*. We have no rights to his logos, no packaging photography, no client
metrics, and inventing any of them would be fabrication dressed as craft.

So the site ships **zero raster assets**. Every project is presented as an identity
*specimen*: its real palette as measured colour fields, its real typeface credits as text,
its brand name as a typographic lockup we set ourselves, and a description limited to what
the source actually states. No invented KPIs, no fake testimonials, no reproduced marks.
Every colour and typeface name on the page is traceable to the Behance case.

Side effect: page weight is ~40KB and LCP is a text node.

---

## Phase 1 — Art direction system

Tokens live in `styles.css` §tokens. Summary:

- **Grid**: one 12-column grid, `--page: min(100% - 2×gutter, 1280px)`, fluid gutter.
  Broken deliberately exactly twice: the takeover panels are full-bleed, and the hero
  display line hangs past the left margin by its optical side-bearing.
- **Type scale**: ratio 1.333, fluid `clamp()` steps, `--display` up to 11rem.
  Roles: `display / h1 / h2 / body / body-sm / label / mono`. No ad-hoc sizes.
- **Colour**: authored in OKLCH. Five values on screen at any time — 2 surfaces, ink,
  muted ink, 1 accent. Neutrals are tinted, never grey.
- **Motion**: `--dur-fast .18s / --dur-base .45s / --dur-slow .9s / --dur-scene 1.2s`,
  one easing family (`cubic-bezier(.22,1,.36,1)` and its inout sibling).
- **Grain**: one static SVG turbulence tile at 3.5%, in the surface layer. Never per-frame.

Per-project themes are the same seven roles re-instantiated, plus a display-family swap:

| Project | bg | ink | accent | accent-2 | Display family role |
|---------|----|-----|--------|----------|---------------------|
| BioBox | linen | charcoal-green | green | — | grotesk (echoes New Order) |
| La Bussola | beige | black | red | — | fat serif (echoes Ohno Blazeface) |
| San Carlo | linen | warm ink | liturgical red | gold | serif (echoes Playfair Display) |
| CentroFallimenti | near-black | off-white | acid green | orange | geometric grotesk (echoes Futura) |

Typefaces are the system stack, self-hosting nothing: zero font requests, zero CLS from
swap, and the *contrast between* families still carries the identity shift. A production
build for a paying client would license the four real families — this build cannot, and
faking them with lookalike webfonts would be worse than declaring the substitution.

---

## Phase 2 — Signature moment

```
NAME:        The Takeover
TRIGGER:     Scroll — whichever identity crosses the viewport centre owns the page.
             Also click/keyboard on the index rail (jump), and hover on a rail dot
             (previews the takeover at 35% strength without committing to it).
PHASES:      A: page holds identity N. → transition: the seven root colour tokens
             travel to identity N+1 over 1.2s on one easing curve, while the section's
             anchor rule scales from the left edge (0.9s) and the display family swaps
             at the midpoint, hidden inside the colour move. → B: page fully holds
             identity N+1; chrome, rail, focus ring and selection colour have all
             followed, because they all read the same tokens.
DURATION:    1.2s scene, 0.9s anchor, 0.18s chrome states.
INPUT:       Scroll position (primary), rail click/Enter (jump), rail hover (preview).
             Discoverable because the first takeover happens on the first scroll gesture.
FALLBACK:    No @property support → tokens swap instantly, everything else identical.
             No JS at all → every section is still fully painted in its own identity
             via a scoped [data-theme] block. The concept survives with JS disabled.
MOBILE:      Same mechanism, driven by the same scroll. Rail collapses to a 4-dot
             bottom bar with 44px targets; hover-preview is dropped (no hover) and
             replaced by tap-to-jump. Not a disabled version.
REDUCED:     Token swap at 0.15s crossfade (opacity-class only, no travel), anchor rule
             appears without scaling, no grain drift. The identity information is fully
             preserved — only the travel is removed.
FIRST 3s:    Hero display line masks in, three lines, 0.07s stagger. Nothing else moves.
             The rail is visible and already labelled, so the mechanism is legible
             before it is used.
```

Everything else on the page stays quiet by design: one reveal pattern (`[data-reveal]`,
24px, `once: true`), no hover effect louder than a rule and a colour, no cursor gimmick.

---

## What this exercise is measuring

The build is also the test. Findings — where the skill drove the work and where it
ran out of road — are recorded in `SCORE.md` §What the skill could not do.
