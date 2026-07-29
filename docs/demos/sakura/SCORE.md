# ichi — self-score

Scored against `references/01-scoring.md` by the person who built it, which is the
weakest possible jury.

**Predicted: 7.4** — Design 7.5 · Usability 7.5 · Creativity 7.5 · Content 6.5

## The signature moment

```
NAME:      The Draw
TRIGGER:   scroll range over the whole page
PHASES:    kamae → koiguchi → nukitsuke → kiri → zanshin
INPUT:     native scroll position, mapped. Five poses authored as joint
           angles; scroll interpolates between them with a smootherstep,
           so the motion has no corner where a keyframe sits. Stop
           scrolling and it stops — which is the honest way to render a
           technique whose whole subject is that it happens at one speed.
FALLBACK:  no WebGL → canvas removed, the page says so, the writing stands
MOBILE:    same mapping on touch; fewer trees, fewer petals, DPR 1
REDUCED:   no loop. One composed frame mid-cut, blade out. Verified.
FIRST 3s:  the figure is already standing in the grove with petals
           falling, and one line says what the scroll does
```

## Measured

| Metric | Budget | Measured |
|---|---|---|
| Draw calls | < 100 | **26** |
| Triangles | — | **242** |
| Line segments | — | 2,343 |
| Points | — | 16,542 |
| Textures | — | **0** |
| Horizontal overflow at 390px | none | **none** |

The triangle count is the interesting number: 242, because almost nothing here is a
surface. A grove of cherry trees drawn as line segments costs less than one lit sphere.

### Failures found while building it

- **The scabbard rendered over the shoulder.** `rotation.x = Math.PI` on a limb whose
  pivot is at its top flips it upward, so the katana read as something slung across the
  back. The tilt belongs on the joint, not the mesh.
- **The figure stood through the floor.** The rig hangs from the hips, so the feet sat at
  −0.90; the root needed lifting by that much to put it *on* the ground.
- **The hakama was a bell.** A taper of 2.05 on the skirt swallowed the legs entirely.
- **The blade pointed at the camera and read as a stub.** Parented to the hand, it
  inherited three levels of rotation and ended up extending along +Z — almost exactly
  down the view axis. Two hours of screenshots would not have found that; measuring the
  world-space bounding box found it in one call. The fix was to author the blade's
  transform per keyframe in spine space, under direct control, rather than adding more
  trigonometry to a chain nobody can hold in their head.
- **I spent several iterations tuning the blade while looking at the scabbard.** Hiding
  one to isolate the other was the step I should have taken first.
- **The horizon was a single line** and rendered as a diagonal wire, because a line has no
  horizon — a surface does.
- **The reading sections were 95% opaque** and the figure ghosted through the body copy.

## Scored

**Design ×0.40 → 7.5.** The register is committed to: flat colour, paper ground, ink
figure, one pink, and depth carried by air rather than by lighting. Marked down because
the figure is the weakest part of the frame at close range — it is a good silhouette and
an obvious set of boxes, and the camera moves closer as the draw progresses, which is
exactly the wrong direction for that weakness.

**Usability ×0.30 → 7.5.** 26 draw calls, 242 triangles, no textures, no overflow, scroll
mapped rather than intercepted, and a low-end path that halves the grove on its own.
Marked down for no INP, no frame-rate trace under throttle, and no Safari.

**Creativity ×0.20 → 7.5.** The concept fits the subject exactly: iai is one motion at
one speed, and a scroll bar is a control that only advances while you push it. The five
stages are named on screen in the terms the art uses. Against that, a scroll-driven
character animation is not a new device, and the figure is a mannequin rather than a
performance.

**Content ×0.10 → 6.5.** The prose about the technique is written carefully and the
colophon says plainly that this is *a drawing of a technique, not a record of one*,
authored by eye by someone who does not practise it. That disclosure is the honest part.
It is still a depiction of a real discipline made without a practitioner, and it is scored
as such.

## Verified

- **Low-end path** — a coarse-pointer viewport cuts trees, blossom and petals and drops
  DPR to 1 automatically.

## Not verified

- `prefers-reduced-motion` on this demo specifically — the code path matches the four
  demos where it was verified, but it was not exercised here
- Sustained frame rate under CPU throttle
- INP, Safari, Firefox, and any physical device
