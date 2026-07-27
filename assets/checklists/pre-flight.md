# Pre-flight checklist

Print this. Run it before submitting anything. Every unchecked box is points.

## Concept & content
```
[ ] One-sentence concept, still legible with all animation removed
[ ] One signature moment, describable out loud
[ ] Real copy everywhere, proof-read, in one voice
[ ] Original imagery — no stock
[ ] Microcopy designed: buttons, errors, empty states, 404, alt text
[ ] No placeholder strings anywhere in the DOM
[ ] Credits, dates and real outcomes on case studies
```

## Design
```
[ ] Type roles defined; no ad-hoc font sizes
[ ] Body 60–75ch measure; ≥16px effective on mobile
[ ] Colour roles defined; one accent; neutrals tinted
[ ] One spacing scale; section rhythm consistent
[ ] One or two radii; one shadow language
[ ] Rest / hover / focus-visible / active designed for every control
[ ] Inner pages, forms, footer and 404 match the home page
[ ] One deliberate grid break, not accidental ones
```

## Motion
```
[ ] One easing family, tokenized durations
[ ] Only transform/opacity animated
[ ] will-change set on start, released on complete
[ ] Reveals grouped, `once: true`, guarded for already-in-view elements
[ ] Above-the-fold content NOT revealed on scroll
[ ] Pinned scenes ≤ ~4 viewport heights, with a progress signal
[ ] Reduced-motion version complete and calm, not blank
[ ] Marquees/scenes paused offscreen and on hidden tab
```

## Performance (measured, not guessed)
```
[ ] LCP < 1.5s
[ ] CLS < 0.05
[ ] INP < 100ms
[ ] First-view transfer < 3MB
[ ] Lighthouse: Perf ≥ 90 mobile-throttled · A11y 100 · BP ≥ 95 · SEO ≥ 95
[ ] 60fps sustained for 60s on the heaviest scene, at 4× CPU throttle
[ ] Draw calls < 100 and GPU memory stable (if 3D)
[ ] Images AVIF/WebP at the sizes actually used, dimensions set
[ ] Fonts self-hosted, subset, preloaded, metric-matched fallback
[ ] No third-party script blocking or shifting the first view
```

## Accessibility
```
[ ] One h1, heading order intact, landmarks present
[ ] Buttons are <button>, links are <a href>
[ ] Skip link; focus visible at every stop; logical order; no traps
[ ] Modals: focus moved in, trapped, returned; Escape closes; background inert
[ ] Space / PageDown / Home / End / arrows scroll the page
[ ] Contrast: body ≥4.5:1, large text and meaningful UI ≥3:1
[ ] Information never carried by colour alone
[ ] Alt text meaningful; decorative canvases aria-hidden
[ ] 200% zoom usable, no clipping, no horizontal scroll
[ ] No autoplay audio; captions/transcripts where needed
```

## Responsive
```
[ ] 320 / 390 / 768 / 1024 / 1440 / 1920 verified
[ ] Landscape phone verified (short viewport)
[ ] No horizontal overflow at any width
[ ] Tap targets ≥44px with ≥8px spacing
[ ] No hover-only affordances
[ ] svh/dvh used; safe-area insets respected
[ ] Zoom enabled (no user-scalable=no / maximum-scale)
[ ] Signature moment has a genuine touch version
[ ] Tested on a real mid-range Android, mobile Safari and Chrome Android
```

## Technical hygiene
```
[ ] Console clean, no 404s in the network panel
[ ] Custom router: popstate, title, meta, focus, scroll reset all handled
[ ] view-transition-name values unique per snapshot
[ ] Section modules have destroy(); no leaks on route change
[ ] WebGL: context-loss handler, no-WebGL fallback, DPR capped
[ ] Chrome / Safari macOS / Safari iOS / Firefox / Edge verified
[ ] HTTPS, security headers, canonical, sitemap, robots
[ ] Favicon set, theme-color, og:image 1200×630
```

## Submission
```
[ ] Live, final, public, no staging password
[ ] 2–4 weeks of real traffic since launch
[ ] Self-score ≥ 7.0 with evidence
[ ] No RED anti-patterns remaining
[ ] Deploy freeze planned for the 5-day voting window
[ ] Thumbnail 1600×1200, legible at 300px, shows the idea
[ ] Description: concept first, stack second
[ ] Share plan ready for launch day
```
