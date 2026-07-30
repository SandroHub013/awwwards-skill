# stacco — Phase 0-2, written before any markup

A **scroll-scrub film**, and the deliberate counter-argument to demo 09
(`docs/demos/soglia/`). Soglia is one continuous take that had to be cut for engineering
reasons, so it hid every cut inside a doorway. This one is cut for *storytelling* reasons,
so it declares every cut and puts the number on screen.

Subject: **Cappuccetto Rosso** — the tale, in nine shots.

---

## Phase 0 — Brief & concept

### Why a fairy tale, and why this one

The brief is "a cinematic film site whose frames keep changing so attention never settles".
That is a request about **film grammar**, not about a camera path. A camera path holds
attention with novelty of place; an edit holds it with novelty of *framing* — a wide, then
a long lens, then an overhead, then a lens so wide it deforms whoever is nearest to it.

Little Red Riding Hood is the right subject for that argument because the story is already
built out of shot values. Everyone knows it, so no shot has to spend time explaining what
it is looking at — which is exactly the condition under which framing becomes the thing you
notice. And its climax is literally a line about *seeing*: *che occhi grandi che hai*.

### Concept statement

> Nine shots, one tale: soglia was a single take that hid its seams, and this one is an
> edit that declares them — because the cut is not the place where the film breaks, it is
> the place where the film speaks.

The test from `references/02-concept.md` §The concept statement: strip every animation and
the idea survives as nine still frames with their lens and their move printed under them —
a shot list, which is a thing a film person would hang on a wall. Passed.

### The engineering argument that comes free

Soglia's segmentation was a compromise: a browser cannot seek a clip it has not loaded, so
39 seconds became seven files, and the seams had to be disguised. Here the file boundary
and the artistic boundary are the *same boundary*. One shot, one clip. There is no seam to
hide, no frame shipped twice, no crossfade anywhere in the engine.

That trade has a price, and the price is the new thing this demo teaches: **a dissolve
warns you, a cut does not.** With soglia the next segment fades up over ~0.12vh, which is
enough time for a poster to stand in without anyone noticing. A hard cut lands on frame
one. So the loader here is asymmetric — it looks *forward* much further than it looks back
(see Phase 3, §Look-ahead).

### Who it is for, and the register

Audience: the same jury that reads `soglia`, plus anyone who has ever storyboarded. The
register is **cold-cinematic** — a scope frame, a slate, a timecode, and near-silence in
the type. No fairy-tale whimsy: the woods are a thriller location, and the tale is told
straight.

---

## Phase 1 — Art direction

### The one-red rule

The whole film is graded blue-green — moss, slate, fog, bark, all inside a 20° hue band.
**Saturated red appears in exactly two places: the cloak, and the wolf's eyes.** Nothing
else in the world is allowed a warm chroma above 0.05 except the two lamps (which are
amber, not red, and are always motivated by a visible window or lantern).

This is the same discipline as `gamut`'s single accent, and it does a job here: in shot 04,
seen from directly overhead through the canopy, the girl is four red pixels. That works
only if she is the sole red object in the frame.

```
--bosco    oklch(19% 0.030 200)   the fog / the far darkness
--bosco-2  oklch(28% 0.038 195)   mid trunks
--moss     oklch(38% 0.050 155)   ground
--ash      oklch(72% 0.012 220)   sky, the only light value
--rosso    oklch(48% 0.185  28)   the cloak. Once.
--brace    oklch(66% 0.120  70)   lamp light, motivated only
```

### Frame and type

- **2.39:1 scope** on desktop, rendered 1920×804. The letterbox is not decoration: it is
  27% fewer pixels per frame than 16:9, which pays for the ninth shot.
- **4:5, 720×900 on mobile** — *re-framed, not cropped* (`references/19-scroll-scrub.md`
  says a crop loses the subject). Each shot carries its own portrait fov and lateral
  offset, and the copy lives in the black below the frame rather than on top of it.
- Type: system sans for the tale, monospace for everything the camera department would
  have written — shot number, lens, move, timecode. Two roles, no third.

### The slate

Bottom-left, always on, monospace, 0.72rem:

```
SHOT 04/09   24 mm   CRANE DOWN   00:18.5
```

It is the whole art direction in one element: it tells you the film is cut, tells you *how*
each frame was made, and gives the scrub a readout that is honest about position. It is
also the accessibility surface — the same string is what a screen reader announces when the
shot changes.

---

## Phase 2 — Signature moment

**Shot 04 — `dall-alto`.** The camera cranes to straight-down over the canopy: black
treetops, a thread of path, and one red dot walking. It is the only shot with no horizon,
the only overhead in the film, and it arrives on a hard cut out of a 35mm side-track — so
the axis flips 90° in one frame.

Specification:

| | |
|---|---|
| Trigger | scroll position enters shot 04's range (or autoplay reaches 00:14.5) |
| Phases | crane down from 48m to 27m over 4.0s, camera yaw drifting 3.3° so the canopy parallaxes |
| Fallback | the shot's poster is the overhead frame — it is the still that survives alone |
| Mobile | re-framed to 4:5, crane shortened to 34m so the red dot stays readable |
| Reduced motion | no clip loads; the overhead still cross-dissolves in with the other eight |

Everything else supports it by staying at eye level. Shots 01-03 are all horizon-anchored
so that the overhead reads as a rupture; 05-09 return to the ground and never look down
again.

---

## Phase 3 — Build notes fixed before coding

### The shot list

| # | id | secs | lens | move | beat |
|---|---|---|---|---|---|
| 01 | `01-partenza` | 5.0 | 28mm | locked, slow push | The cottage at first light. She leaves with the basket. |
| 02 | `02-margine` | 4.5 | 50mm | static, low | The treeline. She walks into the gap between two trunks and gets small. |
| 03 | `03-sentiero` | 5.0 | 35mm | track left | Walking beside her, trunks wiping the foreground. |
| 04 | `04-dall-alto` | 4.0 | 24mm | crane down | Straight down. Canopy, path, one red dot. |
| 05 | `05-occhi` | 3.5 | 85mm | static, long | Undergrowth. Two eyes open. She passes far behind, tiny. |
| 06 | `06-incontro` | 5.0 | 21mm | slow arc | The wolf's shoulder fills the near frame; she is small and centre. |
| 07 | `07-scorciatoia` | 4.0 | 18mm | race low | His shortcut: branches whipping past at knee height. |
| 08 | `08-radura` | 4.5 | 40mm | crane down | The clearing at dusk. One lit window. The door is ajar. |
| 09 | `09-che-occhi` | 5.5 | 65mm | push in | Inside. The lamp, the bed, the ears too long on the pillow. |

41.0s · 24fps · 984 frames · nine clips.

Scroll weight is 0.25vh per baked second, so the film is ~10.3 viewport heights — within a
hair of soglia's 10.1, which is the pace that measured as "paced" rather than "trapped".

### Look-ahead

The lazy radius is asymmetric: **+2.4vh forward, −0.8vh back**. A dissolve can be covered
by a poster; a cut cannot. Forward-loading two shots ahead costs one extra clip resident
(~1.2MB) and removes the only way this pattern can visibly fail.

### Budgets (targets; measured numbers go in SCORE.md)

| Asset | Target |
|---|---|
| Shot clip 1920×804 AV1 (3.5–5.5s) | < 1.2MB |
| Shot clip H.264 fallback | < 1.8MB |
| Mobile clip 720×900 H.264 | < 0.9MB |
| Poster AVIF | < 60KB |
| First view (poster + shot 01 + page) | < 1.5MB |
| LCP, Fast 3G + 4× CPU | < 1.5s |
| CLS | < 0.02 |

The LCP element is shot 01's poster, preloaded and declared in the HTML. No `<video>`
exists in the document until JS decides the network can afford one.

### Fallbacks

- **Reduced motion**: zero clips load. The nine posters cross-dissolve on scroll, and
  because every poster is a real frame from its own shot, the shot list survives intact —
  which is exactly the concept-strip test from Phase 0.
- **No-JS**: shot 01's poster, the tale's nine lines and the shot list are in the HTML.
- **Keyboard**: the nine slate entries are real buttons that `scrollTo` real positions;
  spacebar toggles autoplay; native scroll is never intercepted.
- **Autoplay**: on by default from the top, at the baked 41s pace, exactly as demo 09 —
  wheel, touch, arrows, click or a hidden tab hands control back.

### What changed once frames existed

Phases 0-2 are written before markup so the concept can be judged before the craft
flatters it — not so the plan can pretend it was right about everything. Four things
moved, and each moved because a rendered frame said so:

- **Shot 05 lost its second subject.** The plan had the girl passing far behind the
  wolf's eyes. At 85mm she is 30% of frame height at any distance the fog leaves
  visible, which is not "tiny" — it is a second subject fighting the insert. So shot
  05 became a pure insert: the eyes, and nothing else. That is a *better* argument
  for the concept, because an insert is precisely the shot a continuous take has
  nowhere to put.
- **Shot 09 went from 32mm to 58mm.** A 32 could not reach a close-up without
  putting the camera inside the bed. The lens on the slate changed with it, because
  the slate prints the field the frame was actually rendered through.
- **Shot 04 cranes down, not up.** Descending toward her is the shot; rising away
  from her is a different, weaker one.
- **Shot 06 turned around.** She now walks *up* the path to him, so the camera looks
  back down the wood she came through — which also keeps the grandmother's clearing
  out of a frame that arrives four shots before it should.

### Provenance

No footage, no models, no textures, no AI. One seeded scene file; the forest, both
cottages, the girl and the wolf are boxes, cones and cylinders. Rendered offline frame by
frame in headless Chrome, encoded with ffmpeg. `ledger.json` is generated from the files on
disk so no figure in the epilogue can drift from what shipped.
