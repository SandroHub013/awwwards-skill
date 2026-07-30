# gate — measured, then scored

Phase 6 of the skill, run against `references/15-audit.md`. Every number below came out
of a real Chrome. Nothing here is estimated, and where a number is dominated by the
measurement method rather than by the page, it says so.

Build: `docs/demos/gate/` — 1 HTML (all CSS inline), 1 JS, 1 OG image. No framework, no
web fonts, no raster assets in the page.

---

## 1. Measured numbers

Chrome 144, `chrome-devtools-axi`, served over loopback.

| Metric | Budget | Measured | Conditions |
|--------|--------|----------|------------|
| LCP | < 1.5s | **844ms** | 390×844×3 touch, Fast 3G, CPU 4× |
| LCP | < 1.5s | **768ms** | 1440×900×2, Fast 3G, CPU 4× |
| LCP | — | **48ms** | 1200×630, unthrottled loopback |
| LCP element | — | the masthead `<h1>` (mobile: `p.blurb`) | text, as designed. The gate never covers it |
| CLS | < 0.05 | **0.0000** | both throttled runs, and 0 in Lighthouse |
| Click → next paint | INP < 100ms | **33.2ms** median / 34.7ms max | 1440×900×2, CPU 1× — this *is* the double-rAF floor |
| Click → next paint | INP < 100ms | **79.9ms** median / 106.1ms max | 390×844×3, CPU 4×; floor here is ~66ms |
| Long tasks on interaction | 0 | **0** | CPU 4× |
| Requests | — | **2** (document, script) | no stylesheet, no font, no image |
| First-view transfer | < 3MB | **34.5 KB** | document; `app.js` is 8.1 KB uncompressed |
| Lighthouse Accessibility | 100 | **100** | 0 failed audits, 49 passed |
| Lighthouse Best Practices | ≥ 95 | **100** | |
| Lighthouse SEO | ≥ 95 | **100** | |
| Console on load | clean | **clean** | no errors, no warnings |

The two interaction numbers are honest but blunt: the probe waits two animation frames,
so 33ms on desktop and ~66ms on 4×-throttled mobile are the floor of the instrument, not
the cost of the page. The real work behind both switches is a class toggle — the
`Inspect sources` disclosure has no JavaScript on it at all, it is a checkbox and a
sibling selector.

### Frame rate through the gate

The sequence is 1.26s long, so it cannot be sampled by scrolling. Instead the ledger was
re-armed and the real sequence replayed at its shipped timings (60/30/240/130/180/1260ms)
with a `requestAnimationFrame` sampler running throughout, CPU throttled 4×:

| | frames | median | p95 | worst | frames > 33ms |
|---|--------|--------|-----|-------|---------------|
| 1440×900×2 | 110 | **16.7ms** | 19.0ms | 51.4ms | 4 / 110 |
| 390×844×3 | 113 | **16.7ms** | 18.4ms | 34.9ms | 1 / 113 |

60fps sustained on both. It should be: across the whole sequence the page animates
`opacity`, `transform` and `clip-path` and nothing else. No layout is read or written per
frame, there are no scroll handlers, and the counter is seven text writes over 1.2s.

### Responsive sweep

`document.scrollWidth > clientWidth` at every width — must be false:

| 320×740×2 | 390×844×3 | 768×1024×2 | 1440×900×2 | 1920×1080×1 |
|-----------|-----------|------------|------------|-------------|
| false | false | false | false | false |

Sheet columns at those widths: 1 · 1 · 2 · 3 · 3. The ledger itself switches from a
stacked two-column row to a three-column row (number / claim / answer) at `70em`.

Tap targets under 44px on a coarse pointer, after fixes: **two**, both inline links inside
the footer colophon paragraph (WCAG 2.5.8 spacing exception applies — their neighbours are
far outside the 24px window). Every standalone control measures ≥44px. Before the fix
there were **thirteen**, including a `cv` link 14px wide; the fix grows hit boxes only and
leaves every type size untouched.

### Keyboard, motion, and the no-JS path

- Verified order: Tab 1 = skip link, Tab 2 = the `Inspect sources` checkbox, Tab 3 = the
  masthead link, Tab 4–9 = nav, Tab 10 = the theme toggle. Focus ring is his: 2px accent,
  2px offset.
- The `Inspect sources` control is a visually hidden checkbox, which would have put focus
  nowhere on Tab 2. Its ring is handed to the label the reader can actually see
  (`#inspect:focus-visible ~ .wrap .chip[for=inspect]`). It is operable by Space with no
  script at all, and `Enter` works on the theme toggle because it is a real `<button>`.
- **Skip**: `pointerdown`, `keydown`, `wheel` or `touchstart` ends the sequence
  immediately. Verified with `Escape` — verdict lands on `astro build — passes`, meter on
  `7/7 · 0 contradictions · 1 excused`, `aria-busy` back to `false`.
- **Repeat visit**: verified — with `sessionStorage['gate:passed']` set, `html.gate-armed`
  is never added, so nothing is withheld and nothing animates. The resolved page is what
  paints.
- **Reduced motion**: same path as a repeat visit, decided in the arming script in the
  head, so the page paints resolved on the very first frame.
- **No JS**: the resolved ledger, the meter, the verdict and every column are authored in
  the HTML. Withholding requires `html.gate-armed`, and only a script sets it. A 2.5s
  failsafe in the arming script also disarms the page if `app.js` never arrives, so a 404
  cannot hold content hostage.
- **Print**: the provenance blocks stop being a disclosure and print as footnotes.

### The gate checks itself

`app.js` evaluates the predicate and compares its answer against the answer authored in
the HTML, per row, including the `holds`/`excused` flag. A disagreement is the exact class
of drift the gate exists to catch, so it is reported to the console rather than silently
overwritten. Console is clean, which means all seven agree.

---

## 2. Self-score

Against `references/01-scoring.md`.

| Criterion | Weight | Score | Reasoning |
|-----------|--------|-------|-----------|
| Design | 40% | **7.5** | It is genuinely his design system, tokens and all, and the one structural move — promoting the gate to a column of its own and letting all seven verdicts stack flush — is an editorial decision, not an effect. Type has three roles and keeps them. The ceiling is honest: without Archivo Black and LedgerSerif the masthead is Arial Black, which is close in intent and a step down in refinement. |
| Usability | 30% | **8.0** | LCP 768–844ms throttled, CLS 0.0000, 2 requests, 34.5 KB, 100 on accessibility with 0 failed audits, no overflow at any width, 44px targets on touch, and four ways to skip. The intro never covers the identifying content. |
| Creativity | 20% | **7.5** | Verification as the intro, on a site whose thesis is checkable explanation, is an idea that could only belong to this site. It survives with animation removed, which is the test. It is not a spectacle, and a jury that rewards spectacle will mark it lower than one that rewards fit. |
| Content | 10% | **8.0** | Every fact is quoted from the published page, the substitutions are declared on the page rather than buried, and the count is seven because seven is what is public — where inventing eleven more would have been easy and invisible. |

**Predicted: 7.6.** Above the 7.0 target and above the Developer Award floor.

Where the honest risk sits: this is one screen. Awwwards jurors click through, and there
are no inner pages to click to — as an *intro study* that is the brief, but submitted as a
site it would be marked for thinness, not for craft.

### Anti-patterns (`references/14-anti-patterns.md`)

| Red flag | Status |
|---|---|
| Preloader that delays a fast content site | The intro *is* the concept, 1.26s, skippable four ways, and the masthead is never covered |
| Fake progress counter | The predicate is evaluated for real, seven times; the counter is the count discharged |
| Lorem ipsum / stock / placeholder | None. Zero images |
| Effects without a concept | One moment; the accent is spent entirely on it |
| Hover-only affordances | None. The only pointer state is a border colour |
| Motion without a reduced-motion story | Decided before the body parses; resolved page on frame one |
| Content hidden behind JS | Nothing. The page is complete with scripting off |
| Template smell | No framework, no component library, no default spacing |

---

## 3. What the skill drove, and where it ran out of road

**Where it drove the work.** `02-concept.md` §Art direction registers is the reason both
briefed intros were rejected rather than built: "editorial + retro-technical is two
concepts" is a rule you can apply before writing any code, and it disqualified the
terminal in one reading. `09-transitions.md` did the rest — it licenses a preloader
*only* when the intro is part of the concept, and its "show real progress, not a fake
counter" line is what turned a decorative 0→7 tween into seven comparisons that actually
run.

**Where it ran out of road.** Three findings:

1. **The skill has no guidance for building *into* an existing design system.** Every
   reference assumes a greenfield brief where you author the tokens. Here the correct move
   was to lift someone else's seven colour tokens verbatim, keep their `localStorage` key
   so a visitor's theme choice survives the trip, and reimplement their `Inspect sources`
   switch rather than invent a better one. That is a common real job — an intro, a
   campaign page, a section — and the workflow has no phase for it.

2. **`references/11-performance.md` does not warn about the cost of its own file split.**
   The starter pattern is `index.html` + non-blocking `styles.css`, which is right for a
   long scroll page and wrong for a single screen: it measured **0.085 CLS** here, because
   every column is above the fold and a stylesheet one round trip late re-measured
   `.blurb`'s line count, gave `.over` a border it did not have, and resized the strand
   headings under content that had already painted. Inlining everything took CLS to
   **0.0000** and the page to 2 requests. The rule worth adding: *split the stylesheet
   only when there is something below the fold to split off.*

3. **Nothing in the skill costs a signature moment against the fold.** The gate is a
   1.26s sequence, and its payoff is the seventh row. If row seven resolves off-screen the
   moment does not land — so the fold became a hard layout constraint that drove the
   masthead padding, the ledger's column count, the length of one paragraph, and hoisting
   two filenames out of seven rows. `05-motion.md` §Signature moment asks for trigger,
   phases, timing, fallback, mobile and reduced-motion. It should also ask: **what must be
   on screen for this to read, and at what viewport?**
