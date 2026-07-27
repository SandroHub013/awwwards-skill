# The Awwwards scoring system, decoded

## Official mechanics

- Four criteria, fixed weights: **Design 40%, Usability 30%, Creativity 20%, Content 10%**.
- Scored 0–10. Minimum **18 jury members** per site; the **3 scores furthest from the
  average are dropped automatically** — outlier love and outlier hate both get removed.
  *Implication: you cannot win on one juror falling in love. You win by having no juror
  find a reason to mark you down.*
- **Honorable Mention**: jury score ≥ 6.5 **and** user score ≥ 6.5 (two independent votes).
- **Site of the Day**: highest scored site of the day. Voting window is 5 days, but a site
  can win earlier with a high jury score plus ≥ 10 PRO user votes.
- **Eligibility**: 3 months from approval to win SOTD. Approval itself takes up to a week.
- **Site of the Month**: shortlist of the month's SOTD winners, re-judged.
- **Site of the Year**: from the monthly winners.
- **Developer Award**: every SOTD winner is re-evaluated by a *developer* jury against the
  Developer Guidelines; **score > 7 earns the award**. Focus: quality code, interoperability
  across browsers and devices, responsive optimization, accessibility for users with visual
  or hearing impairments, legacy-browser adaptability, "pushing technological boundaries
  without excluding the masses". Performance, SEO and accessibility are explicitly part of it.
- **Mobile Excellence**: judged on mobile-specific optimization; treat Google's mobile
  guidelines as the floor, not the target.
- **Honors**: additional recognitions by discipline (typography, e-commerce, product, etc.).
- Jury scores are visible **only to SOTD winners**. A failed submission is public record.
- Pre-made templates are rejected. Template *demos* are allowed if design and development
  are fully original.
- Once a submission is under review, it cannot be edited. Ship the final site first.

## What each criterion actually rewards and punishes

### Design — 40%
Rewards: deliberate visual hierarchy; a real type system (scale, weights, measure, rhythm);
color used with intent and restraint; generous, *consistent* spacing; hover/focus/active
states designed rather than defaulted; the same design language on inner pages, forms and
footers; alignment discipline; considered detail at every zoom level.

Punishes: stock photography; default component-library look; inconsistent design tokens
(three greys, four radii, five shadows); homepage polish with an unstyled inner page;
text placed on images without contrast control; misaligned baselines; arbitrary spacing.

### Usability — 30%
Rewards: obvious navigation and orientation; fast first paint; smooth 60fps interaction;
responsive design that was *designed* for each breakpoint; accessible contrast, focus,
keyboard and reduced-motion; predictable scroll; readable body copy.

Punishes: 5s+ loads; scroll-jacking that fights the user; hidden or ambiguous navigation;
tiny tap targets; hover-only affordances on touch; layout shift; motion sickness triggers;
anything that requires a tutorial.

This is the criterion that quietly eliminates the most beautiful sites. It is 30% and it is
objectively measurable, so jurors apply it without mercy.

### Creativity — 20%
Rewards: an idea. Concept-driven design where the interaction expresses the subject;
unconventional but learnable interaction patterns; craft in an unexpected place;
3D/WebGL/audio *when it serves the concept*; one signature moment.

Punishes: novelty without meaning; effects copied from last month's SOTD; risk that
degrades the experience; "creative" that is really just "hard to use".

### Content — 10%
Rewards: real copy with a voice; original photography, illustration or motion; content and
design authored together; considered microcopy (labels, empty states, errors, alt text).

Punishes: lorem ipsum, Unsplash, "Lorem Studio", placeholder names, a portfolio with three
identical fake case studies.

Only 10% of the score, but content is what makes Design and Creativity legible. Fake content
drags all four numbers down at once.

## Self-scoring sheet

Score each row 0–10, honestly and pessimistically. Multiply and sum.

```
DESIGN (×0.40)
  [ ] Type system: scale, pairing, measure, rhythm, optical sizing
  [ ] Color: roles defined, contrast verified, restraint shown
  [ ] Layout: grid discipline, alignment, generous consistent spacing
  [ ] Detail: hover/focus/active/loading/empty/error states all designed
  [ ] Consistency: inner pages, forms, footer, 404 match the home page
  [ ] Craft: nothing looks accidental at any viewport

USABILITY (×0.30)
  [ ] Navigation obvious in <3s, orientation always clear
  [ ] LCP < 1.5s / CLS < 0.05 / INP < 100ms (measured, not guessed)
  [ ] 60fps sustained under CPU throttle 4x
  [ ] Mobile designed, touch targets ≥ 44px, no hover-only affordance
  [ ] Keyboard: focus visible, order logical, skip link, no traps
  [ ] prefers-reduced-motion honoured with equivalent cues
  [ ] Body copy readable: size, measure, contrast ≥ 4.5:1

CREATIVITY (×0.20)
  [ ] One-sentence concept exists and the site expresses it
  [ ] One signature moment, memorable and describable
  [ ] Interaction is original, not this season's trend copied
  [ ] Risk taken serves the user, not the reel

CONTENT (×0.10)
  [ ] Real copy with a voice, proof-read
  [ ] Original imagery/motion, art-directed
  [ ] Microcopy considered everywhere, including alt text
```

Interpretation:

| Predicted | Meaning |
|-----------|---------|
| < 6.0 | Not submittable. Concept or craft problem, not a polish problem. |
| 6.0–6.4 | Close to HM. Find the two lowest rows and fix them. |
| 6.5–6.9 | Honorable Mention territory. |
| 7.0–7.5 | SOTD contender. Developer Award possible if the dev rows are clean. |
| > 7.5 | Strong SOTD / SOTM contender. |

Be harsh. A juror spends 60–120 seconds on the site, on their own machine, at their own
window size, with their own connection. Anything that requires ideal conditions is a
loss condition.
