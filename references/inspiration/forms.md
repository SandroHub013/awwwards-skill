---
site: Forms
url: https://www.forms.world/
award: https://www.awwwards.com/sites/forms
award_type: Nominee
award_date: 2026-07-26
studio: Beaucoup.
archetype: video-first studio reel
stack: [WordPress, Vite, GSAP]
verified: 2026-07-27
---

# Forms — the reel is the interface

A creative post-production house in Paris and Los Angeles. The site's answer to "what do
we do" is to play the work, immediately and everywhere: the home is a video slider, the
project index plays, and the work page is a player.

## Why it was awarded

The medium matches the subject, which is the cheapest way to earn Creativity without a
gimmick. Content carries real weight here because the content *is* the craft being sold,
and the index doubles as the showreel, so Design and Content reinforce each other instead
of competing for the same screen. The listed elements — loader, slider home, grid and
list index modes, work page player — are all in service of one decision, not four
separate effects.

## Evidence

```bash
curl -s -L https://www.forms.world/ | tr '>' '>\n' \
  | grep -ioE "wp-content|wp-json|/themes/[a-z0-9_-]*|assets/[a-z0-9._-]*\.js" \
  | sort | uniq -c | sort -rn
#   86  wp-content
#   23  /themes/beaucoup
#    4  wp-json
#    2  assets/app-DJSsHDnT.js      ← hashed bundle: Vite-built custom theme
```

Award page: Nominee, 2026-07-26, by Beaucoup. (PRO). Technology tags list GSAP and Figma.
Community votes 7.7–9.9; jury scores are not public for a Nominee, so the listed elements
are the studio's own framing, not jury commentary.

## Three transferable principles

1. **Let the medium be the interface.** When the product is motion picture, the reel is
   not a section of the site — it is the site. Worked here because a post-production house
   that hides its work behind a WebGL experiment has the concept backwards.
2. **Make the index do double duty.** Dozens of short silent loops turn a listing page
   into a showreel, so browsing and being sold to are the same action. Worked because the
   loops are pre-cut light files, not the full videos scrubbed.
3. **Client-owned content is an architecture decision, not a compromise.** A reel site is
   restocked constantly; a CMS-backed custom theme keeps craft in the build and content in
   the client's hands. Worked because the craft budget went into the theme, and the jury
   judges the browser, not the repo.

## What does not transfer

The slider-home composition, the loader's specific animation, and the grid/list toggle as
a *layout*. Those are Beaucoup's decisions for this brand. Copying the two-mode index onto
a site whose work is not visual is exactly the template smell in
`references/14-anti-patterns.md`.

## Gap check

**Real gap, closed.** Video-first sites had no coverage: encoding ladders, HLS for
long-form, preview-loop patterns, poster-as-LCP and accessible custom players were spread
thin across `11-performance.md` §Video. This dive produced `references/17-video.md`.
