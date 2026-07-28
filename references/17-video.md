# Video — motion picture as primary content

For post-production houses, film studios, product reels and case-study sites, video is
not decoration — it is the content (10% of the score) and usually the signature moment
(20%). The jury watches it like a showreel. Reference site: [forms.world](https://www.forms.world/)
(Awwwards nominee, July 2026, by Beaucoup.) — the entry highlights the loader, the video
slider home, both project index modes and the work page player. Note that jury scores and
comments are visible only to SOTD winners (`references/01-scoring.md`), so read a nominee's
listed elements as the studio's own framing, not as jury commentary.

If video on your site is background texture behind a headline, stop here: the five rules
in `references/11-performance.md` §Video are all you need. This file is for video-first
sites.

## The doctrine

1. **The reel is the hero.** A post-production studio that hides its work behind a WebGL
   experiment has the concept backwards. Motion picture first; everything else supports it.
2. **Sound is opt-in, always.** Autoplay with audio is an instant jury and user penalty.
   The control (sound on/off) stays visible and persistent, not buried in a player chrome
   that disappears.
3. **Every video has a designed poster.** The poster is a composed frame chosen in the
   grade, not whatever frame 0 happened to be. It is what renders before, during slow
   networks, under reduced motion, and often what the jury screenshots.
4. **The player is part of the design system.** Native controls are a design failure on
   an award-tier site; removing them without rebuilding keyboard/screen-reader access is
   an accessibility failure. You own the whole control surface or you use native.

## Encoding

Ship a ladder, let the browser pick:

```html
<video muted loop playsinline preload="metadata" poster="/reel-poster.avif">
  <source src="/reel.av1.mp4"  type='video/mp4; codecs="av01.0.05M.08"'>
  <source src="/reel.hevc.mp4" type='video/mp4; codecs="hvc1"'>
  <source src="/reel.h264.mp4" type='video/mp4; codecs="avc1.4d401f"'>
</video>
```

- **AV1 first** (~30–50% smaller than H.264 at equal quality), HEVC for Safari, H.264
  universal fallback. All in MP4 containers.
- Short loops: **progressive MP4**, no streaming infra needed.
- Long-form (reels > 60s, case films): **HLS** — `.m3u8` + segments with a bitrate ladder
  (1080/720/480). Native on Safari, `hls.js` elsewhere. Adaptive bitrate is what keeps a
  3-minute film watchable on hotel Wi-Fi.
- Two-pass encode the hero loop; quality differences are visible on the one video
  everyone sees.

```bash
# Hero loop, muted, 6–10s, target < 1.5MB at 1080p
ffmpeg -i hero.mov -c:v libaom-av1 -crf 30 -b:v 0 -cpu-used 6 -an hero.av1.mp4
ffmpeg -i hero.mov -c:v libx264 -crf 24 -preset slow -movflags +faststart -an hero.h264.mp4

# Poster: pick the designed frame, then compress like any hero image
ffmpeg -i hero.mov -ss 00:00:04.2 -frames:v 1 poster.png
```

- `-movflags +faststart` on progressive MP4s (moov atom first, playback starts immediately).
- Strip audio from loops at encode time (`-an`) — a muted video with an audio track still
  downloads it.

## Budgets

| Asset | Target | Ceiling |
|---|---|---|
| Hero loop (muted, 6–10s, 1080p) | < 1.5MB | 2MB |
| Card preview loop (480p, 4–6s) | < 400KB | 600KB |
| Reel page first segment + poster | < 2MB | counts in the 3MB first-view budget |
| Poster image (AVIF, hero size) | < 150KB | 200KB |

A 50MB hero MP4 is the video equivalent of the 4000px hero PNG: the single most common
blown budget on video-first sites.

## Posters and LCP

- The **poster is the LCP element**, never the video. Preload it, `fetchpriority="high"`,
  AVIF, exact `srcset` sizes. The video loads after, fades in over the poster when ready.
- Match the poster to the video's first frame (or the frame the loop returns to) so the
  poster→video handoff has no visible jump.
- Always set `width`/`height` or `aspect-ratio` on the `<video>` — a video that resizes
  on metadata load is CLS you chose.

## Preview patterns (the index is the reel)

The forms.world pattern: the project index itself plays. Dozens of silent previews that
turn the listing page into the showreel.

- **Card loops**: pre-cut 4–6s muted loops at 480p, one per project. Not the full video
  with `currentTime` tricks — separate light files.
- **Hover-scrub** (desktop alternative): on `pointermove`, map pointer X to
  `video.currentTime`. Use `requestVideoFrameCallback` to throttle seeks to decoded
  frames (Chrome and Safari; Firefox has no support, so fall back to a `timeupdate` or
  rAF throttle there); `preload="auto"` only for the first few visible cards, `metadata`
  for the rest. Scrubbing stutters if the file lacks frequent keyframes — encode previews with
  `-g 12` (keyframe every ~0.5s).
- **Touch**: no hover exists. Tap = play inline (muted, `playsinline`), second tap = open
  the project. Never hijack scroll to fake playback.
- **Pause everything offscreen** with `IntersectionObserver`, pause on `visibilitychange`,
  and cap simultaneous playing videos (one under the pointer, none elsewhere).

```js
const io = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting) {
      // play() rejects on autoplay policy and when a pause interrupts it.
      // Unhandled, that is console noise on every fast scroll.
      target.play().catch(() => {});
    } else {
      target.pause();
    }
  }
}, { rootMargin: "100px" });
document.querySelectorAll("[data-preview] video").forEach((v) => io.observe(v));
```

## The custom player, accessible

Minimum control surface for a reel page: play/pause, progress (seekable), time, sound
toggle, fullscreen, captions if there is speech.

- Real `<button>` elements, visible `:focus-visible`, space/enter toggles, arrows seek,
  `Esc` exits fullscreen, `aria-pressed` on toggles, `aria-label` on everything icon-only.
- Captions: a real `<track kind="captions">` — narrative content without captions fails
  both accessibility and the Content criterion for anyone watching muted (most users).
- Sound toggle outside auto-hiding chrome. State persists (localStorage) so a returning
  visitor is not re-muted every page.
- Fullscreen via the Fullscreen API on the player container (your controls come along),
  not on the `<video>` alone.
- **`prefers-reduced-motion`**: no autoplay anywhere. Poster + a clear play button is the
  reduced-motion experience, and it must look designed, not broken.

```js
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("video[autoplay]").forEach((v) => {
    v.removeAttribute("autoplay"); v.pause();
  });
}
```

## Slider and transitions

- A video slider home (forms.world's highlighted element) is a carousel where each slide
  is a muted loop + title; the transition (slide, scale, clip) is the craft. Preload only
  the adjacent slides.
- Page transitions on video sites: fade/cut through black or through a held frame — a
  hard cut during playback reads as a bug, a designed cut reads as editing. You are a
  motion-picture site; edit like one.
- Grid/list toggle: FLIP the layout change (or View Transitions API), keep the playing
  preview playing through the transition. Restarting every video on view toggle is the
  tell of a DOM rebuild.

## CMS reality

Reel sites are updated constantly — new projects, new stills, new cuts. Hardcoding video
paths into a static build means the site is stale in a month. WordPress/headless with a
custom theme (the forms.world stack: WP + Vite-built theme) is a legitimate award-tier
architecture. See the CMS row in `references/06-stack.md`. Craft is judged in the browser,
not in the repo.

## Video anti-patterns

- Autoplay with sound, anywhere, ever.
- Video as LCP with no poster behind it.
- A GIF of video (10× the bytes, 1/10 the quality) — this is always an MP4.
- WebGL video texture distortion when a plain MP4 plays the same concept — GPU cost
  without a reason (see `references/08-webgl.md` for when the texture IS the reason).
- Scroll-jacked scrubbing: the wheel fights the user to advance a film. If the concept is
  "scroll drives the edit", keep native scroll position and map, never hijack.
- `preload="auto"` on twenty cards: the browser cancels most of it and you pay INP for
  the contention.
- Player chrome that auto-hides and takes the sound toggle with it.
- Captions burned into the video AND no `<track>`: un-selectable, un-translatable, and
  wrong language for half the jury.
- A reel page with no poster, showing a black rectangle on slow networks.
