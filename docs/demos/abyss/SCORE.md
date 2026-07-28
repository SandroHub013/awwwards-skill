# abyss — self-score

Scored against `references/01-scoring.md` by the person who built it, which is the
weakest possible jury. Treat it as a claim with its evidence attached.

**Predicted: 7.5** — Design 7.5 · Usability 7.5 · Creativity 8.0 · Content 6.5

## The signature moment

```
NAME:      The Lamp
TRIGGER:   pointer position, continuously
PHASES:    dark → the cone finds a wall → the wall goes dark again behind you
INPUT:     the pointer aims a real spotlight calculation. Nothing in the scene
           is lit by anything else, so where you point is literally what
           exists. Scroll is the second input and maps to depth.
FALLBACK:  no WebGL → the canvas is removed and the page says so where it
           claims a scene, rather than leaving a black rectangle
MOBILE:    touch aims the lamp; the scene drops to 6,150 triangles, 1,800
           points and DPR 1 automatically — a lighter build, not a disabled one
REDUCED:   no loop, no sweep. One composed frame at 210 m with the lamp aimed
           at the wall the copy is not standing on. Verified.
FIRST 3s:  the lamp sweeps on its own, biased to the half of the frame the
           copy does not occupy, so the interaction is legible before anyone
           is told about it
```

## Measured

Chrome, local server. Frame rate under **4× CPU throttle**; page metrics under
**Fast 3G + 4× CPU**.

| Metric | Budget | Measured |
|---|---|---|
| Sustained frame rate | 60fps | **58fps over 24s** at 4× CPU |
| Draw calls | < 100 | **4** |
| Triangles | — | 22,430 desktop · **6,150 mobile** |
| Textures | — | **0** |
| Shader programs | — | 4 |
| LCP | < 1.5s | **1.31s** |
| CLS | < 0.05 | **0.0009** |
| Page's own assets | — | **33 KB** (scene 17 · styles 10 · app 6) |
| Lighthouse Accessibility | 100 | **100** |
| Lighthouse Best Practices | ≥ 95 | **100** |
| Lighthouse SEO | ≥ 95 | **100** |

There are no images, no models and no texture files, so there is nothing to download
before the scene can start. `three.module.min.js` is ~87 KB gzipped from the CDN and was
warm in cache during the transfer measurement — that number is **not** a cold first load.

### Failures found while building it

- **The first version rendered black.** The spotlight used
  `smoothstep(cos(0.52), cos(0.52) + 0.30, dot(L, dir))` — an upper bound of **1.168**,
  past the maximum a dot product can return. The cone therefore topped out at 42% of full
  brightness and no amount of raising the light intensity would have fixed it. Replaced
  with two real angles, an outer and an inner cone.
- **The beam cone had its axis inverted**, so `vAlong` was clamped to zero for every
  fragment and the shaft never faded along its length.
- **The rocks read as melted clay.** Interpolated vertex normals on a displaced sphere
  give smooth blobs. Per-face normals from `dFdx`/`dFdy` plus a three-octave noise
  gradient on the normal turned them into stone without adding a single triangle.
- **It looked like a dry cave, not water.** The fix was one line: water absorbs red
  first, so the fog mix now shifts everything cyan with distance. That, plus marine snow
  in the beam, is most of what says *underwater*.
- **The scrim used `inset: 0 -50vw`** and put a horizontal scrollbar on the page — the
  same mistake demo 02 made, repeated. Rebuilt as a full-bleed section with padding.
- **Reduced motion rendered the wrong frame.** A single `render()` only lerps a few
  percent toward the target, so the "composed" frame sat at the surface. Snapped instead.

## Scored

**Design ×0.40 → 7.5.** The register is committed to: the canvas is the design and the
type stays out of the lamp's way, with its own dark so legibility never depends on where
the light happens to be. The unattended sweep is biased away from the copy for the same
reason. Marked down because the composition is at the mercy of a lamp the visitor is
aiming — some frames are beautiful and some are two grey lumps, and that is the cost of
handing the framing over.

**Usability ×0.30 → 7.5.** 58fps sustained at 4× throttle, four draw calls, zero
textures, CLS effectively zero, LCP inside budget, no horizontal overflow, and a genuine
low-end path that fires on its own rather than a disabled canvas. Scroll is mapped, never
intercepted. Marked down for no INP measurement and no Safari.

**Creativity ×0.20 → 8.0.** The concept is a real argument rather than a demo of a
library: a rendered film is sharper than this and always will be, but it is finished, and
this is not. Pointing the lamp somewhere new produces an image nobody has seen. The page
states that trade plainly instead of pretending real-time has caught up with
pre-rendered. It also completes the set — scroll straightens type in 01, is depth in 02,
is time in 03, and here it is distance travelled while the *pointer* decides the frame.

**Content ×0.10 → 6.5.** The lowest of the four, and deliberately. The prose is real and
the numbers are read live from the renderer rather than typed. But the subject is a place
that does not exist, and unlike demos 01 and 02 there is no primary source underneath it.
Procedural is more honest than model output — it is reproducible arithmetic anyone can
read in `scene.js` — but it is still invented, and it is scored as invented.

## Verified

- **`prefers-reduced-motion`** — Chrome launched with `--force-prefers-reduced-motion`.
  The animation loop never starts, the sweep never runs, the cue is hidden, and one
  composed frame renders at 210 m with the lamp aimed away from the copy.
- **Low-end path** — a 390px touch viewport drops the scene to 6,150 triangles, 1,800
  points and DPR 1 without any code change, and still holds four draw calls.

## Not verified

- INP, and a real frame-rate trace rather than a frame counter
- Safari and Firefox — Chrome only. `dFdx`/`dFdy` require the standard-derivatives
  extension on WebGL1 fallbacks, which has not been exercised
- Any physical device, and no low-end GPU: throttling was CPU-side only
- WebGL-absent fallback was written and reviewed but never forced at runtime
