# Real-browser audit procedure

Never report a performance or accessibility number you did not measure. This procedure
drives a real Chrome and produces the evidence for the self-scoring sheet in
`01-scoring.md`.

The commands below use `chrome-devtools-axi` (agent-ergonomic Chrome DevTools wrapper).
If it is not installed, fall back to Lighthouse CLI + manual DevTools, but still measure.

```bash
# convenience alias for the examples below
CDA="chrome-devtools-axi"
```

## 0. Baseline capture

```bash
$CDA open https://example.com
$CDA console          # must be empty of errors/warnings on load
$CDA network          # look for 404s, oversized assets, third parties, blocking requests
$CDA screenshot ./audit/desktop-1440.png
```

Record: number of requests, total transfer, largest 5 assets, any request > 500KB, any
third-party domain.

## 1. Cold-load performance under throttle (the jury's worst case)

```bash
$CDA emulate --network "Fast 3G" --cpu 4
$CDA perf-start
$CDA open https://example.com          # reload with tracing on
$CDA perf-stop                         # returns trace summary + insight set id
```

Then drill into the insights that map to the budget:

```bash
$CDA perf-insight <set-id> LCPBreakdown
$CDA perf-insight <set-id> RenderBlocking
$CDA perf-insight <set-id> DocumentLatency
$CDA perf-insight <set-id> CLSCulprits
```

(Run `perf-insight <set-id>` with a wrong name to list the available insights for that trace.)

Pass criteria — see `11-performance.md`:
`LCP < 1.5s` · `CLS < 0.05` · `INP < 100ms` · first-view transfer `< 3MB`.

Full Lighthouse run:

```bash
$CDA lighthouse https://example.com
```

Targets: Performance ≥ 90 (mobile, throttled), Accessibility 100, Best Practices ≥ 95,
SEO ≥ 95. Accessibility 100 is the floor — it catches roughly a third of real issues.

## 2. Sustained frame rate on the signature moment

```bash
$CDA emulate --cpu 4
$CDA perf-start
$CDA scroll down     # repeat through the heaviest scene, or interact with the moment
$CDA scroll down
$CDA perf-stop
```

Read the trace for long tasks, forced reflow, and dropped frames. Then hold the scene for
60 seconds and re-check — thermal/GC throttling after a minute is common and reads as
"broken" to a juror.

For a WebGL scene, sample the renderer's own counters:

```bash
$CDA eval "({calls: window.__renderer?.info.render.calls, tris: window.__renderer?.info.render.triangles, geo: window.__renderer?.info.memory.geometries, tex: window.__renderer?.info.memory.textures})"
```

Draw calls should stay < 100 and the memory counters must **stabilize**, not climb.

## 3. Mobile pass

```bash
$CDA emulate --viewport "390x844x3,mobile,touch" --network "Fast 4G" --cpu 4
$CDA open https://example.com
$CDA screenshot ./audit/mobile-390.png
$CDA eval "document.documentElement.scrollWidth > document.documentElement.clientWidth"   // must be false
```

Then sweep the breakpoints. **Use `emulate --viewport`, not `resize`** — a real browser
window will not go below roughly 500px, so `resize 320 640` silently leaves you at ~504px
and every narrow-viewport check becomes meaningless. And always compare `scrollWidth`
against `clientWidth`, never against the width you *asked* for:

```bash
for V in "320x640x2,mobile,touch" "390x844x3,mobile,touch" "768x1024x2,mobile" "1440x900x2" "1920x1080x1"; do
  $CDA emulate --viewport "$V"
  $CDA eval "({vp: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth})"
  $CDA screenshot "./audit/${V%%x*}.png"
done
```

`overflow` must be `false` at every width. Also check landscape phone (`844x390x3,mobile`) —
short viewports are where pinned `100vh` scenes usually break.

Tap-target check:

```bash
$CDA eval "[...document.querySelectorAll('a,button,[role=button],input,select')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.height<44}).map(e=>e.tagName+'.'+e.className).slice(0,20)"
```

Should return `[]`. Height is the hard rule; a *narrow* text link is acceptable when
neighbouring targets are ≥24px apart (WCAG 2.5.8 spacing exception), so check width
separately and judge it against the spacing rather than failing it automatically.

## 4. Reduced motion

Chrome must be launched with the flag (there is no runtime emulation switch):

```bash
CHROME_DEVTOOLS_AXI_CHROME_ARGS="--force-prefers-reduced-motion" $CDA open https://example.com
$CDA screenshot ./audit/reduced-motion.png
$CDA eval "matchMedia('(prefers-reduced-motion: reduce)').matches"    // must be true
$CDA scroll down
$CDA screenshot ./audit/reduced-motion-scrolled.png
```

Pass criteria: the site is **complete and calm**, not blank, not frozen mid-animation, no
elements stuck at `opacity: 0`. Verify:

```bash
$CDA eval "[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return s.opacity==='0'&&e.getBoundingClientRect().height>40&&s.visibility!=='hidden'}).length"
```

Should be 0 (or only genuinely hidden UI).

## 5. Keyboard & accessibility

```bash
$CDA open https://example.com
$CDA press Tab && $CDA snapshot | head -20      # first stop should be the skip link
```

Tab through the primary journey and confirm at each step:

```bash
$CDA eval "(()=>{const a=document.activeElement;const s=getComputedStyle(a);return {el:a.tagName+'.'+a.className, outline:s.outlineWidth+' '+s.outlineColor, shadow:s.boxShadow}})()"
```

Focus must be visibly styled at every stop. `resize` is fine for desktop-sized checks (it moves the real window); for anything under
~500px, or when you need `mobile`/`touch`/DPR emulation, use `emulate --viewport`.

Then structural checks:

```bash
# heading order
$CDA eval "[...document.querySelectorAll('h1,h2,h3,h4')].map(h=>h.tagName+' '+h.textContent.trim().slice(0,40))"
# landmarks
$CDA eval "({main:document.querySelectorAll('main').length, nav:document.querySelectorAll('nav').length, h1:document.querySelectorAll('h1').length})"
# images without alt
$CDA eval "[...document.images].filter(i=>!i.hasAttribute('alt')).map(i=>i.currentSrc).slice(0,10)"
# div-buttons
$CDA eval "[...document.querySelectorAll('div[onclick],span[onclick]')].length"
# images without dimensions (CLS risk)
$CDA eval "[...document.images].filter(i=>!i.width||!i.height).map(i=>i.currentSrc).slice(0,10)"
```

Then run a keyboard-only pass by hand and, if possible, a screen-reader pass. Also verify
200% zoom:

```bash
$CDA resize 720 900   # ≈200% of 1440
$CDA eval "document.documentElement.scrollWidth > 720"   // must be false
```

## 6. Content & metadata

```bash
$CDA eval "({title:document.title, desc:document.querySelector('meta[name=description]')?.content, og:document.querySelector('meta[property=\"og:image\"]')?.content, lang:document.documentElement.lang, canonical:document.querySelector('link[rel=canonical]')?.href})"
$CDA eval "/lorem ipsum|placeholder|company name|your text here|coming soon/i.test(document.body.innerText)"   // must be false
```

Read a `true` before acting on it: a page that *writes about* placeholder content (a style
guide, a checklist, this skill's own showcase) trips the regex legitimately. Confirm the
match is real placeholder text, not prose about it.

Repeat the whole content check on **every** route, plus the 404 page:

```bash
$CDA open https://example.com/definitely-not-a-page
$CDA screenshot ./audit/404.png
```

## 7. Report

Produce, in this order:

1. **Measured numbers** — LCP, CLS, INP, transfer, Lighthouse four scores, FPS on the
   signature scene, draw calls if 3D.
2. **Per-criterion score** from `01-scoring.md`, with the evidence for each.
3. **The three highest-leverage fixes**, each with the expected point movement.
4. **Predicted score after fixes**, and a verdict: not submittable / HM tier / SOTD tier.
5. Screenshots at 320 / 390 / 768 / 1440 / 1920 plus reduced-motion and 404.

Be blunt. If the concept is the ceiling, say so — polish does not rescue a site with no idea.
