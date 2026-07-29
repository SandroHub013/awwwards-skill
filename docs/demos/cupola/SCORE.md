# cupola — self-score

Scored against `references/01-scoring.md` by the person who built it, which is the
weakest possible jury.

**Predicted: 7.4** — Design 7.5 · Usability 7.5 · Creativity 7.5 · Content 7.0

## The signature moment

```
NAME:      The Closing
TRIGGER:   scroll range across the nine panels
PHASES:    setting-out → first courses → spinapesce → corda blanda →
           cutaway → chains → the ring closes → the lantern
INPUT:     native scroll position, mapped over the panels only. One
           uniform — the highest bed laid — clips both shells, all
           twenty-four ribs and all four chains, using the same cone
           rule the courses were set out with. The readout counts the
           opening down from 45.5 m to the 6 m eye, and it is measured
           off the geometry rather than typed.
FALLBACK:  no WebGL → canvas removed, the page says so, the writing and
           every number stand on their own
MOBILE:    the copy drops to a card in the bottom third, the readout
           becomes one row at the top, the lens widens and the camera
           aims lower so the dome holds the upper two thirds
REDUCED:   no loop. One composed frame at the closing, ring nearly shut,
           readouts set to match. Verified in a browser launched with
           --force-prefers-reduced-motion
FIRST 3s:  the empty octagon over Florence, 45.5 m of hole in the middle
           of it, and one line saying what the scroll does
```

## Measured

| Metric | Budget | Measured |
|---|---|---|
| Frame rate, unthrottled, at every beat | 60 | **60 fps** at 1440×900 |
| Frame rate, 4× CPU, scrolling every frame | 60 | **59 fps**, render scale dropped to 0.85 on its own |
| LCP, cold cache, Fast 4G + 4× CPU | < 1.5 s | **1.15 s** |
| CLS, load and through a full scroll | < 0.05 | **0.000** |
| Page weight, first view | < 3 MB | **236 KB** over 7 requests |
| Own code, gzipped | — | **23 KB** (three.js is the other 188 KB) |
| Draw calls | < 100 | **5** (6 with the lantern) |
| Triangles | — | **78,650**, and 36,722 on the low-end path |
| Textures | — | **0** |
| Horizontal overflow, 320–1920 px | none | **none** |
| Lighthouse a11y / best practices / SEO | — | **100 / 100 / 100**, no failed audits |

The geometry is checkable rather than drawn: feed the quinto acuto rule the documented span
of 45.5 m and it returns a rise of 33.74 m, against the ~33 m the surveys report. That
agreement is the only evidence available that the rule in the code is the rule they used,
and it is why the profile was derived instead of traced.

### Failures found while building it

- **Every solid was inside out.** `quad()` computed its normal as `u × v` and wound its
  triangles to match, so with back-face culling on, every box, the drum and the whole city
  showed the *inside of its far wall*. It still rendered — that is what made it take an
  hour — but nothing had a lit face, and the city read as flat grey slabs floating over a
  void. One sign flip in one function fixed the drum, the cathedral, the campanile, the
  roofs, the lantern and the chains at once.
- **The spinapesce was invisible.** Drawn as "suppress the bed joint of one brick", the
  course above drew the same line straight back, because its half-brick stagger put a
  different cell in the same place. A standing brick has to be its own cell spanning a pair
  of courses, drawn over the running bond, not a hole in it.
- **`modulepreload` on three.js made first paint worse.** It does collapse the request
  chain from five round trips to one, and it also compiles 600 KB of renderer before the
  browser has painted a word: 1.7 s to first paint on a throttled load. Removed in favour
  of `preconnect` plus a dynamic import fired after two frames — the writing does not need
  the renderer.
- **First paint was mostly layout.** Thirteen screens of document laid out before the first
  word appeared. `content-visibility: auto` on the reading took it from 1.6 s to 1.15 s. It
  was tried on the panels too and reverted: there it costs more per scrolled frame than it
  saves once.
- **Six of the frame-rate numbers were wrong.** The demo measured 18–24 fps for an hour and
  the shader was optimised twice against that, until the control test — an empty page in
  the same browser — came back at 58 fps. Six leftover Chrome instances from earlier audit
  runs were sharing the GPU. Closed them: 60 fps at every beat, at full resolution. Measure
  the machine before you optimise the code.
- **The camera framed by distance from the axis**, so as the dome narrowed with height the
  lens ended up five metres off a wall: three panels were unreadable close-ups of brick.
- **The corda blanda panel looked at a corner rib.** The sag is a property of the web
  *between* two ribs; the camera was pointed at 157.5°, which is exactly a rib, and the one
  thing the panel is about was hidden behind it.
- **The phone got the desktop's plaster wash**, which is a 90 %-opaque sheet over the whole
  viewport — legible copy, invisible dome. The phone layout is composed separately.
- **The white marble ribs turned black** when the structure was switched to single-sided
  during the optimisation pass: they are ribbons, not closed solids, so culling shows their
  far face.

## Scored

**Design ×0.40 → 7.5.** The register is taken from the building — lime plaster, cotto,
white marble, pietra serena for anything structural — and nothing else on the page is
coloured. Every beat is a composed shot rather than a camera on a spline, and the setting-
out arcs give the first panel something to be about before a brick exists. Marked down
because the city below is massing: at the wide shots it reads as boxes with pitched lids,
and the three tribunes are the crudest objects in the frame.

**Usability ×0.30 → 7.5.** 60 fps at every beat, 59 under a 4× CPU throttle while scrolling
on every frame, LCP 1.15 s cold on Fast 4G, CLS 0.000, five draw calls, no overflow from
320 px to 1920 px, Lighthouse 100 on accessibility with no failed audits, reduced motion
verified in a real browser, and a renderer that trades resolution for frame rate when the
machine cannot keep up. Marked down for no INP measurement, no Safari or Firefox, no
physical device, and a third-party CDN on the critical path for the visual.

**Creativity ×0.20 → 7.5.** The page performs a construction using that construction's own
rules, and both of them are load-bearing in the code rather than illustrated by it: the
profile is the quinto acuto arc, and `bedLevel` — one minus sign — is the corda blanda, so
the reveal, the brick pattern and the readouts cannot disagree about which course they are
on. The herringbone is computed per pixel, which is the only way to lay four million bricks
in 23 KB. Against that, a scroll-driven build reveal is not a new device, and the subject
has been drawn many times.

**Content ×0.10 → 7.0.** Real subject, real numbers, and a table that separates what other
people measured from what this model chose — the cone slope, the course height, the size of
the eye. The copy says plainly that this is a diagram of how the dome works and not a survey
of the building. Marked down because the sources are encyclopedic and institutional rather
than archival, and because a page about a specific building without a measured drawing of
it is a reading, not a record.

## Verified

- **Reduced motion** — Chrome launched with `--force-prefers-reduced-motion`: one composed
  frame, no animation loop (draw-call count identical after 1.2 s), readouts set to match
- **Low-end path** — a coarse-pointer viewport halves the mesh (36,722 triangles), drops the
  city, and caps the pixel ratio at 1: 60 fps at 390×844
- **Adaptive render scale** — under a 4× CPU throttle the renderer settles at 1224×765 and
  holds 59 fps, and returns to full resolution when the load lifts
- **No horizontal overflow** at 320, 390, 504, 1440 and 1920 px
- **CLS through a full scroll**, not just at load: 0.000

## Not verified

- INP, and interaction latency generally
- Safari, Firefox, and any physical device
- A GPU weaker than an AMD Radeon 610M, where the quality floor of 0.5 may not be enough
- The rise the rule returns agrees with published surveys to within a metre, but no
  measured drawing of the dome was consulted
