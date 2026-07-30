# miliario — Phase 0-2, written before any markup

The first horizontal demo in the set, and the counter-argument to the percentage
progress bar: **this site is the Via Appia from Rome to Brindisi, walked
horizontally** — vertical scroll moves the road under your feet, and progress is
measured in Roman miles on stone milestones, never in percent.

Subject: the **regina viarum**, 312 a.C. → Brundisium, 563 km circa.

---

## Phase 0 — Brief & concept

### Why a road, and why this one

Every demo in the set measures scroll somehow; all of them measure it in the
browser's units (percent, seconds, depth). The Via Appia had its own unit and
its own instrument: the *mille passus*, one thousand double paces, and the
*miliarium*, a stone cylinder planted every mile with its number cut into it.
A site that is a road can therefore make its progress indicator out of the
subject itself — the HUD is a milestone, the route line is an itinerary, and
"how far have I read" and "how far have I walked" become the same question.

The Appia is the right road because it is the canonical one: first to bear its
builder's name, called *regina viarum* by Stazio, with real, datable events
along its whole length — Appio Claudio in 312 a.C., Orazio's journey in 37
a.C., the crucifixions of 71 a.C., Traiano's cut at Tarracina, the terminal
columns at Brindisi, one of which stood until 1528.

### Concept statement

> This site is the Via Appia walked sideways: scroll lays the road under your
> feet one-to-one, and the milestones — not a scrollbar — tell you where you are.

The strip-everything test: with every animation removed, what survives is a
carta-coloured itinerary — ten named stops with real distances and real facts,
a drawn road, and mile numbers. A Roman itinerarium, which is a thing that
existed. Passed.

### Techniques this demo claims (unused by the rest of the set)

1. **Horizontal scroll as spine** — vertical scroll drives a horizontal track
   (desktop); a native sideways swipe drives it on touch.
2. **Drag/swipe as primary input** — on coarse pointers the journey *is* a
   horizontal `overflow-x` scroller with mandatory snap, per
   `references/07-scroll.md` §Horizontal scroll.
3. **Parallax layers** — horizon hills at 0.15×, aqueducts and umbrella pines
   at 0.45×, foreground tombs at 0.75×, the road at 1.0×.
4. **SVG path-drawing as a live element** — la Tabula, a route line whose
   `stroke-dashoffset` is tied to journey progress.

Register: **editorial-organic** — warm, archaeological, printed-atlas. The set
already owns dark-tech; this one is paper, travertine and basalt.

---

## Phase 1 — Art direction

### Tokens

```
--carta      #f2ecdf   page / sky — the paper
--inchiostro #26241f   text, road basalt
--rosso      #a0341f   Pompeian red — accent only: numerals, rules, active dot
--travertino #d9cfba   secondary surfaces, milestone stone, HUD tablet
--pino       #3f5138   umbrella pines, vegetation silhouettes
dusk (interludio scuro, km ~140–215):
--bg #211f1a  --ink #e8e0cd  --muted #a99f8a  --rosso #c05a3a  --line #4a453a
```

Type: **Cinzel** (lapidary caps, letterspaced) for titles, stop names, mile
numerals; **Spectral** for body; the house mono stack
(`ui-monospace, "SF Mono", "Cascadia Mono", …`) for HUD/Tabula data.
Self-hosted woff2 latin subsets in `fonts/` (93 KB total, OFL), Cinzel
preloaded, `font-display: swap`, serif fallback so swap is near-instant at
that size.

### The honest-map rule

Panels are placed along the track **in proportion to the real distances**:
Ariccia sits at 26/563 of the journey, Venusia at 410/563. The long empty
stretch between Beneventum and Venusia is long on screen too — and that is
where the two interludes live. The road canvas translates exactly 1:1 with
the track: the road is ground truth, and a milestone painted at mile *m*
passes under the viewport exactly when the HUD reads *m*.

### Budgets

| Asset | Target |
|---|---|
| Total page weight (fonts + code, zero images) | < 250 KB |
| Fonts | < 100 KB |
| LCP element | the hero title (text) |
| Canvas DPR | ≤ 2 desktop, ≤ 1.5 coarse |
| Requests | ≤ 8 |

---

## Phase 2 — Signature moment

**LA STRADA.** A ~30vh band spanning the viewport: procedurally drawn basalt
polygonal slabs (basoli, slightly crowned to drain — as the real ones were),
generated from a seeded RNG (seed 312), translated 1:1 with journey distance.
Every tenth Roman mile a stone milestone passes, inscribed with its number in
Roman numerals. A fixed stone-tablet HUD (bottom-left) shows MP in numerals +
km, always computed from scroll position. La Tabula (top) draws the route.

| | |
|---|---|
| Trigger | scroll position — the road is the scrub head |
| Phases | track → road → parallax → HUD → Tabula, one rAF loop, one progress value |
| Input | wheel/keys (desktop), sideways swipe with snap (touch) |
| Mobile | native `overflow-x` + `scroll-snap-type: x mandatory`; HUD/Tabula read the horizontal scroller |
| Reduced motion | no smoothing, no parallax, no basoli zoom; HUD, Tabula and dusk still live |
| Fallback | no-JS: panels stack as a readable itinerary; Tabula drawn in full |
| First 3 s | hero `REGINA VIARUM` over the road leaving Rome, cue "Scorri per camminare" |

Sub-moments: **basoli zoom** (near km 340 the camera pushes into the paving
until it fills the frame), **dusk** (km ~140–215 the palette crosses to night
for the 71 a.C. beat, then back to day).

### Beat list

| # | km | beat | event |
|---|---|------|-------|
| 1 | lead | Hero — REGINA VIARUM, 312 a.C. | road + Tabula establish |
| 2 | 0 | Partenza — Porta Appia | milestone MP I on the road |
| 3 | 26 | Ariccia | |
| 4 | 64 | Forum Appii | |
| 5 | 104 | Tarracina | |
| 6 | 138 | Formiae | |
| 7 | 168 | Interludio scuro — 71 a.C. | dusk palette crossfade |
| 8 | 196 | Capua — end of the 312 a.C. tract | |
| 9 | 264 | Beneventum | |
| 10 | 340 | Interludio basoli | paving zooms to fill frame |
| 11 | 410 | Venusia | |
| 12 | 498 | Tarentum | |
| 13 | 563 | Brundisium — arrival, columns, colophon line | Tabula fully drawn |
| 14 | flow | Colophon — itinerarium table, credits, tech note | normal document |

All figures from the itinerary are marked *circa*. MP numerals are computed in
code from km (1 mille passus = 1.478 km; 563 km ≈ MP CCCLXXXI) — the numerals
in the static HTML are verified against the same function.
