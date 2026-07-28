# nothing here was filmed — self-score

Scored against `references/01-scoring.md` by the person who built it, which is the
weakest possible jury. Treat it as a claim with its evidence attached.

**Predicted: 7.6** — Design 7.5 · Usability 7.5 · Creativity 8.0 · Content 7.0

## The signature moment

```
NAME:      The Transport
TRIGGER:   scroll range over the pinned hero scene
PHASES:    frame 0, clip 1  →  scroll  →  frame 434, end of clip 3
INPUT:     native scroll position, mapped. The page scrolls exactly as far as
           it was pushed; the wheel is never intercepted. Three clips are one
           18s 1920x1080 file with a keyframe every half-second, so the page
           lands anywhere in a few decoded frames.
FALLBACK:  no JS, or a browser that will not seek → an ordinary muted loop
MOBILE:    same mapping on native touch scroll, shorter pin distance
REDUCED:   no pin, no scrub. The scene collapses to a 16:9 poster and the
           three cards carry the reel. Verified, not assumed.
FIRST 3s:  the poster is already the LCP element, and a chapter label,
           timecode and progress rule read as a transport rather than décor
```

The first version of this page had no signature moment — it implemented the
doctrine's checklist and left the video looping in a box. That is the difference
between a page that satisfies a rubric and one that is worth looking at.

## Measured

Chrome against a local server with byte-range support, emulating **Fast 3G + 4× CPU**.

| Metric | Budget | Measured |
|---|---|---|
| LCP | < 1.5s | **1.45s** |
| FCP | — | **0.82s** |
| CLS | < 0.05 | **0** |
| First-view transfer | < 3MB | **1.62 MB** |
| Scrub film — 18s, **1920×1080**, 24fps | < 2MB reel-page | **1.57 MB** |
| Hero loop 1080p (AV1) | < 1.5MB | **258 KB** |
| Hero loop 1080p (H.264) | < 1.5MB | **1.10 MB** |
| Card preview 480p | < 400KB | **102–238 KB** |
| Poster AVIF | < 150KB | **13–37 KB** |
| Lighthouse Accessibility | 100 | **100** |
| Lighthouse Best Practices | ≥ 95 | **100** |
| Lighthouse SEO | ≥ 95 | **100** |
| Touch targets | ≥ 44px | **44px** |

Source footage was 4.5–8.4 MB per clip. The ladder ships **1.05 MB of 1080p AV1 for all
three**, which is the difference between a reel that loads and the 50 MB hero MP4
`17-video.md` calls the most common blown budget on video-first sites.

### Failures the audit found

- **The video was the LCP element, at 3.39s.** A `<video>` with only a `poster`
  attribute has its first paint attributed to the video, not the poster, so a
  976,000px² element became the LCP. Replacing it with a real preloaded `<img>` that the
  video fades in over moved LCP to **1.52s** on the poster.
- **Deferring the video was not enough on its own** — that alone made LCP *worse* (2.21s
  → 3.39s) because the video still won the size comparison once it arrived. Both changes
  were needed, and measuring after each one is what showed it.
- **Play and scrub fought each other.** The card loop played *and* seeked to the pointer
  simultaneously; the progress bar read 70% while the clip sat at 13%. They are
  alternatives: it now plays on entry and hands control over on a deliberate move.
- **`requestVideoFrameCallback` deadlocks on a paused video.** It only fires when a frame
  is presented, and a paused clip presents none, so the first scrub seek never ran.
  Swapped for `requestAnimationFrame`.
- **Mutating `.preload` on a live element resets `currentTime`.** It re-runs resource
  selection and threw away the seek the pointer had just made.
- **Touch buttons were 19px** against a 44px floor.
- **The `<link rel="preload">` pointed at the wrong poster.** After the hero became
  the scroll-driven film, the preload still fetched the old clip's poster at high
  priority, so the actual LCP image was competing with a file nothing displayed.
- **Render-blocking CSS was the whole of FCP.** On Fast 3G the HTML→CSS round trip put
  first paint at 1.56s with the poster landing 32ms later. Inlining the first screen's
  CSS took FCP to **0.82s**; re-encoding the poster from 19.6 KB to 11.8 KB took LCP
  under budget.
- **The scrub film shipped at 960×540 and looked it.** It was encoded all-intra — every
  frame a keyframe — on the assumption that scrubbing needs instant access to any frame.
  It does not: `17-video.md` prescribes `-g 12`, a keyframe every half-second, and
  seeking within a GOP costs a few decoded frames on hardware. All-intra cost roughly
  four times the bytes, which was then paid for by dropping resolution — trading the one
  thing a full-bleed film needs. At `-g 12` the same 18 seconds ship at **1920×1080, 24fps,
  1.57 MB**: full resolution, full frame rate, and *smaller* than the soft 960×540 file
  it replaced. Seek accuracy is unaffected — measured drift is 0.01% at every position.
- **A `<video>` in the DOM is an LCP candidate even when it cannot be seen.** Once the
  film was 1080p it outranked the poster it sits on and took LCP to 3.32s. `opacity: 0`
  did not stop it. `visibility: hidden` did not stop it. The element is now built in JS
  and left **detached** until the first scroll — not existing is the only reliable way to
  not be a candidate, and before anyone scrolls the poster is the correct frame anyway.

## Scored

**Design ×0.40 → 7.5.** The reel is the hero: the frame takes the viewport and the type
sits under it rather than splitting the screen with it. One accent, and it means exactly
one thing — *this was generated*. Marked down because three clips is a thin body of work
for a format whose whole argument is range, and because the grid is only two columns
wide, so the index reads as a sample rather than a reel.

**Usability ×0.30 → 7.5.** CLS is a true zero, LCP is inside budget, and the pin is
`position: sticky` mapping native scroll rather than a wheel handler — the page moves
exactly as far as it was pushed, which is the difference between scroll-*driven* and
scroll-*jacked*. The pinned scene carries a chapter label, a timecode and a progress
rule, which the reference names as the single detail that converts "scroll-jacking"
complaints into "considered pacing". Reduced motion is now **verified**, not assumed.
Marked down for the remaining unverified list: no INP measurement, no real frame-rate
trace, and no Safari.

**Creativity ×0.20 → 8.0.** Two ideas, and they reinforce each other. The disclosure is
the page: prompt, model, cost and shipped bytes printed beside every clip, where a reel
normally hides all four. And the scroll bar is the film's transport — three clips are one
1920×1080 file, so the reel is not something you watch but something you run. It also
completes the set: in demo 01 scroll straightens type, in 02 it is depth, here it is time.

**Content ×0.10 → 7.0.** Every prompt, cost and byte count is real and reproducible, and
the ledger is generated from the files on disk rather than typed, so a figure cannot
drift from the file it describes. But this is the one demo in the set whose imagery is
**not** from a primary source — it is model output, which is a weaker content position
than the other two, and no amount of labelling changes that. Scored accordingly rather
than given credit for being honest about it.

## Verified

- **`prefers-reduced-motion`** — Chrome launched with `--force-prefers-reduced-motion`.
  The scene collapses to a 16:9 poster, the film element and the transport are removed
  from the DOM rather than hidden, no video plays anywhere, and the cards and ledger are
  intact. Nothing scrolls past a frozen frame for three viewport heights.

## Not verified

- INP, and sustained frame rate under a real trace
- Safari and Firefox: the AV1 sources and the H.264 fallback chain are **Chrome-tested
  only**. Safari has no AV1 on older hardware and should land on the H.264 source, but
  that path has not been exercised on a real Safari.
- Any physical device; all mobile checks are emulated
- Fullscreen was wired but not exercised in an automated pass

## A note on the footage

Three clips, not four: the fourth job was rejected for insufficient credit after
$6.06 had been spent, and the page says three because three is what exists. The obvious
temptation was to write "four" in the eyebrow and hope nobody counted.
