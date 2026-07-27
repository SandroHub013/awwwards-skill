# Deep dive — turning a winning site into a reusable idea

A procedure for dissecting an awarded site and distilling what transfers. Run it in
Phase 0, when the concept is still open, or standalone when the user asks "how did they
build that".

Output is an **idea card** in `references/inspiration/`: principles, not layouts.

## The two guards

Everything below exists to enforce these. Break either and the procedure produces a
clone machine, which `references/14-anti-patterns.md` marks as a RED disqualifier.

1. **Principles, not pixels.** What transfers is the *reasoning* — "a post-production
   house leads with motion picture because the work is the product". What never transfers
   is the layout, the palette, the easing curve, the hero composition. If a card could be
   used to rebuild the site, it is written wrong.
2. **Evidence, not assertion.** Every factual claim carries the command or URL that
   proves it. "Stack: WordPress" is worthless. "Stack: WordPress + Vite theme
   (`curl -s … | grep -c wp-content` → 86, `/themes/beaucoup`, hashed bundle)" is a fact
   a reader can re-run. This is the same rule `references/15-audit.md` applies to
   performance numbers.

## Step 1 — Collect evidence first

Never analyse from memory or from a screenshot alone.

```bash
# The award page: type, date, author, listed elements, technology tags
#   https://www.awwwards.com/sites/<slug>
# Note the award TYPE. Jury scores and comments are visible only to SOTD winners
# (references/01-scoring.md), so a Nominee's "notable elements" are the studio's own
# framing. Never write "the jury highlighted" for a nominee.

# Stack fingerprint from the shipped HTML, not from guesses
curl -s -L --max-time 30 "<url>" \
  | tr '>' '>\n' \
  | grep -oiE "wp-content|wp-json|_next/static|__nuxt|astro-|gsap|lenis|three|barba|swup" \
  | sort | uniq -c | sort -rn

# Build tool and CMS tells
curl -s -L "<url>" | grep -oE '/(themes|assets|_next|_astro)/[a-zA-Z0-9._-]+' | sort -u | head
```

Then in a real browser (`references/15-audit.md` has the full command set):

```bash
$CDA open "<url>"
$CDA network            # asset types, weights, video ladder, font hosting
$CDA screenshot ./evidence/desktop.png
$CDA emulate --viewport "390x844x3,mobile,touch" && $CDA screenshot ./evidence/mobile.png
$CDA eval "[...document.scripts].map(s=>s.src).filter(Boolean).slice(0,20)"
```

Record what you could **not** determine. A card that admits "CMS unknown, no public
tells" is worth more than one that guesses.

## Step 2 — Five axes, analysed separately

Keep the passes isolated so one strong impression does not colour the rest. Each axis
answers one question and cites its evidence.

| Axis | The question | Evidence |
|---|---|---|
| Concept | What is the site's one sentence, and does the medium match the subject? | The site itself, the copy, the award description |
| Signature moment | What is the ONE interaction? How is it triggered, and what are its mobile and reduced-motion versions? | Browser: interact, record, emulate reduced motion |
| Art direction | Type scale and pairing, colour roles, grid, spacing rhythm — as tokens | Computed styles, not eyeballing |
| Motion language | Easing family, duration bands, choreography pattern, scroll strategy | Script tags, DevTools, `07-scroll.md` vocabulary |
| Structure & content | Nav model, index pattern, page types, how content is authored and updated | Markup, CMS tells, number of routes |

For the signature moment specifically, answer the question the skill actually needs:
**would this idea survive being rebuilt with a different visual language?** If yes it is
a principle. If no it is a layout, and it does not go in the card.

## Step 3 — Write the card

One file per site, `references/inspiration/<slug>.md`, this frontmatter:

```yaml
---
site: Forms
url: https://www.forms.world/
award: https://www.awwwards.com/sites/forms
award_type: Nominee          # Nominee | SOTD | Honorable Mention | SOTM | SOTY
award_date: 2026-07-26
studio: Beaucoup.
archetype: video-first studio reel
stack: [WordPress, Vite, GSAP]
verified: 2026-07-27
---
```

Then, in order:

1. **Why it was awarded** — one paragraph, tied to the four criteria.
2. **Evidence** — the commands run and what they returned. Keep it short and re-runnable.
3. **Three transferable principles** — numbered, each one sentence of principle plus one
   sentence of why it worked *here*. Three is the cap; a card with eight has stopped
   choosing.
4. **What does not transfer** — name the layout, palette or effect that is theirs. This
   section is what keeps the card from becoming a template.
5. **Gap check** — does this site expose something the skill does not already cover? Cite
   the reference that covers it, or state that a new one is needed. Most sites expose
   nothing new, and saying so is the useful answer.

## Step 4 — Decide whether anything ships

A deep dive usually ends with **no repo change**. That is the expected outcome.

- **No gap** → the card lands in `references/inspiration/` and feeds Phase 0. Done.
- **Real gap** → open an issue naming the missing doctrine, then a PR. `17-video.md`
  exists because a deep dive found that video-first sites had no coverage; a second dive
  found a WebGL marketing site already covered by `08-webgl.md`, `07-scroll.md` and
  `10-interactions.md`, and correctly produced nothing.

If two dives in a row produce a new reference, suspect the procedure, not the sites.

## Using cards in Phase 0

Read cards for **structure and reasoning**, never for execution. The right use is
"a studio whose product is motion should lead with the reel" informing a concept
statement. The wrong use is opening a card and reproducing its grid.

Cards age. `verified:` is the date the evidence was collected — re-run Step 1 before
trusting a card older than a few months, because sites get redesigned and stacks change.

## Anti-patterns

- Writing a card from the Awwwards screenshot without opening the site.
- "The jury loved the loader" about a site whose jury scores are not public.
- Copying token values (the exact accent, the exact easing) into a card. Those are the
  studio's decisions, and reusing them is the template smell in `14-anti-patterns.md`.
- Cards longer than a page. If the analysis needs more room, it is a reference, not a card.
- A card with no "what does not transfer" section.
- Treating an Honorable Mention or Nominee as a Site of the Day. Award type changes how
  much weight the example deserves.
