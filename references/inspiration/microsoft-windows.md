---
site: Microsoft Windows
url: https://www.microsoft.com/en-us/windows/
award: https://www.awwwards.com/sites/microsoft-windows
award_type: Nominee
award_date: 2026-07-23
studio: OFF+BRAND
archetype: big-brand immersive marketing
stack: [Next.js, React, GSAP, WebGL]
verified: 2026-07-27
---

# Microsoft Windows — immersive craft at enterprise scale

"A re-imagining of Microsoft Windows for the web. A unified, immersive, accessible design
system." A WebGL hero, scroll-driven product reveals and an interactive compare module,
shipped on a page that a very large number of people in very different conditions have to
be able to use.

## Why it was awarded

It refuses the usual trade. Enterprise marketing pages are normally either accessible and
dull or immersive and hostile; this one treats accessibility as a stated pillar of the
design system while still spending real budget on a WebGL hero. That is the harder version
of the `references/12-accessibility.md` argument, done at a scale where it cannot be
faked, and it is why Usability does not sag under the Creativity spend.

## Evidence

```bash
curl -s -L "https://www.microsoft.com/en-us/windows/?r=1" | tr '>' '>\n' \
  | grep -oiE "_next/static|next|gsap|react" | sort | uniq -c | sort -rn
#  151  _next/static     ← Next.js
#   60  next
#   13  gsap
#    4  react
```

Award page: Nominee, 2026-07-23, by OFF+BRAND (PRO). Technology tags: WebGL, GSAP, 3D,
Animation, Interaction Design. Community votes 7.0–9.9 across 15 of 21 cast. Jury scores
are not public for a Nominee; the listed elements (Hero WebGL Experience, Product Page
Reveal, Compare Module) are the entry's own framing.

## Three transferable principles

1. **A design system is what makes immersion survivable at scale.** One set of tokens and
   components lets a WebGL hero and a spec table belong to the same site. Worked here
   because the alternative — bespoke craft per page — is what makes big-brand sites
   inconsistent between the homepage and the product page, the failure
   `references/01-scoring.md` calls out under Design.
2. **Accessibility stated as a pillar changes what gets built, not just what gets fixed.**
   Naming it in the brief means the hero is designed with a reduced-motion and
   keyboard story, rather than retrofitted with one. Worked because the Developer Award
   criteria are exactly this, and retrofits are visible.
3. **An interactive module can carry the argument better than copy.** A compare module
   lets the visitor answer their own question instead of reading a claim. Worked because
   the interaction serves a decision the user was already trying to make, which is the
   test `references/05-motion.md` applies to the signature moment.

## What does not transfer

The hero scene itself, the product-reveal choreography, and the compare module's visual
design. Also the budget: this is a global brand's flagship page, and reproducing its asset
weight on a small site would blow every number in `references/11-performance.md`.

## Gap check

**No gap.** WebGL heroes are covered by `references/08-webgl.md`, scroll-driven reveals by
`references/07-scroll.md`, interactive modules by `references/10-interactions.md`, and the
accessibility-at-scale argument by `references/12-accessibility.md`. This dive correctly
produced no new reference — which is the normal outcome and the reason Step 4 of
`references/18-deepdive.md` says so explicitly.
