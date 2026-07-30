# gate — Phase 0-2, written before any markup

An **intro sequence** built for a real, existing site:
[Ionel Eduard STAN, Ph.D.](https://eduardstan.github.io/) — Assistant Professor (RTD/A),
Intelligent Sensing Laboratory (ISLab), DISCo, University of Milano-Bicocca. Formal
explainable AI, interval temporal logic, neuro-symbolic learning.

**This is a build study, not a commissioned site.** The design language, the copy and the
facts belong to him; this reconstructs his first screen so an intro has somewhere real to
land. Substitutions are declared under *Content honesty*.

---

## Phase 0 — Brief & concept

### Reading the source before proposing anything

The brief arrived with two candidate intros — a Linux terminal that types code and boots,
and an academic paper that flips to the page you are on. Both were rejected, and the
reasons are the concept:

The site is **not** a dev portfolio and **not** a paper. It is a **broadsheet of record**.
Archivo Black masthead over Ledger Serif columns, a dateline, three-column sheet, `label`
chips, `#f4f5fa` record blocks. And it has an idea most academic sites do not:

- Every claim on the page carries the file it was read out of — `content/cv.yaml ·
  profile.bio.long`, `content/publications.bib`.
- There is an **Inspect sources** switch in the chrome that reveals those provenance blocks.
- The footer prints a **consistency gate**: *1 check · 18 comparisons · 0 contradictions ·
  1 excused*. A contradiction **refuses `astro build`**.

So the site's own thesis is his research thesis: *an explanation is worth nothing unless it
can be checked*. That is what the intro has to be about.

| Rejected | Why it loses points |
|---|---|
| **Terminal boot** | Register clash. There is no monospace on that site except in a functional label role, and `references/02-concept.md` §Art direction registers is explicit that editorial + retro-technical is two concepts. It is also the single most templated intro on the web (`14-anti-patterns.md`), and generic: his artifacts are Julia packages on DROPS, not shell scripts. Worst, typing is slow — you cannot type a masthead in under 2s without it reading as fake delay, and the masthead is the LCP element. |
| **Paper page-turn** | Right register, wrong object — a newspaper is not a paper, and his page is set as a newspaper. Skeuomorphic page curl costs texture or a shader for a gesture that says "an academic, generically" rather than "this academic". Every researcher's site could use it; nothing in it is his. |

### Concept statement

> This site is about a researcher whose subject is explanation you can check, and its intro
> feels like a proof discharging, because the page is not *loaded* — it is *verified*: the
> masthead is already set, and everything under it is withheld until seven date comparisons
> discharge against the files the facts were read out of.

Removing every animation leaves the idea intact: the resolved ledger of seven comparisons
stays on the page as permanent content, in a broadsheet column of its own, and still says
*this page carries its own audit trail and its build refuses a contradiction*. The test in
`references/02-concept.md` §The concept statement — passed.

### Axes (no contradictions)

| Axis | Decision |
|------|----------|
| Structure | **Reveal**. `09-transitions.md` allows a preloader only when assets cannot stream **or the intro is part of the concept** — this is the second case. One screen, no scroll dependency, ~1.6s. |
| Pacing | Fast and dense. This is a broadsheet: density is the register, not air. |
| Type | Editorial with a functional mono. His three roles kept exactly: heavy grotesk display, serif text, mono for the record. Mono never decorates. |
| Color | His seven tokens, unchanged, both themes. The accent means exactly one thing here: **a machine-checked claim**. Nothing else on the page is allowed to use it. |
| Imagery | Typographic only. Zero raster in the page (the OG card is a capture *of* the page). |
| Motion | Mechanical and stepped — a hairline drawing, a tabular counter incrementing, a value snapping into place. One easing family, no overshoot: a proof does not bounce. |
| Sound | Absent. |
| Signature | **The Gate.** |

### Beat list

| # | Beat | Purpose | One visual event |
|---|------|---------|------------------|
| 0 | Masthead set | The name is not what is in question. Painted final at first frame, so LCP is a text node at ~0s and nothing below it can shift | No motion at all |
| 1 | The ledger declares | Seven claims appear as the *entries* they were read from, with their answer tracks empty | Rows rise 6px, 30ms stagger, all mono |
| 2 | The gate runs | The signature moment | Per row: a hairline draws across the answer's own track, then the resolved value takes its place; the counter increments for real |
| 3 | The excusal | The honest beat — one comparison does not hold | Row 7 holds the accent, prints `excused`, and states its reason instead of hiding it |
| 4 | Verdict | `astro build` is allowed to proceed | The meter reaches 7/7, the verdict line sets |
| 5 | The page is granted | Consequence made visible: this content exists *because* the gate passed | Columns 2–3 and the footer unmask together in one 320ms move — opacity and clip only, never layout |

### The counter is real

`09-transitions.md`: *show real progress, not a fake counter*. It would have been easy to
tween `0 → 7` and call it a gate. Instead `app.js` ships the seven comparison pairs as data
and actually evaluates the predicate his gate uses —

> an announcement date must fall in the year of the fact it hangs on, or the year before it
> (invited in N−1 to serve at the N edition)

— once per row, in order, and the counter is the count of comparisons that have genuinely
been discharged. The `excused` verdict on row 7 is a real result, not a scripted beat: the
Frontiers appointment is dated *Mar 2024–Present* and was announced *2025-03-03*, so
2025 ∉ {2023, 2024} and the predicate fails. His own footer excuses it, with the reason
(announced a year later, when the special issue launched). Both dates are correct and both
are printed.

Faking that would have been the one unforgivable thing to fake on this particular site.

### Content honesty (the constraint that shaped the build)

- **Seven comparisons, not eighteen.** His gate reports 18 over the full `content/cv.yaml`
  and `content/publications.bib`, which are not public. Seven are the ones whose *both*
  halves are visible on the published page — a fact carrying a year, and a `Lately`
  announcement carrying a date. Inventing eleven more records to reach his number would be
  fabrication dressed as craft, on a site whose entire point is that a claim names its
  source. The meter says seven and the record block says why.
- **No webfonts.** Archivo Black and LedgerSerif are served from his origin; this study
  does not redistribute them. Display falls to `Arial Black`/`Segoe UI Black` (a defensible
  stand-in — same industrial grotesk intent), text to `ui-serif`/Palatino/Georgia, mono to
  `ui-monospace` with `Go Mono` named first in case it is installed. Zero font requests,
  zero swap-CLS. The substitution is declared on the page, not just here.
- **No portrait.** His `/media/portrait.jpg` is his photograph. Omitted rather than hotlinked.
- Every value in the ledger, every stat, every service row and every `Lately` item is quoted
  from the published page. Nothing is rounded, invented or "improved".

---

## Phase 1 — Art direction system

Tokens are **his**, lifted verbatim from `_astro/BaseLayout.*.css` so the intro is in his
design system rather than near it:

| Role | Light | Dark |
|---|---|---|
| `--page` | `#fff` | `#0a0a0a` |
| `--ink` | `#0a0a0a` | `#ededed` |
| `--muted` | `#565656` | `#9c9c9c` |
| `--rule` | `#cbcbcb` | `#333` |
| `--hair` | `#d9d9d9` | `#282828` |
| `--record` | `#f4f5fa` | `#101218` |
| `--accent` | `#1231d6` | `#8aa5ff` |

Also carried over: `font-feature-settings:"tnum" 1` (his body sets it, and the ledger needs
it), body line-height 1.55, the 2px accent `:focus-visible` ring at 2px offset, and the
`[data-theme]` attribute contract with the same `localStorage` key `theme` — so a visitor
arriving from his site keeps their choice.

- **Grid**: `--measure: min(100% - 2×gutter, 1180px)`; the sheet is three columns at
  `70em`, two at `46em`, one below, and the gate takes the widest track (`1.9fr`). At
  `70em` the ledger itself becomes three columns — number, claim, answer — so all seven
  verdicts stack flush and each row costs one line instead of two. Below that they
  stack, which is the base layout, not a fallback. Broken deliberately once: the meter
  rule runs the full column width, past the text measure.
- **Type scale**: fluid `clamp()`, ratio ~1.3. Roles: `display / h2 / body / small /
  label / mono`. No ad-hoc sizes.
- **Motion**: `--dur-fast .18s`, `--dur-row .18s`, `--dur-base .32s`;
  `--ease-out cubic-bezier(.22,1,.36,1)`, and a *linear* curve for the hairline draw —
  a measurement should advance at a constant rate.
- **One stylesheet, inline.** There is no `styles.css`. Splitting one off cost 0.085 CLS,
  because every column here is on the first screen and a stylesheet one round trip late
  re-measured content that had already painted. See `SCORE.md`.

## Phase 2 — Signature moment

```
NAME:        The Gate
TRIGGER:     Page load. It is beat 0, not a separate screen: the masthead is already
             final behind it and never moves.
PHASES:      A: seven rows appear 30ms apart, each showing the entry a claim was read
             from in mono, with an empty answer track and a meter reading 0/7. → B:
             from 240ms, one row every 130ms — a hairline draws across the answer
             track in 180ms (linear) while the row number takes the accent, the
             predicate is evaluated for real, then the answer takes the track and the
             counter increments. → C: row 07 fails the predicate, holds the accent and
             prints `excused` with its reason. → D: meter reads 7/7 · 0 contradictions ·
             1 excused, verdict sets to `astro build — passes`. → E: columns 2–3 and
             the footer unmask together over 320ms.
DURATION:    Last comparison discharges at 1.20s, gate settles at 1.26s, page complete
             at ~1.58s. Hard cap enforced in code at 1.9s.
             Repeat visit (sessionStorage `gate:passed`): nothing runs at all — the head
             script never arms, so the resolved page is what paints.
INPUT:       None required. Skippable by *anything*: pointerdown, keydown, wheel, touch.
             Skip jumps to the final state instantly; it never re-runs.
FALLBACK:    No JS → every row is authored in its resolved state in the HTML and the
             sheet is unmasked by default. Nothing is withheld unless `html.gate-armed`
             is set, and only a script sets it. So the concept survives with JS
             disabled: you get the audit trail without the audit happening in front of
             you. A 2.5s failsafe in the arming script also disarms the page if `app.js`
             never arrives, so a 404 cannot hold the content hostage.
MOBILE:      Same mechanism, same durations. Columns stack, gate first. Rows go to a
             two-line stack with 44px minimum height, mono steps down one size. No
             hover-gated anything — the only pointer affordance is the record disclosure,
             which is a real checkbox and works by tap and by keyboard.
REDUCED:     Final state at first frame, one 150ms opacity fade on the sheet. The counter
             shows 7/7 · 1 excused, every row shows both its path and its value, so no
             information exists only inside the animation.
FIRST 3s:    48ms masthead painted (measured — it is the LCP element); 0.06s ledger
             declares; 0.24–1.20s the gate runs visibly one row at a time; ~1.58s page
             complete. Nothing the visitor asked for is hidden: the identifying content
             is never covered, and any input ends the sequence.
```

Everything else stays quiet on purpose: one reveal pattern, no cursor, no parallax, no
scroll effect. The accent is spent entirely on the gate, which is why the gate reads.

---

## What this exercise is measuring

The build is also a test of the skill against a source that is *already good* — a site with
a real concept, not a template to rescue. Findings are in `SCORE.md`.
