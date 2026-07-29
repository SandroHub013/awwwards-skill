/* ============================================================
   orbit — wiring.

   Native scroll position moves the camera outward from the Sun and
   stops on each planet. Nothing is intercepted: the page scrolls
   exactly as far as it was pushed.
   ============================================================ */
import { createOrbit } from "./scene.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const NAMES = ["Mercurio", "Venere", "Terra", "Marte", "Giove", "Saturno", "Urano", "Nettuno"];

const canvas = document.getElementById("stage");
const hud = document.querySelector("[data-hud]");
const hudName = document.querySelector("[data-hudname]");
const rule = document.querySelector("[data-rule]");
const cue = document.querySelector("[data-cue]");

const data = await fetch("./planets.json").then((r) => r.json()).catch(() => null);
const app = data ? createOrbit({ canvas, data }) : null;

if (!app) {
  /* No WebGL, or the data did not load. The lesson is the text, so say what is
     missing instead of leaving a black rectangle behind the words. */
  hud?.remove();
  canvas?.remove();
  const intro = document.querySelector(".intro .warn p");
  if (intro) intro.innerHTML =
    "<b>Il modello 3D non è partito su questo browser.</b> Tutti i numeri e le " +
    "spiegazioni qui sotto funzionano lo stesso: la tabella in fondo è quella del JPL.";
} else {
  /* The planets section spans 8 screens. Map scroll across *that* section, so
     the intro and the reading below it do not eat part of the journey. */
  const planetsEl = document.querySelector(".planets");

  const readScroll = () => {
    const r = planetsEl.getBoundingClientRect();
    const travel = planetsEl.offsetHeight - innerHeight * 0.35;
    const p = Math.min(1, Math.max(0, (-r.top + innerHeight * 0.5) / travel));
    app.setProgress(p);
    if (scrollY > 20) cue?.classList.add("is-done");
  };

  if (REDUCED) {
    // One composed frame on Saturn: the most legible planet in the set.
    app.setProgress(0.68);
    app.snap();
    app.render();
    hud?.classList.add("is-live");
    if (hudName) hudName.textContent = "Saturno";
    if (rule) rule.style.width = "68%";
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

  app.onFrame((dt, focus) => {
    const p = app.state.p;
    const name = p < 0.03 ? "Il Sole" : (NAMES[focus] ?? "Il Sole");
    if (hudName && hudName.textContent !== name) hudName.textContent = name;
    if (rule) rule.style.width = (p * 100).toFixed(1) + "%";
  });

  window.__orbit = app;   // teardown handle for the audit
}
