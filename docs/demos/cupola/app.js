/* ============================================================
   cupola — wiring.

   Native scroll position lays the courses. Nothing is intercepted:
   the page scrolls exactly as far as it was pushed, and the dome
   is as high as the scroll bar says. The mapping runs across the
   nine panels only, so the notes underneath do not eat part of the
   sixteen years.
   ============================================================ */
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("stage");
const hud = document.querySelector("[data-hud]");
const cue = document.querySelector("[data-cue]");
const rule = document.querySelector("[data-rule]");
const sceneEl = document.querySelector("[data-scene]");

/* Building the dome is about a quarter of a second of arithmetic, and
   evaluating three.js is more. Both used to run before the browser had
   painted anything, which put first paint behind them for no reason —
   the writing does not need the renderer. So the import is dynamic and
   fires after two frames, by which time the page is already on screen.
   The modules are already in flight: <link rel="modulepreload"> starts
   them with the HTML. */
requestAnimationFrame(() => requestAnimationFrame(async () => {
  const { createCupola } = await import("./scene.js");
  boot(createCupola({ canvas }));
}));

function boot(app) {
if (!app) {
  /* No WebGL context. The dome is the point, so say that it is missing
     rather than leaving a blank rectangle behind the writing. */
  hud?.remove();
  canvas?.remove();
  const open = document.querySelector(".panel--open .lede");
  if (open) open.insertAdjacentHTML("afterend",
    "<p class='body'><b>This browser did not give the page a WebGL context</b>, so the " +
    "dome is not being drawn. The two rules it is built on, and every number below, " +
    "read the same either way.</p>");
  const counts = document.querySelector("[data-counts]");
  if (counts) counts.innerHTML =
    "<div><dt>Renderer</dt><dd>unavailable</dd></div>" +
    "<div><dt>Reason</dt><dd>no WebGL context</dd></div>";
} else {
  /* ---- numbers the page quotes, taken from the model rather than typed ---- */
  const f = app.facts;
  const put = (key, value) => {
    for (const el of document.querySelectorAll(`[data-f="${key}"]`)) el.textContent = value;
  };
  put("rise", f.RISE.toFixed(1));
  put("rise2", f.RISE.toFixed(1));
  put("sag", Math.round(f.sagAt(0) * 100));
  put("sag2", Math.round(f.sagAt(0) * 100));

  /* ---- readouts ---- */
  const cells = {};
  for (const el of document.querySelectorAll("[data-c]")) cells[el.dataset.c] = el;
  const hudCells = {};
  for (const el of document.querySelectorAll("[data-h]")) hudCells[el.dataset.h] = el;

  const set = (map, key, value) => {
    const el = map[key];
    if (el && el.textContent !== String(value)) el.textContent = value;
  };

  function paint() {
    const s = app.state;
    set(hudCells, "year", String(Math.round(s.year)));
    set(hudCells, "metres", s.metres.toFixed(1) + " m");
    set(hudCells, "opening", s.opening.toFixed(1) + " m");
    if (rule) rule.style.width = (s.closed * 100).toFixed(1) + "%";
  }

  function paintCounts(fps) {
    const c = app.counts();
    set(cells, "calls", c.calls);
    set(cells, "tris", c.tris.toLocaleString());
    set(cells, "textures", c.textures);
    set(cells, "programs", c.programs);
    set(cells, "fps", fps ? fps + " fps" : "—");
  }

  const readScroll = () => {
    const r = sceneEl.getBoundingClientRect();
    const travel = sceneEl.offsetHeight - innerHeight;
    const p = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
    app.setProgress(p);
    if (scrollY > 20) cue?.classList.add("is-done");
  };

  if (REDUCED) {
    /* No loop and no scrub: one composed frame at the moment the page is
       about, the ring nearly closed, and the readouts set to match it. */
    app.setProgress(0.875);
    app.snap();
    app.render();
    hud?.classList.add("is-live");
    paint();
    paintCounts(0);
    set(cells, "fps", "static");
  } else {
    addEventListener("scroll", readScroll, { passive: true });
    addEventListener("resize", readScroll, { passive: true });
    readScroll();
    app.snap();
    app.start();
    hud?.classList.add("is-live");
    /* The scene runs while the scene is on screen. Once the reading
       starts, the loop stops and the instrument goes with it — a fixed
       readout over an essay is clutter, and a running renderer under
       one is a battery bill. */
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { app.start(); hud?.classList.add("is-live"); }
      else { app.stop(); hud?.classList.remove("is-live"); }
    }).observe(sceneEl);
  }

  let countsVisible = false;
  const countsEl = document.querySelector("[data-counts]");
  if (countsEl && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { countsVisible = e.isIntersecting; }).observe(countsEl);
  } else countsVisible = true;

  let acc = 0, frames = 0, fps = 0;
  app.onFrame((dt) => {
    acc += dt; frames++;
    if (acc >= 0.5) { fps = Math.round(frames / acc); acc = 0; frames = 0; }

    paint();
    if (countsVisible) paintCounts(fps);
  });

  window.__cupola = app;   // teardown handle for the audit
}
}
