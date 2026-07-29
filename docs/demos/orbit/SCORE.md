# Il sistema solare — self-score

Scored against `references/01-scoring.md` by the person who built it.

**Predicted: 7.7** — Design 7.5 · Usability 7.5 · Creativity 7.5 · Content **8.5**

This is the first demo in the set where content is the strongest column rather than the
weakest, because for once the subject has a primary source and the audience has a reason
to trust it.

## The idea

Every drawing of the solar system is wrong, and not out of laziness: it is impossible to
be right. Draw the planets at true size and they vanish; draw the distances truly and the
planets vanish. Every textbook picks a lie. **This page shows both, and states its own
exaggeration on screen** rather than hoping nobody asks.

That is also the lesson: the scale section works out what happens if the Sun is a
football — Earth becomes a 2 mm grain 24 m away, Neptune a pinhead at 720 m.

## Data

Every number comes from the **JPL Solar System Dynamics** service, fetched and parsed, not
recalled:

- Physical parameters (mean radius, mass, density, rotation period, orbital period)
- Keplerian elements (semi-major axis)
- Retrieved 29 July 2026; `planets.json` ships alongside the page with its source recorded

The NASA planetary fact sheet — the usual source for this — now redirects to a page with
no data table in it. That is worth knowing before anyone tries to reproduce this.

## Measured

| Metric | Budget | Measured |
|---|---|---|
| Draw calls | < 100 | **12** |
| Triangles | — | 5,536 |
| Textures | — | **0** |
| Planets | — | 8, one geometry, one shader |
| Horizontal overflow at 390px | none | **none** |

Eight planets, a sun, orbit rings and a starfield in twelve draw calls, because every body
shares one sphere and one shader with a `uKind` switch.

### Failures found while building it

- **Every planet rendered nearly black.** The fragment shader dotted a *view-space* normal
  against a *world-space* direction to the Sun. Mismatched spaces produce a plausible
  number and a wrong picture. Both are world-space now.
- **The planets were specks.** True proportion against the distances is unreadable, so
  they are exaggerated — and the intro says so in a callout rather than in a footnote.
- **Earth's fact cards were tautologies** — "1,00 times Earth", "1,00 times our distance".
  For the reference planet the panel now shows absolute values instead.
- **The NASA fact sheet is gone**, and every URL under it returns the same SPA shell with
  a 200. A 200 is not a success; checking the parsed row count is what caught it.

### Found after a first look, by someone else

A viewer said the planets looked flat next to the `abyss` demo, and that arriving at each
one felt like a cut. Both were right, and both had a specific cause.

- **The planets were painted balls.** The noise tinted their colour but never bent the
  normal, so light slid over a perfect sphere. `abyss` bends the normal along a noise
  gradient, and porting that one block is most of the difference. Rocky worlds get strong
  relief; gas giants get almost none, because they are fluid.
- **The camera teleported.** It picked `planets[floor(seg)]` and let a position lerp hide
  the jump — but the *target* was discontinuous, and no amount of smoothing repairs a
  target that moves instantly. `local` was computed and then never used. The aim point is
  now interpolated between two planets, with a dwell on each and a crossing at the end of
  its panel, so the distance between worlds is something you watch rather than skip.
- **Then every planet was a speck.** The camera offset multiplied the radius on two axes
  and added more on a third — roughly 14× the radius. Distance is now *solved* for the
  framing rather than guessed: `d = r / tan(F · fov/2)`. Measured, not eyeballed — Jupiter
  went from 17% of frame height to 35%.
- **Jupiter had no Great Red Spot** while the copy told children about it, and **Saturn's
  rings were one solid disc** while the copy said they are billions of separate pieces.
  A render that contradicts its own caption is worse than a plainer render; both are now
  drawn, the rings with banding and the Cassini division.
- **The Sun's halo was an opaque sphere at 16% opacity** and read as a muddy brown ring.
  A corona has to fade to nothing at its edge, so it is a camera-facing shader instead.

## Scored

**Design ×0.40 → 7.5.** Type is deliberately larger and the measure shorter than the other
five demos, because the readers are eight years old; contrast sits well past the minimum.
Marked down because eight near-identical panels is a repetitive rhythm, and the procedural
planets are convincing at a glance but thin under inspection — Jupiter has bands but not
its storm.

**Usability ×0.30 → 7.5.** Twelve draw calls, no textures, nothing to download before the
scene starts, scroll mapped rather than intercepted, and every planet reachable by anchor
(`#mars`) so a teacher can link one directly. Marked down for no CWV measurement under
throttle, no INP, and no Safari.

**Creativity ×0.20 → 7.5.** The concept is a real teaching idea rather than a decorated
orrery: the site's subject is *why the pictures lie*, which is the thing children are
never told. Against that, a scroll-driven solar system is the single most common WebGL
demo there is, and the 3D itself is not doing anything new.

**Content ×0.10 → 8.5.** Primary-source data, shipped as a JSON file with its provenance,
plus a full table so a teacher can check any figure. Written for the age group without
talking down — concrete comparisons, no adjectives doing the work of numbers. The colophon
states what the page does *not* do: no moons, orbits drawn as circles rather than
ellipses, colours plausible but not photographic.

## Not verified

- Core Web Vitals under throttle, INP, sustained frame rate
- `prefers-reduced-motion` — the code path matches the demos where it was verified, but
  it was not exercised here
- Safari and Firefox; any physical device
- The Italian copy has not been read by a primary-school teacher, which is the review that
  would actually matter for this one
