# Scroll-scrub — the camera flight as the site

For sites whose concept IS a continuous take: the scroll bar is the film's transport,
and the page is one unbroken camera move through places. Reference build: demo 09
(`docs/demos/soglia/`) — a flight through a hill town, seven clips cut at three
doorways, measured numbers throughout this file are from that build. The segment
pattern (dive/connector interleave, blob-loaded clips, seek coalescing, iOS priming)
is adapted from [oso95/scroll-world](https://github.com/oso95/scroll-world) (MIT);
the budgets, the fallback rules and the engine doctrine are this skill's own.

If video plays a supporting role on the site, you want `references/17-video.md`
instead. This file is for when the film *is* the page.

## The doctrine

1. **The flight is the concept, or don't build it.** A camera move across a content
   site is scroll-jacking with better assets. If the one-sentence concept statement
   (Phase 0) is not the flight itself, stop here.
2. **Native scroll is the transport.** Read `scrollY` and map it; never intercept the
   wheel. The scrollbar, the keyboard and deep links keep telling the truth — this is
   what separates scroll-*driven* from scroll-*jacked* (`17-video.md` §anti-patterns).
3. **Every seam is a doorway.** One take, cut where film grammar already expects a
   cut: a threshold, a dark passage, a forward move. The last frame of clip N and the
   first frame of clip N+1 are the same pixels *by construction of the asset*, not by
   crossfade. A dissolve can hide a bad seam for two frames; it cannot make the join
   mean something.
4. **The still is the LCP; the clip is a progressive enhancement.** Each segment has
   a designed poster that carries the scene alone. The video arrives later, near the
   viewport, and reveals only after its first painted frame.
5. **Playback for playing, seeks for scrubbing.** Running the film at real speed via
   `currentTime` writes is a seek storm — measured 8% long frames on desktop AV1.
   Native `video.play()` for autoplay (with drift correction), per-seek scrub only
   when the user's scroll is driving.

## When not to use it

- The user came to read: docs, editorial, e-commerce. Scrub is a Usability tax and
  30% of the score is Usability.
- Video as background texture behind a headline → `11-performance.md` §Video.
- A single hero loop → `17-video.md`. One pinned scrub scene inside an otherwise
  normal page → `07-scroll.md` §ScrollTrigger, with a plain muted MP4.
- Mobile-first audiences where you cannot re-frame the take for portrait. A 16:9
  flight center-cropped to 9:16 loses the subject at every doorway.

## The asset pipeline

### One take, cut at thresholds

Author the flight as ONE camera path, then choose the cut points. Bake it whole and
cut, or author per-leg curves that share seam points exactly — either way the seam
frame must be identical in both neighbours:

```
s0 ──────────┐           ┌── connector c0
             └─ frame K ─┘   frame K ships in BOTH clips
```

- 24 fps is enough. Scrub maps scroll *position* to time, so frame rate is not
  smoothness — it is bytes. 24fps halves the file against 48.
- Dwell/connector rhythm: scenes 6–8s, connectors 3–4s. Scroll weights ≈ 1.6 vh per
  scene, 0.9 vh per connector; 9–10 viewport heights for a four-scene flight. Always
  show a progress signal (route dots, a bar) — it is what converts "trapped" into
  "paced" (`07-scroll.md` §Pinning).
- Keep ~30–35% camera speed at the seams in the baked motion. A dead stop per
  doorway reads as a stutter once the user's scroll drives playback.

### Encoding ladder

```bash
# desktop: AV1 first, H.264 fallback, keyframe every 8 frames
ffmpeg -framerate 24 -i frames/%05d.png -c:v libsvtav1 -crf 30 -g 8  -pix_fmt yuv420p -movflags +faststart -an seg.av1.mp4
ffmpeg -framerate 24 -i frames/%05d.png -c:v libx264  -crf 23 -g 8  -pix_fmt yuv420p -movflags +faststart -an seg.h264.mp4
# mobile: 720p portrait, keyframe every 4 — phone decoders pay per frame-from-keyframe
ffmpeg -framerate 24 -i frames_m/%05d.png -c:v libx264 -crf 24 -g 4 -pix_fmt yuv420p -movflags +faststart -an seg.m.h264.mp4
```

- Tight GOPs are the whole game on mobile: measured scrub is cleaner on a 720p `-g 4`
  file than on the 1080p `-g 8` master (59.4 vs 56.6 avg fps on a mid iGPU).
- Strip audio at encode time. `+faststart` even though clips load as blobs — some
  will be served plain by other consumers.
- Posters: the designed first frame of each scene, AVIF. A connector's still is the
  NEXT scene's poster — under reduced motion the stills must tell the journey alone,
  so the dissolve walks scene to scene.
- Mobile is re-rendered or re-framed, never a crop. Portrait changes what the camera
  must keep centered.

## The engine

Vanilla, no dependencies. Three pieces: a segment table, a `read()` on scroll, one
rAF loop. If the Lenis + ScrollTrigger spine is installed (`07-scroll.md`), drive the
same targets from a single pinned trigger's `self.progress` inside the one gsap
ticker — the rest of this section is unchanged.

```js
// segment table: kind, scroll weight (vh), baked seconds, still
const SEGMENTS = [
  { id: "s0", kind: "dive", w: 1.6, secs: 7.0, still: "s0" },
  { id: "c0", kind: "conn", w: 0.9, secs: 3.5, still: "s1" }, // still = NEXT scene
  // … dive/connector interleaved, one array, cumulative start/end in layout()
];

// read(): scroll position → per-segment local progress, crossfade opacities,
// lazy-load radius. Never write currentTime here — write s.target only.

// raf(): per segment, s.cur chases s.target (lerp 0.18), then:
if (s.video.seeking) continue;        // never queue behind the decoder
if (Math.abs(s.video.currentTime - t) > eps) s.video.currentTime = t;
// eps ≈ 8ms desktop, 20ms touch — coarser step = fewer decodes
```

Non-negotiable mechanics, each one learned by measuring:

- **Blob loading.** `fetch(url) → createObjectURL`. Seeks never depend on HTTP
  byte-range support, and you know exactly when the bytes arrived.
- **Lazy radius.** Load only segments within ±1.6 viewport heights of the scroll
  position. First view = one poster + the first clip (~1MB total in the demo).
- **No replayed frames on arrival.** A clip that finishes loading mid-segment seeks
  to the *current* scroll position before its first painted frame:
  `loadedmetadata → cur = target → currentTime = cur × duration`, then reveal on the
  first `seeked` event. Revealing at frame 0 and catching up is the single most
  visible bug in this pattern.
- **iOS priming.** First `pointerdown`/`touchstart`: muted `play()`→`pause()` on
  every loaded clip, or the first seek paints black.
- **URL-bar guard.** On touch, ignore `resize` events that only change height —
  relayout there yanks the scroll position.
- **Chrome positioning is critical CSS.** Fixed/sticky controls whose position lives
  in an async stylesheet render in flow first and jump (measured CLS 0.064).

### Autoplay: playback, not seeks

When the film should run itself (a showpiece landing, a kiosk), do not advance
`currentTime` per frame — play it:

```js
// autoplay: the document really scrolls (scrollTo with film time → y mapping);
// the ACTIVE segment plays natively, everything else stays paused.
const diff = expected - video.currentTime;
if (Math.abs(diff) > 0.15) video.currentTime = expected;       // hard correction
else video.playbackRate = clamp(1 + diff * 0.5, 0.92, 1.08);   // drift correction
```

Measured: 59.9 fps with 1.0% long frames, drift held within ±0.8% of playbackRate.
On handoff back to manual scroll, pause and sync `cur = currentTime / duration` —
the freeze lands exactly where playback got to. Pause on wheel, touch drag, arrow
keys, click, or `visibilitychange`; resume only from an explicit control
(spacebar / a 44px play button). Never autoplay under `prefers-reduced-motion`.

## Alternative: frame sequence on canvas

For short flights (< ~150 frames) or when seek stutter survives a `-g 4` encode:
preload WebP/JPEG frames and `drawImage` per scroll position. Exact frames, no
decoder, no seek semantics at all — at the price of total bytes up-front and memory
for decoded images. Video with tight GOPs wins on anything longer or mobile-first;
the demo's `.tmp-scroll-test` ancestor explored the sequence path and the video
path won on weight. Do not ship a frame sequence without lazy chunk loading and a
poster for frame 0.

## Budgets

| Asset | Target | Measured (demo 09) |
|---|---|---|
| Scene clip 1080p AV1 (6–8s) | < 1.5MB | 0.51–1.10 MB |
| Scene clip 1080p H.264 | < 2MB | 1.09–1.56 MB |
| Connector 1080p AV1 (3–4s) | < 1MB | 0.39–0.68 MB |
| Mobile clip 720p H.264 | < 1MB | 0.38–0.84 MB |
| Poster AVIF | < 150KB | 5.8–12.3KB |
| First view (poster + first clip + page) | < 3MB | ~1.0MB |
| LCP on Fast 3G + 4× CPU | < 1.5s | 1.49s median of 5 |
| CLS | < 0.05 | 0.0006 |

The LCP element is the poster or the landing copy — never a `<video>`. Like
`17-video.md` says: a video in the initial DOM is an LCP candidate even when
invisible; let JS create it when the network can afford it. And the landing copy
must paint with the first frame (an `opacity: 1` initial state, not a JS reveal) or
a late-painting paragraph becomes the LCP element instead.

**That rule holds only for a film that waits for the user.** LCP keeps updating
until the first input, and a full-bleed clip is a larger candidate than any title
over it — so a scrub film that *autoplays from the top* will hand its LCP to a
`<video>` for anyone who loads the page and does nothing. Demo 11 (`stacco`)
measures 0.92s to its title and 5.65s to the clip that then displaces it. Budget for
both numbers, publish both, and if a single good LCP matters more than the film
starting by itself, do not autoplay on load.

### Load one clip at a time

A 2.4vh look-ahead means two or three clips want fetching the instant the page
opens. Fetching them together is a stampede: measured on Fast 3G + 4× CPU, the first
clip finished at **9.8s** in parallel against **~3.4s** on its own, and the film
opened on a still it should already have been past. A six-line queue — one request in
flight, sorted by distance from the current scroll position — fixed that, and also
took scrub long frames from 8.3–10% to **3.9%** and autoplay long frames from
4.1–4.3% to **2.8%**. The fetches were competing with the decoder, not only with each
other, which is not obvious until it is measured.

## Fallbacks & accessibility

- **Reduced motion**: clips never load; stills cross-dissolve on scroll. The journey
  must survive on posters — this is why connector stills are the next scene's poster.
- **Keyboard**: native scroll works by construction; scene nav is real `<button>`s
  that `scrollTo` real document positions (verified: Tab, Enter, page moves).
- **No-JS**: the first scene's still and the copy are in the HTML; everything else is
  enhancement.
- **Mobile**: native touch scroll (no `syncTouch`), coarser seek epsilon, no
  particles/per-frame extras alongside the decoder.

## Audit hooks

Verify, don't assume (`15-audit.md` for the procedure):

1. First-view weight and LCP with the poster as candidate — Fast 3G + 4× CPU.
2. Scrub frame rate: rAF deltas over a full sweep; long frames should cluster at
   clip initialisation, not during seeks.
3. Segment sequence at nine scroll stops: the visible segment is the right one.
4. Reduced motion: zero `<video>` elements in the DOM after a full scroll-through.
5. Keyboard: dots reachable, Enter jumps, spacebar does not scroll when bound.
6. Seam: step through the join frame by frame — identical pixels, no black flash.
