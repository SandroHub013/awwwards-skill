# soglia — self-score

Scored against `references/01-scoring.md` by the person who built it, which is the
weakest possible jury. Treat it as a claim with its evidence attached.

**Predicted: 7.5** — Design 7.0 · Usability 8.0 · Creativity 8.0 · Content 7.5

## The signature moment

```
NAME:      The Seam
TRIGGER:   native scroll position over the flight track (10.1 viewport heights)
PHASES:    gate → arch → street → passage → square → doorway → workshop
INPUT:     scrollY, read and mapped — the wheel is never intercepted. The
           scrollbar, the keyboard and deep links all tell the truth.
FRAME-LOCK: 936 frames baked from ONE camera path, cut at three doorways.
           The seam frame ships in both neighbours, so the join is not a
           transition; it is the next frame.
FALLBACK:  a clip that cannot load leaves its designed still; the journey
           survives on posters alone
MOBILE:    a second 720×1280 render at fov 55 — native portrait, not a crop
REDUCED:   no video loads at all. The stills cross-dissolve; the town is
           still there. Verified with emulated prefers-reduced-motion.
FIRST 3s:  the gate is already up with the title over it (LCP = the landing
           copy at FCP), and the route dots say how long the flight lasts
```

## Measured

Headless Chrome against a local server, **Fast 3G + 4× CPU** for the metrics,
five runs for FCP/LCP.

| Metric | Budget | Measured |
|---|---|---|
| LCP (median of 5) | < 1.5s | **1.49s** (1.28–1.54) |
| FCP (median of 5) | — | **1.49s** |
| CLS | < 0.05 | **0.0006** |
| First-view transfer (local, cold) | < 3MB | **1.0 MB** (page 32KB, poster 9KB, s0+c0 blobs) |
| First-view transfer (Fast 3G, at measure time) | < 3MB | **68KB** — clips arrive after the metric |
| Scene clip 1080p AV1 | < 1.5MB | **0.51–1.10 MB** |
| Scene clip 1080p H.264 | — | **1.09–1.56 MB** |
| Connector 1080p AV1 | — | **0.39–0.68 MB** |
| Mobile clip 720p H.264 | — | **0.51–0.86 MB** |
| Poster AVIF | < 150KB | **5.8–12.3KB** |
| Console errors (desktop + mobile drives) | 0 | **0** |

### Failures the audit found

- **The camera spent the first scouts under the piazza floor.** The street was
  written to climb 2.6m but the waypoints weren't, so the flight skimmed beneath
  the geometry it was meant to cross. The town is flat now; a hill town inside
  the walls is flat anyway.
- **Segment boundaries did not land in the doorways.** Mapping time onto one
  arc-length curve puts the cuts wherever the lengths say, not where the doors
  are. The flight is seven per-leg curves sharing seam points instead — the
  seams are exact by construction, not by measurement.
- **The workshop's window wall was rotated 90°**, leaving a room-sized hole in
  the building. Only visible from inside, which is where the whole last act
  happens. The frame that shipped in the first scout batch was mostly that hole.
- **The fountain stood on the camera path** and the campanile stood close
  enough to the church to paste its shadow down the facade. Both found by
  looking at frames, not at code — the geometry was "correct" throughout.
- **Route dots and scroll hint arrived unstyled.** Their positioning lived in
  the async stylesheet, so they rendered in flow and jumped at 1.9s: CLS 0.064,
  over budget. Positioning moved into the critical inline CSS; CLS is 0.0006.
- **The landing copy started at `opacity: 0` until the module ran**, so the
  first text painted at 2.4s on Fast 3G and that paragraph became the LCP
  element. The card now paints with the first frame; LCP = FCP, 1.49s median.
- **The full-viewport poster never registered as an LCP candidate** — same
  markup pattern as demo 03, where it does. Unexplained; noted rather than
  hidden, because the fix above is what actually lands the metric.
- **The first final frame died inside the chair.** The approach ended so close
  that the chair back filled the frame and the nearest dust motes read as
  white squares. The last two metres of the path were pulled back and the dust
  moved behind the end framing. Only s3 was re-baked; its first frame is
  untouched, so the seam with c2 still holds.

## Scored

**Design ×0.40 → 7.0.** One register held end to end: flat-shaded geometry,
one dawn, one palette, terracotta accent that means *threshold*. The gate, the
two passages and the workshop door are the same shape at four scales, which is
the design system doing the concept's work. Marked down because low-poly has a
ceiling with a design jury — the laundry, the trees and the café stools are
readable, not beautiful, and the square is emptier than a real one at dawn.

**Usability ×0.30 → 8.0.** LCP inside budget at the edge (1.49s, median of 5),
CLS 0.0006, native scroll as transport, route dots are real buttons reachable
by Tab (verified: focus, Enter, page moves 7,470px), reduced motion verified
with zero video elements in the DOM, and mobile gets its own render instead of
a crop. Clips load as blobs only near the viewport, so a slow network spends
bytes on the scene you are in. Marked down for no INP trace, no real device,
and the 9.1-viewport track, which is long even with the dots as shortcuts.

**Creativity ×0.20 → 8.0.** The technique is the concept: a one-take film that
is secretly seven clips, and every join placed where film grammar already
expects a cut — a doorway. The epilogue does not decorate the trick, it
explains it, with the segment map drawn to scale. In the set, demo 03 scrubbed
footage; this one scrubs a world.

**Content ×0.10 → 7.5.** Everything is reproducible from the repo: one scene
file, one seed (1410), one command per pass, a ledger generated from the files
on disk, and zero euros spent — the demo exists partly to prove the technique
does not require a video model. Copy is thin but real; no lorem, no stock, no
generated imagery, and the skill's own ambiguity about "real content" is
sidestepped entirely.

## Verified

- **Sequence and lazy loading** — desktop and mobile drives at nine scroll
  stops: the visible segment is the right one at every stop, clips load only
  within ±1.6 viewport heights, `has-clip` follows the first painted frame,
  zero console errors on both.
- **`prefers-reduced-motion`** — emulated: no `<video>` is ever created, the
  stills cross-dissolve through all four scenes.
- **Keyboard** — Tab reaches the route dots, Enter jumps to the scene.
- **Frame-lock** — the seam frame (e.g. frame 252) is the same PNG encoded
  into both neighbours, by construction of the render, not by hope.

## Not verified

- INP and sustained frame rate under a real trace; scrub smoothness on a
  physical phone decoder (the `-g 4` mobile encode is doctrine, not measurement)
- Safari and Firefox — the AV1/H.264 selection is `canPlayType`-driven and
  Chrome-tested only
- iOS priming — implemented from the scroll-world pattern, exercised on no
  real iPhone
- The frame-lock as perceived: no A/B flicker test at seam crossing, though
  the pixels are identical by construction
