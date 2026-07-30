# stacco — self-score

Scored against `references/01-scoring.md` by the person who built it, which is the
weakest possible jury. Treat it as a claim with its evidence attached.

**Predicted: 7.4** — Design 7.5 · Usability 7.5 · Creativity 8.0 · Content 7.0

## The signature moment

```
NAME:      The Cut
TRIGGER:   native scroll position over the film track (10.25 viewport heights)
PHASES:    nine shots — 28 / 50 / 35 / 24 / 85 / 21 / 18 / 40 / 58 mm
INPUT:     scrollY, read and mapped. The wheel is never intercepted; the
           scrollbar, the keyboard and deep links all keep telling the truth.
THE IDEA:  demo 09 is one take that had to be cut for engineering reasons, so
           it hides every seam inside a doorway. This is cut for storytelling
           reasons, so the file boundary and the artistic boundary are the SAME
           boundary — one shot, one clip, nine of each. No seam frame is
           shipped twice. There is no crossfade anywhere in the engine.
THE COST:  a dissolve gives you ~100ms in which a poster can stand in for a
           clip still arriving. A cut gives you nothing. So the lazy radius is
           asymmetric: +2.4vh forward, −0.8vh back.
THE SLATE: shot, lens, move and timecode, always on, in the black under the
           frame. It is the art direction and the accessibility surface at
           once — the same string is what the shot list announces.
AUTOPLAY:  the film runs itself at its baked 41s pace; the document really
           scrolls. Wheel, touch, arrows, click or spacebar hands control back.
FRAME:     2.39:1 scope on desktop (1920×804). The letterbox is not decoration:
           it is 27% fewer pixels per frame than 16:9, which is what paid for
           the ninth shot.
MOBILE:    a second render at 720×900 (4:5), re-framed shot by shot with its own
           field and lateral offset. Not a crop. The copy sits under the frame,
           never over it, at every width.
REDUCED:   no clip is ever fetched. Nine posters cross-dissolve — and nine
           stills with their lenses printed under them is a shot list, which is
           the concept surviving with every animation removed.
FIRST 3s:  the main title and shot 01's poster are up at 0.92s (the title is
           the first LCP candidate), the slate says SHOT 01/09 · 28 MM ·
           LOCK + PUSH, and the shot list says how many are coming.
```

## Measured

Headless Chrome against a local server. **Fast 3G + 4× CPU** for the load metrics,
five cold runs, median reported. Frame timing at 1440×900, unthrottled.
Reproduce with `render/measure.mjs {3g|scrub|auto|reduce|keys}`.

| Metric | Budget | Measured |
|---|---|---|
| FCP (median of 5) | — | **0.92s** |
| LCP, non-video candidate | < 1.5s | **0.92s** — `h1.card__word`, the main title |
| LCP, final with no input at all | < 1.5s | **5.65s** — `video.shot__clip`. See below |
| CLS | < 0.02 | **0.0105** |
| Bytes to the final LCP (Fast 3G, cold) | < 1.5MB | **741 KB** |
| Shot clip 1920×804 AV1 | < 1.2MB | **0.14–0.77 MB** |
| Shot clip 1920×804 H.264 | < 1.8MB | **0.21–1.02 MB** |
| Mobile clip 720×900 H.264 | < 0.9MB | **0.17–0.52 MB** |
| Poster AVIF (desktop / mobile) | < 60KB | **2.0–10.1 KB / 0.8–4.2 KB** |
| Whole film, AV1 ladder | — | **3.20 MB** (H.264 4.88, mobile 2.76) |
| Scrub, full sweep | 60 fps | **59.8 fps avg**, p95 21.6ms, **3.9% long** |
| Autoplay, 12s | 60 fps | **59.9 fps avg**, p95 21.4ms, **2.8% long** |

Figures for clip weights come from `ledger.json`, which is generated from the files
on disk rather than typed.

### The LCP is a `<video>`, and that is a real failure

`references/19-scroll-scrub.md` says the LCP element must be the poster or the
landing copy, **never** a `<video>`. On this page it is both, depending on how long
you sit still: the main title paints at **0.92s** and is the largest thing on screen
until the first clip arrives, at which point a 1920×804 video becomes a larger, later
candidate and takes the crown. LCP stops updating at the first user input, so anyone
who scrolls, taps or presses a key inside the first few seconds gets the 0.92s
figure; anyone who loads the page and does nothing gets 5.65s.

That is the price of a film that autoplays from the top, and demo 09 does not pay it
only because its landing card is large enough and its first clip arrives during a
shorter measurement window. The honest summary: **the rule in the reference file
holds only for a scrub film that waits for the user.** A note to that effect has been
added to `19-scroll-scrub.md`.

What *was* fixable was the 9.8s it used to be. The look-ahead is 2.4 viewport
heights, so three shots wanted loading the moment the page opened and fetched
together — the first clip then finished at 9.8s instead of the ~3.4s it needs alone.
Loading one clip at a time, nearest first, took the no-input LCP to **5.65s** and, as
a side effect nobody predicted, took scrub long frames from 8.3–10% to **3.9%** and
autoplay long frames from 4.1–4.3% to **2.8%**: the fetches were competing with the
decoder, not just with each other.

### Checks, not claims

- **Segment sequence** — nine scroll stops, desktop and portrait: at every stop the
  visible figure, the slate's shot number, the lens, the move and the timecode all
  agree. `render/page-shots.mjs`, zero page errors.
- **`prefers-reduced-motion`** — emulated, then scrolled through the whole film in
  21 steps: **0 `<video>` elements, 0 `.mp4` requests**, 9 posters loaded, autoplay
  never starts.
- **Keyboard** — Tab order is skip link → back link → the nine shot buttons →
  the transport. Enter on shot 06 scrolls the document to 5018px and the film
  agrees: slate `SHOT 06/09`, visible figure `06-incontro`. Spacebar toggles
  autoplay without scrolling the page.
- **No replayed frames on arrival** — a clip that finishes loading mid-shot seeks to
  the current scroll position before its first painted frame, and reveals on
  `seeked`, not on arrival.
- **The lens numbers are real** — `fovFor()` derives the vertical field of view from
  the focal length against a 36mm-wide frame and the shot's own aspect. The slate
  is not captioning a number nobody used.

### Measured, then removed

A decoder warm-up — `play()`/`pause()` on the next shot half a viewport-height
before its cut — was written on the theory that a cut cannot afford the long frames
a cold decoder spends on its first play. Over five autoplay runs it measured
**neutral to worse**: 4.1 / 4.1 / 4.3% long frames without it, 4.1 / 4.6 / 5.9% with —
against the pre-queue baseline, which the load queue has since taken to 2.8%.
The warm-up costs the frames it was meant to save, and the clip is already decoded
once on arrival. It is a comment in `app.js` now, not code.

## Where it loses points

- **Design 7.5.** The world is primitives and it looks it: boxes, cones and
  icosahedra under fog. The grade and the one-red rule carry it further than the
  geometry deserves, but a jury looking closely sees low-poly, and shot 06's wolf
  is a mass rather than an animal.
- **Content 7.0.** The copy is nine paragraphs about film grammar over a tale
  everyone already knows. It is real writing rather than lorem, and it is *about*
  the thing on screen — but there is not much of it, and the tale itself is
  borrowed rather than reported.
- **Usability 7.5, and the LCP is why.** The section above is not a footnote:
  a visitor who opens the page and waits gets a Core Web Vitals LCP of 5.65s. Every
  other load figure is good and the film is watchable from 0.92s, but a jury reading
  a Lighthouse run in a fresh tab sees the bad number, not the honest explanation.

## Not verified

- INP, and scrub smoothness on a physical phone decoder (the `-g 4` mobile encode is
  confirmed on a desktop GPU only)
- Safari and Firefox — the AV1/H.264 selection is `canPlayType`-driven and
  Chrome-tested only
- iOS priming — implemented from the scroll-world pattern, exercised on no real
  iPhone
- The cuts as perceived: no frame-by-frame check that shot N's last frame and shot
  N+1's first frame land on adjacent display frames under autoplay
