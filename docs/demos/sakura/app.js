/* ============================================================
   ichi — wiring.

   Native scroll position performs the draw. Nothing is intercepted:
   the page scrolls exactly as far as it was pushed, and the technique
   advances with it. Stop scrolling and the motion stops — which is
   also the only honest way to render a thing whose whole point is
   that it happens at one speed and no other.
   ============================================================ */
import { createScene } from "./scene.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const STAGES = [
  { at: 0.00, name: "Kamae" },
  { at: 0.26, name: "Koiguchi" },
  { at: 0.58, name: "Nukitsuke" },
  { at: 0.76, name: "Kiri" },
  { at: 0.92, name: "Zanshin" },
];

const canvas = document.getElementById("stage");
const hud = document.querySelector("[data-hud]");
const stageOut = document.querySelector("[data-stage]");
const ruleOut = document.querySelector("[data-rule]");
const cue = document.querySelector("[data-cue]");

const app = createScene({ canvas });

if (!app) {
  hud?.remove();
  canvas?.remove();
  const counts = document.querySelector("[data-counts]");
  if (counts) counts.innerHTML =
    "<div><dt>Renderer</dt><dd>unavailable</dd></div>" +
    "<div><dt>Reason</dt><dd>no WebGL context</dd></div>";
  const note = document.querySelector("#cost .note");
  if (note) note.textContent =
    "This browser did not give the page a WebGL context, so the scene is not running. " +
    "The description of how it is built is above either way.";
} else {
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    app.setProgress(p);
    if (p > 0.01) cue?.classList.add("is-done");
  };

  if (REDUCED) {
    /* No loop and no scrub: one composed frame at the moment the technique is
       most legible — the blade out, mid-cut — and the page reads as a print. */
    app.setProgress(0.7);
    app.snap();
    app.render();
    hud?.classList.add("is-live");
    if (stageOut) stageOut.textContent = "Nukitsuke";
    if (ruleOut) ruleOut.style.width = "70%";
  } else {
    addEventListener("scroll", readScroll, { passive: true });
    addEventListener("resize", readScroll, { passive: true });
    readScroll();
    app.start();
    hud?.classList.add("is-live");
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) app.start(); else app.stop();
    }).observe(canvas);
  }

  /* ---- readouts ---- */
  const cells = {};
  document.querySelectorAll("[data-c]").forEach((el) => { cells[el.dataset.c] = el; });
  const setCount = (k, v) => {
    const el = cells[k];
    if (el && el.textContent !== String(v)) el.textContent = v;
  };

  let countsVisible = false;
  const countsEl = document.querySelector("[data-counts]");
  if (countsEl && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { countsVisible = e.isIntersecting; }).observe(countsEl);
  } else countsVisible = true;

  let acc = 0, frames = 0, fps = 0;
  app.onFrame((dt) => {
    acc += dt; frames++;
    if (acc >= 0.5) { fps = Math.round(frames / acc); acc = 0; frames = 0; }

    const p = app.state.p;
    if (stageOut) {
      let name = STAGES[0].name;
      for (const s of STAGES) if (p >= s.at) name = s.name;
      if (stageOut.textContent !== name) stageOut.textContent = name;
    }
    if (ruleOut) ruleOut.style.width = (p * 100).toFixed(1) + "%";

    if (countsVisible) {
      const c = app.counts();
      setCount("calls", c.calls);
      setCount("lines", c.lines.toLocaleString());
      setCount("points", c.points.toLocaleString());
      setCount("tris", c.tris.toLocaleString());
      setCount("textures", c.textures);
      setCount("fps", fps ? fps + " fps" : "—");
    }
  });

  window.__ichi = app;   // teardown handle for the audit
}
