# nothing here was filmed — self-score

Scored against `references/01-scoring.md` by the person who built it, which is the
weakest possible jury. Treat it as a claim with its evidence attached.

**Predicted: 7.3** — Design 7.5 · Usability 7.0 · Creativity 7.5 · Content 7.0

## Measured

Chrome against a local server with byte-range support, emulating **Fast 3G + 4× CPU**.

| Metric | Budget | Measured |
|---|---|---|
| LCP | < 1.5s | **1.52s** — 16ms over |
| CLS | < 0.05 | **0** |
| First-view transfer | < 3MB | **369 KB** |
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

## Scored

**Design ×0.40 → 7.5.** The reel is the hero: the frame takes the viewport and the type
sits under it rather than splitting the screen with it. One accent, and it means exactly
one thing — *this was generated*. Marked down because three clips is a thin body of work
for a format whose whole argument is range, and because the grid is only two columns
wide, so the index reads as a sample rather than a reel.

**Usability ×0.30 → 7.0.** CLS is a true zero, the ladder is well inside budget, only one
clip ever plays, nothing plays off screen, and the player is a real control surface with
keyboard seeking and visible focus. **LCP is 1.52s against a 1.5s budget** — over, and
recorded as over. Marked down further for the unverified list below.

**Creativity ×0.20 → 7.5.** The concept inverts the usual move: generated footage is
normally disclosed in the smallest type on the page, and here the disclosure *is* the
page — prompt, model, cost and shipped bytes printed beside every clip. The reel index
that plays is a known pattern, not an invention; the ledger is the original part.

**Content ×0.10 → 7.0.** Every prompt, cost and byte count is real and reproducible, and
the ledger is generated from the files on disk rather than typed, so a figure cannot
drift from the file it describes. But this is the one demo in the set whose imagery is
**not** from a primary source — it is model output, which is a weaker content position
than the other two, and no amount of labelling changes that. Scored accordingly rather
than given credit for being honest about it.

## Not verified

- `prefers-reduced-motion` — no emulation flag in this tooling. Written and reviewed,
  **untested**.
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
