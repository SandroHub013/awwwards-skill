# Accessibility & the Developer Award

The Developer Award exists because Awwwards decided that "quality code" means the site
works "for all people, regardless of device or browser" — explicitly naming users with
visual or hearing impairments, legacy browsers and mobile. SOTD winners are re-scored by a
developer jury and need **> 7**. Accessibility, performance and SEO are all part of that read.

Target **WCAG 2.2 AA**. Motion-heavy sites can meet it — they just have to plan for it.

## Semantics first

- One `<h1>` per page; heading levels never skip. Headings describe the section, not the effect.
- Landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`. `<main>` exactly once.
- Buttons that do things are `<button>`; things that navigate are `<a href>`. Never a
  `<div onclick>`. This alone fixes keyboard, focus and screen-reader support for free.
- Lists are lists. Forms have `<label for>`, not placeholders-as-labels.
- **Use native HTML before ARIA.** ARIA rules that matter: don't override native semantics;
  every interactive ARIA control must work with `Enter`/`Space`; never remove focusability;
  every control needs an accessible name.
- Decorative canvases/SVG: `aria-hidden="true"`. Meaningful ones need a text equivalent.

## Keyboard

- [ ] Every interactive element reachable with `Tab`, in visual order.
- [ ] `:focus-visible` style is designed and has ≥3:1 contrast against its background.
      Removing the outline without a replacement is an automatic failure.
- [ ] Skip link to `#main` as the first focusable element.
- [ ] Modals/menus: focus moves in, is trapped while open, and returns to the trigger on close.
      `inert` on the background, `Escape` closes.
- [ ] `Space`, `PageUp/Down`, `Home`, `End`, arrows scroll the page — custom scroll must not
      swallow them.
- [ ] Custom sliders/galleries/drag interfaces have keyboard equivalents (arrows, prev/next).
- [ ] No positive `tabindex`. No keyboard traps anywhere.

## Motion & vestibular safety

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

That global rule is the safety net, **not** the solution. The real work:
- Provide an equivalent non-animated cue for anything motion communicated (state, grouping,
  progress).
- Kill parallax, large translations, scale, auto-playing scroll animations, and infinite
  marquees. Keep short opacity crossfades.
- Destroy smooth scroll (`lenis.destroy()`), so native scrolling and find-in-page behave.
- Freeze WebGL scenes at a good static frame rather than blanking them.
- Anything that flashes more than 3 times per second is prohibited — no exceptions.
- Auto-playing motion longer than 5s needs a pause control (WCAG 2.2.2).

Test it: DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion". If the
site becomes unusable or blank, it fails.

## Color & contrast

- Body text ≥ 4.5:1; large text and meaningful UI/graphics ≥ 3:1.
- Never encode information in hue alone.
- Verify text over images/video at the worst-case frame.
- Support `prefers-contrast: more` if the palette is low-contrast by design.
- Do not rely on `opacity` for muted text so heavily that it drops below threshold.

## Media

- Meaningful images: descriptive `alt`. Decorative: `alt=""`. Never `alt="image"`.
- Video with speech: captions. Audio-only: transcript. Background video: no essential info.
- No autoplay with sound. Any audio over 3s needs a control.

## Screen-reader safety for split text

GSAP's rewritten `SplitText` has screen-reader accessibility baked in (it maintains an
accessible copy). If you split by hand, wrap the original text in a visually-hidden element
or set `aria-label` on the container and `aria-hidden="true"` on the split fragments.
Always `split.revert()` on teardown so copy/paste and translation tools still work.

## SEO & metadata (part of the developer read)

- Unique `<title>` and meta description per page.
- Canonical URL, `og:` and `twitter:` tags, `og:image` 1200×630.
- Structured data (`Organization`, `WebSite`, `BreadcrumbList`, plus `Article`/`Product`
  where relevant).
- `sitemap.xml`, `robots.txt`, `lang` attribute correct, `hreflang` if multilingual.
- Real, crawlable text — not text baked into images or rendered only in WebGL.
- Meaningful link text ("view the case study", never "click here").

## Robustness / interoperability

- Test Chrome, Safari (macOS *and* iOS — different engines' quirks), Firefox, Edge.
- Progressive enhancement: no-JS gets readable content; no-WebGL gets the DOM version.
- Handle `webglcontextlost`, failed asset loads, offline, and slow connections gracefully.
- Respect `prefers-color-scheme` if you ship themes.
- Zoom to 200% must not break layout or hide content (WCAG 1.4.4). Test it.
- `viewport` meta without `user-scalable=no` and without `maximum-scale`.

## Quick audit

```
axe DevTools / Lighthouse a11y  → 100, and read the "manual checks"
Keyboard-only pass              → complete the primary journey without a mouse
VoiceOver / NVDA pass           → headings list makes sense, landmarks present
Reduced-motion pass             → site still complete and pleasant
200% zoom pass                  → no clipping, no horizontal scroll
Contrast pass                   → every text/background pair verified
```

Lighthouse a11y = 100 is the floor, not the goal. It only catches ~30% of issues; the
keyboard and screen-reader passes are what the developer jury actually feels.
