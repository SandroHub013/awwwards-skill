# awwwards — Claude Code skill

Design and build websites to Awwwards jury standard, and audit existing ones against the
same rubric.

Awwwards is not a visual style, it is a scoring system: **Design 40% · Usability 30% ·
Creativity 20% · Content 10%**, scored by ≥18 working designers with the 3 outlier scores
dropped. This skill encodes that system as a build method, from concept to submission.

## Install

```powershell
# junction (edits here stay live in the skill)
cmd /c mklink /J "$env:USERPROFILE\.claude\skills\awwwards" "$env:USERPROFILE\Favorites\AWWWARDS SKILL"

# or copy
Copy-Item "$env:USERPROFILE\Favorites\AWWWARDS SKILL" "$env:USERPROFILE\.claude\skills\awwwards" -Recurse
```

Then use it by asking for award-standard work ("build me an Awwwards-level site for…",
"score my site against Awwwards criteria"), or invoke `/awwwards` directly.

## Contents

```
SKILL.md                     workflow, non-negotiables, reference map
references/
  01-scoring.md              rubric decoded + self-scoring sheet
  02-concept.md              concept statement, registers, narrative spines
  03-typography.md           type systems, fluid scale, variable fonts, kinetic type
  04-color-and-layout.md     OKLCH colour roles, grid, spacing, composition
  05-motion.md               motion language, choreography, the signature moment
  06-stack.md                stack matrix, current versions, project setup
  07-scroll.md               Lenis + ScrollTrigger, native scroll-driven CSS, pinning
  08-webgl.md                Three.js patterns, DOM sync, shaders, GPU budgets
  09-transitions.md          preloaders, page transitions, View Transitions API
  10-interactions.md         cursor, magnetic, hover, sound, micro-detail
  11-performance.md          budgets, Core Web Vitals, asset pipeline
  12-accessibility.md        WCAG 2.2 AA for motion-heavy sites, Developer Award
  13-responsive.md           Mobile Excellence, touch, breakpoint discipline
  14-anti-patterns.md        score killers, in the order a juror notices them
  15-audit.md                runnable real-browser verification procedure
  16-submission.md           submission playbook, timing, thumbnail, other awards
assets/
  templates/starter/         no-build reference implementation of the doctrine
  templates/webgl-hero/      DOM-synced WebGL layer with full teardown
  checklists/pre-flight.md   printable pre-submission checklist
```

## The short version

- One concept, stated in one sentence, legible with all animation removed.
- One signature moment, with a real mobile version and a real reduced-motion version.
- LCP < 1.5s · CLS < 0.05 · INP < 100ms · 60fps sustained · < 3MB first view.
- Keyboard operable, WCAG 2.2 AA, complete with motion switched off.
- Real content. No stock, no lorem, no template.
- Measure before claiming. `references/15-audit.md` drives a real browser.

Sources: Awwwards evaluation system, FAQ, Developer Award and Mobile Excellence pages;
Awwwards case studies (Studio Freight, Trionn); Codrops; GSAP, Lenis, Three.js and MDN
documentation current to mid-2026.
