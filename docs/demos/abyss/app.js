/* ============================================================
   abyss — wiring.

   Two inputs, both mapped rather than intercepted:
     scroll   → depth   (native position, the page scrolls normally)
     pointer  → the lamp (the only thing that decides what is visible)

   The scene is an enhancement. Without WebGL the page is still the
   argument, and it says so instead of showing a black rectangle.
   ============================================================ */
import { createAbyss } from "./scene.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MAX_M = 700;                     // metres at the bottom of the descent

const canvas = document.getElementById("stage");
const hud = document.querySelector("[data-hud]");
const depthOut = document.querySelector("[data-depth]");
const lampOut = document.querySelector("[data-lamp]");
const cue = document.querySelector("[data-cue]");

const abyss = createAbyss({ canvas });

if (!abyss) {
  /* No WebGL. Say so where the page claims a scene, rather than leaving a
     dark rectangle and letting the reader assume it is the design. */
  hud?.remove();
  canvas?.remove();
  document.body.style.background = "var(--void)";
  const counts = document.querySelector("[data-counts]");
  if (counts) {
    counts.innerHTML =
      "<div><dt>Renderer</dt><dd>unavailable</dd></div>" +
      "<div><dt>Reason</dt><dd>no WebGL context</dd></div>";
  }
  const note = document.querySelector("#cost .note");
  if (note) note.textContent =
    "This browser did not give the page a WebGL context, so the scene above is not " +
    "running. Everything the page argues is in the text either way.";
} else {
  const { state } = abyss;

  /* ---- depth from native scroll position ---- */
  const scrollable = () =>
    document.documentElement.scrollHeight - innerHeight;

  const readScroll = () => {
    const max = scrollable();
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    abyss.setDepth(p);
  };

  /* ---- the lamp from the pointer ---- */
  let touched = false;
  const aim = (x, y) => {
    touched = true;
    cue?.classList.add("is-done");
    abyss.setLamp(
      (x / innerWidth) * 2 - 1,
      -((y / innerHeight) * 2 - 1)
    );
  };

  if (!REDUCED) {
    addEventListener("pointermove", (e) => aim(e.clientX, e.clientY), { passive: true });
    addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      if (t) aim(t.clientX, t.clientY);
    }, { passive: true });

    /* Until the visitor takes it, the lamp sweeps on its own — slowly, so the
       page is never a black rectangle waiting to be discovered, and the
       interaction is legible within about three seconds. */
    let t0 = performance.now();
    const sweep = () => {
      if (!touched) {
        const t = (performance.now() - t0) / 1000;
        // biased right, because the copy lives on the left: the unattended sweep
        // should light the half of the frame nobody is reading
        abyss.setLamp(0.42 + Math.sin(t * 0.42) * 0.34, Math.sin(t * 0.27) * 0.22 - 0.05);
      }
      requestAnimationFrame(sweep);
    };
    sweep();
  } else {
    /* A composed frame, aimed at the wall the copy is not standing on. Snapped,
       not eased: with a single render the lerp only travels a few percent and
       the "composed" frame would sit at the surface. */
    abyss.setLamp(0.46, -0.08);
    abyss.setDepth(0.3);
    abyss.state.depth = abyss.state.depthTarget;
    abyss.state.lampSmooth.copy(abyss.state.lamp);
  }

  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", readScroll, { passive: true });
  if (!REDUCED) readScroll();

  /* ---- readout ---- */
  const fmtLamp = (x, y) => {
    const h = x < -0.25 ? "left" : x > 0.25 ? "right" : "centre";
    const v = y > 0.2 ? "up" : y < -0.2 ? "down" : "level";
    return h === "centre" && v === "level" ? "centred" : `${h} · ${v}`;
  };

  let acc = 0, fps = 0, frames = 0;
  abyss.onFrame((dt) => {
    acc += dt; frames++;
    if (acc >= 0.5) { fps = Math.round(frames / acc); acc = 0; frames = 0; }

    if (depthOut) depthOut.textContent = Math.round(state.depth * MAX_M);
    if (lampOut) lampOut.textContent = fmtLamp(state.lampSmooth.x, state.lampSmooth.y);

    // the live counters, only while their section is on screen
    if (countsVisible) {
      const c = abyss.counts();
      setCount("calls", c.calls);
      setCount("tris", c.tris.toLocaleString());
      setCount("points", c.points.toLocaleString());
      setCount("textures", c.textures);
      setCount("programs", c.programs);
      setCount("fps", fps ? fps + " fps" : "—");
    }
  });

  const cells = {};
  document.querySelectorAll("[data-c]").forEach((el) => { cells[el.dataset.c] = el; });
  const setCount = (k, v) => {
    const el = cells[k];
    if (el && el.textContent !== String(v)) el.textContent = v;
  };

  let countsVisible = false;
  const countsEl = document.querySelector("[data-counts]");
  if (countsEl && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { countsVisible = e.isIntersecting; })
      .observe(countsEl);
  } else {
    countsVisible = true;
  }

  /* ---- run only while the canvas is on screen ---- */
  if (REDUCED) {
    // one composed frame, then stop. Not a dead page: the copy is the page.
    abyss.render();
    hud?.classList.add("is-live");
  } else {
    abyss.start();
    hud?.classList.add("is-live");
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) abyss.start(); else abyss.stop();
    }).observe(canvas);
  }

  window.__abyss = abyss;   // teardown handle for the audit
}
