---
name: awwwards
description: Design and build websites to Awwwards jury standard (Site of the Day / Developer Award / Mobile Excellence). Use when the user wants an award-winning, high-craft, "agency-grade" or "awwwards-level" site; a portfolio, studio, brand, launch or landing page that must look and feel premium; a signature scroll/WebGL/motion experience; or when they ask to review, score, upgrade, or submit an existing site against Awwwards criteria. Covers concept and art direction, type and color systems, motion choreography, GSAP + Lenis scroll spines, Three.js/WebGL, page transitions and preloaders, performance budgets, accessibility, mobile excellence, self-scoring and submission.
---

# Awwwards-Standard Websites

Build sites that a working-designer jury would score **7.0+**. Awwwards is not a
style — it is a scoring system. This skill encodes that system as a build method.

## The scoring reality (memorize this)

| Criterion  | Weight | What it actually measures |
|-----------|--------|---------------------------|
| Design    | 40%    | Visual hierarchy, typography, color intent, spacing, detail consistency across *every* page |
| Usability | 30%    | Navigation clarity, speed, responsiveness, accessibility, Core Web Vitals |
| Creativity| 20%    | Concept, one unforgettable idea, original interaction |
| Content   | 10%    | Real copy, real photography, art direction integrated with content |

Thresholds: **Honorable Mention ≥ 6.5** (jury *and* user vote). **Site of the Day** =
highest of the day. **Developer Award** = SOTD sites re-scored by a developer jury, needs **> 7**.
Minimum 18 jurors, 3 outlier scores dropped, 5-day window, 3 months of eligibility from approval.

Two consequences that drive every decision in this skill:

1. **Design + Creativity = 60%, but Usability = 30% alone kills you.** A gorgeous site at
   5s load and broken on iPhone scores below a clean fast one. Usability is a *design
   constraint*, not a QA phase.
2. **You need ONE signature moment, not twenty effects.** Every recent SOTD has a single
   interaction people describe out loud. Scattered effects read as noise and cost points
   in Design *and* Usability.

## Workflow

Do not skip phases. Do not start coding at phase 3 without 0-2 written down.

### Phase 0 — Brief & concept
Establish: what is this site *about*, what is the one idea, who is the audience, what is
the emotional register (brutal / editorial / kinetic / quiet-luxury / retro-tech / organic).
Write a one-sentence **concept statement** — if the site cannot be described in one
sentence that is not "it has cool animations", it will not win.
Read `references/01-scoring.md` and `references/02-concept.md`.

### Phase 1 — Art direction system
Type scale, font pairing, color roles, grid, spacing rhythm, imagery direction, motion
language. Produce tokens *before* markup. Read `references/03-typography.md`,
`references/04-color-and-layout.md`, `references/05-motion.md`.

### Phase 2 — Signature moment
Choose exactly one hero idea and specify it precisely (trigger, phases, timing, fallback,
mobile version, reduced-motion version). Everything else in the site supports it and stays
quieter. Read `references/05-motion.md` §Signature moment.

### Phase 3 — Build
Pick the stack from the decision matrix, install the scroll spine, then build sections.
Read `references/06-stack.md`, `references/07-scroll.md`, and — only if the concept needs
3D — `references/08-webgl.md`; if the concept is video-led (reels, post-production),
`references/17-video.md`.
Starter code: `assets/templates/`.

### Phase 4 — Craft pass
Preloader, page transitions, cursor, hover states, empty/error states, focus states, 404,
favicon, OG image, copy polish. Read `references/09-transitions.md`, `references/10-interactions.md`.
This is where 6.5 becomes 7.5.

### Phase 5 — Hardening
Performance budget, Core Web Vitals, accessibility, responsive/mobile-excellence, cross-browser.
Read `references/11-performance.md`, `references/12-accessibility.md`, `references/13-responsive.md`.

### Phase 6 — Self-score & audit loop
Score the site yourself against the rubric, then *verify in a real browser* — do not
guess metrics. Read `references/15-audit.md` (runnable browser procedure) and
`references/14-anti-patterns.md`. Iterate until predicted score ≥ 7.0 and no red
anti-pattern remains.

### Phase 7 — Submission
Only if the user wants to submit. Read `references/16-submission.md`.

## Non-negotiables

These are hard rules. Violating any one of them caps the site below 7.

- **60fps sustained** on a mid-range device. Not on your machine — on a throttled one.
- **LCP < 1.5s, CLS < 0.05, INP < 100ms**, total page weight < 3MB for the first view.
- **`prefers-reduced-motion` is honoured everywhere**, with equivalent non-animated cues.
- **Keyboard operable**: visible focus, logical order, skip link, no keyboard traps.
- **Mobile is designed, not shrunk.** Hover-only interactions have touch equivalents.
- **Real content.** No lorem ipsum, no stock photography, no placeholder names, ever.
- **Design system consistency** between home and inner pages — jurors always click through.
- **No template smell.** Default theme spacing, stock hero layouts and generic component
  libraries are recognized instantly by a jury of working designers.

## Reference map

| File | Read when |
|------|-----------|
| `references/01-scoring.md` | Always. Rubric, thresholds, self-scoring sheet |
| `references/02-concept.md` | Phase 0. Concept, narrative, art direction registers |
| `references/03-typography.md` | Phase 1. Type systems, fluid scale, variable fonts, kinetic type |
| `references/04-color-and-layout.md` | Phase 1. Color roles, contrast, grid, composition, spacing |
| `references/05-motion.md` | Phase 1-2. Easing, timing, choreography, signature moment |
| `references/06-stack.md` | Phase 3. Stack matrix, versions, project setup |
| `references/07-scroll.md` | Phase 3. Lenis + ScrollTrigger, native scroll-driven CSS, pinning, horizontal |
| `references/08-webgl.md` | Phase 3, only if 3D. Three.js patterns, shaders, DOM sync, perf |
| `references/09-transitions.md` | Phase 4. Preloaders, page transitions, View Transitions API |
| `references/10-interactions.md` | Phase 4. Cursor, magnetic, hover, sound, micro-detail |
| `references/11-performance.md` | Phase 5. Budgets, CWV, asset pipeline, profiling |
| `references/12-accessibility.md` | Phase 5. A11y for motion-heavy sites, Developer Award |
| `references/13-responsive.md` | Phase 5. Mobile Excellence, touch, fluid systems |
| `references/14-anti-patterns.md` | Phase 6. Score killers, in review order |
| `references/15-audit.md` | Phase 6. Real-browser verification procedure |
| `references/16-submission.md` | Phase 7. Submission playbook and timing |
| `references/17-video.md` | Phase 3, video-led concepts. Encoding, HLS, previews, custom player |

## Reviewing an existing site

If the user asks "is this Awwwards-worthy?" or "improve my site":
1. Run `references/15-audit.md` against the live URL — measure, do not guess.
2. Score with the sheet in `references/01-scoring.md`.
3. Report per-criterion score, the 3 highest-leverage fixes, and the predicted score after
   fixing them. Be blunt about whether the *concept* is the ceiling — no amount of polish
   rescues a site with no idea.
