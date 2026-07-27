# Concept & art direction

Creativity is 20% of the score but it decides whether Design's 40% has anything to be
about. Sites without a concept plateau at ~6.2: competent, forgettable, no award.

## The concept statement

Before any file is created, write one sentence:

> **This site is about ___, and it feels ___ because ___.**

Examples that work:
- "A type foundry site where the specimen *is* the interface — every scroll sets type."
- "A wine estate site paced like a slow walk through the vineyard: one continuous horizon."
- "A robotics studio site where the cursor is a machine arm that assembles the layout."

Test it: if you removed all animation, would the idea still be legible? If the answer is
no, you have effects, not a concept. Effects are replaceable; a concept is not.

## Derive everything from the concept

The concept must produce concrete decisions in each of these. Write them down:

| Axis | Question the concept must answer |
|------|----------------------------------|
| Structure | Is this a linear narrative, an index, a spatial world, or a tool? |
| Pacing | Fast and dense, or slow with air? How many scenes? |
| Type | Editorial, industrial, humanist, display-led, monospace-technical? |
| Color | How many colors, and what does each one *mean* here? |
| Imagery | Photographic, illustrated, generative, typographic-only? |
| Motion | Mechanical, elastic, liquid, cinematic, snappy-utilitarian? |
| Sound | Present or absent — and if present, why? (Default: absent.) |
| Signature | What is the single moment? |

If two axes disagree (industrial type + liquid motion), you have two concepts. Kill one.

## Art direction registers

Pick one and commit. Mixing registers is the most common cause of "competent but bland".

**Editorial** — Large serif or grotesk display, strict grid, wide margins, rules and
captions, restrained color, photography treated like print. Motion is subtle: masked
reveals, typographic transitions. Risk: turning into a magazine template — needs one
unexpected structural move.

**Brutalist / raw** — System or monospace type, high contrast, exposed structure, hard
edges, no shadows, deliberate ugliness under control. Motion is instant and mechanical.
Risk: reads as unfinished if spacing rhythm is not perfect. Brutalism is *more* demanding
of alignment discipline, not less.

**Kinetic / motion-first** — Type is the imagery; everything is in motion; scroll is
choreography. Requires exceptional performance discipline. Risk: motion sickness and
illegibility. Needs an aggressive reduced-motion story.

**Quiet luxury** — Very few elements, enormous whitespace, one accent, slow fades, muted
palette, impeccable typography. Every detail is visible because there is nothing to hide
behind. Risk: emptiness without craft reads as an unfinished site.

**Spatial / 3D world** — A navigable scene; scroll or drag moves through space; DOM is
overlay. Highest technical cost, highest ceiling. Risk: everything in `08-webgl.md`.

**Retro-technical** — Terminal aesthetics, dithering, ASCII, CRT artifacts, pixel type,
system-UI pastiche. Motion is stepped, not eased. Risk: nostalgia as a substitute for idea.

**Organic / material** — Grain, paper, fabric, liquid, hand elements, imperfect grids,
tactile transitions. Motion has weight and follow-through. Risk: texture soup, poor contrast.

## Narrative structure

Award sites almost always have an authored order, not a stack of sections. Common spines:

1. **Reveal** — Preloader → hero statement → progressive disclosure of the idea → proof →
   invitation. Best for brand/product.
2. **Journey** — Continuous scene where scroll advances a single continuous transformation
   (a camera path, a horizon, a manufacturing line). Best for story-driven brands.
3. **Index** — A strong system for browsing many items where the *system itself* is the
   idea (a foundry, an archive, a studio's work). Best for portfolios.
4. **Tool** — The site is an instrument the visitor plays (a configurator, a generator).
   Highest creativity ceiling; hardest usability.

Write the beat list before building: each beat = one screen-state, its purpose, its one
visual event. 5–9 beats for a landing page. Anything longer needs a reason.

## Content requirements (the 10% that leaks into everything)

- Real copy, written in a voice consistent with the register. Short, specific, no
  marketing filler. Headlines under 8 words. No "Welcome to our website".
- Original imagery: commissioned photography, custom illustration, generative art, or
  your own renders. If the budget forbids it, go typographic-only rather than stock.
- Microcopy is design: button labels, form errors, empty states, loading text, 404, alt
  text, and the OG description all get the same voice.
- Case studies need real numbers, real credits, real dates.
- Proof-read in every language you ship. A typo in the hero costs Design points too.

## Craft checkpoints for Phase 0

- [ ] One-sentence concept written and testable without animation
- [ ] Register chosen; every axis answered without contradiction
- [ ] Beat list written (purpose + one visual event per beat)
- [ ] Signature moment named
- [ ] Content inventory: what copy and imagery must exist, and who makes it
- [ ] Reference set assembled — but chosen for *structure*, not for effects to copy
