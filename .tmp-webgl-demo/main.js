/* ============================================================
   ONE ticker drives everything: Lenis, GSAP, and (if present) WebGL.
   Two RAF loops = DOM/canvas desync = the classic amateur artifact.
   ============================================================ */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { initGL } from "./gl.js";

gsap.registerPlugin(ScrollTrigger);

document.documentElement.classList.add("js");

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
const FINE_POINTER = matchMedia("(hover: hover) and (pointer: fine)");

/* ---------- scroll spine ---------- */
let lenis = null;

function initScroll() {
  if (REDUCED.matches) return;                 // hand scrolling back to the browser
  lenis = new Lenis({
    autoRaf: false,                            // GSAP drives the loop
    duration: 1.1,
    smoothWheel: true,
    syncTouch: false,                          // keep native inertia on touch
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));   // seconds → ms
  gsap.ticker.lagSmoothing(0);
}

/* ---------- preloader: real progress, skippable, self-completing ---------- */
function initPreloader() {
  const root = document.querySelector("[data-preloader]");
  const bar = document.querySelector("[data-preload-bar]");
  const num = document.querySelector("[data-preload-num]");
  if (!root) return Promise.resolve();

  const assets = [...document.querySelectorAll("img[data-critical], video[data-critical]")];
  const total = assets.length || 1;
  let loaded = assets.length ? 0 : 1;
  const shown = { v: 0 };

  const paint = () => {
    bar.style.transform = `scaleX(${shown.v})`;
    num.textContent = String(Math.round(shown.v * 100)).padStart(3, "0");
  };
  const tick = () =>
    gsap.to(shown, { v: loaded / total, duration: 0.4, ease: "power2.out", onUpdate: paint });

  assets.forEach((el) => {
    const done = () => { loaded++; tick(); };
    if (el.complete || el.readyState >= 3) done();
    else { el.addEventListener("load", done, { once: true }); el.addEventListener("error", done, { once: true }); }
  });
  tick();

  const ready = Promise.all([
    document.fonts.ready,
    new Promise((res) => (document.readyState === "complete" ? res() : addEventListener("load", res, { once: true }))),
  ]);
  const cap = new Promise((res) => setTimeout(res, 4000));            // never trap the user
  const skip = new Promise((res) => {
    addEventListener("pointerdown", res, { once: true });
    addEventListener("keydown", res, { once: true });
  });

  return Promise.race([ready, cap, skip]).then(() => {
    shown.v = 1; paint();
    root.classList.add("is-done");
    const d = REDUCED.matches ? 0.15 : 0.7;
    return gsap.to(root, { autoAlpha: 0, duration: d, ease: "expo.inOut" })
      .then(() => root.remove());
  });
}

/* ---------- split-text hero (GSAP SplitText is free since 2025) ---------- */
async function initSplitHeadings() {
  const targets = document.querySelectorAll("[data-split]");
  if (!targets.length || REDUCED.matches) return;

  let SplitText;
  try { ({ SplitText } = await import("gsap/SplitText")); }
  catch { return; }                                   // graceful: heading stays as-is
  gsap.registerPlugin(SplitText);

  await document.fonts.ready;                         // split AFTER fonts, or lines rewrap

  targets.forEach((el) => {
    const split = new SplitText(el, { type: "lines", mask: "lines", linesClass: "line", autoSplit: true });
    gsap.from(split.lines, {
      yPercent: 110,
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.07,
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });
}

/* ---------- one reveal, used everywhere ---------- */
function initReveals() {
  const els = gsap.utils.toArray("[data-reveal]");

  if (REDUCED.matches) {
    gsap.set(els, { autoAlpha: 1, y: 0, clearProps: "all" });
    return;
  }

  els.forEach((el) => {
    // guard: if it is already in view at init (deep link, refresh), show it immediately
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.9) { gsap.set(el, { autoAlpha: 1, y: 0 }); return; }

    gsap.fromTo(el,
      { autoAlpha: 0, y: 24 },
      {
        autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onStart: () => gsap.set(el, { willChange: "transform, opacity" }),
        onComplete: () => gsap.set(el, { willChange: "auto" }),   // ALWAYS release
      });
  });
}

/* ---------- marquee: constant speed, velocity-reactive, pausable ---------- */
function initMarquee() {
  const track = document.querySelector("[data-marquee]");
  if (!track || REDUCED.matches) return;

  const half = track.scrollWidth / 2;
  const tween = gsap.to(track, { x: -half, duration: 18, ease: "none", repeat: -1 });

  track.closest(".marquee")?.addEventListener("pointerenter", () => tween.timeScale(0.25));
  track.closest(".marquee")?.addEventListener("pointerleave", () => tween.timeScale(1));

  ScrollTrigger.create({
    trigger: track,
    onToggle: (self) => (self.isActive ? tween.play() : tween.pause()),   // no offscreen work
  });
}

/* ---------- magnetic elements: clamped, hit area stays under the visual ---------- */
function initMagnetic() {
  if (!FINE_POINTER.matches || REDUCED.matches) return;

  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const s = { x: 0, y: 0 };
    const apply = () => gsap.set(el, { x: s.x, y: s.y });
    const max = 18;

    el.addEventListener("pointermove", (e) => {
      const b = el.getBoundingClientRect();
      gsap.to(s, {
        x: gsap.utils.clamp(-max, max, (e.clientX - (b.left + b.width / 2)) * 0.35),
        y: gsap.utils.clamp(-max, max, (e.clientY - (b.top + b.height / 2)) * 0.35),
        duration: 0.4, ease: "power3.out", onUpdate: apply,
      });
    });
    el.addEventListener("pointerleave", () =>
      gsap.to(s, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)", onUpdate: apply }));
  });
}

/* ---------- custom cursor ---------- */
function initCursor() {
  const el = document.querySelector("[data-cursor]");
  if (!el || !FINE_POINTER.matches || REDUCED.matches) return;

  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const target = { ...pos };
  let scale = 1, tScale = 1;

  addEventListener("pointermove", (e) => { target.x = e.clientX; target.y = e.clientY; }, { passive: true });

  gsap.ticker.add(() => {
    pos.x += (target.x - pos.x) * 0.18;
    pos.y += (target.y - pos.y) * 0.18;
    scale += (tScale - scale) * 0.15;
    el.style.transform =
      `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${scale})`;
  });

  document.querySelectorAll("a, button, [data-cursor-state]").forEach((n) => {
    n.addEventListener("pointerenter", () => { tScale = 2.6; });
    n.addEventListener("pointerleave", () => { tScale = 1; });
  });
}

/* ---------- local clock: a tiny live detail, tabular so it never jitters ---------- */
function initClock() {
  const el = document.querySelector("[data-clock]");
  if (!el) return;
  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome", hour12: false,
  });
  const set = () => (el.textContent = `${fmt.format(new Date())} CET`);
  set();
  setInterval(set, 30_000);
}

/* ---------- resize / refresh discipline ---------- */
function initRefresh() {
  let t;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => ScrollTrigger.refresh(), 200);
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

/* ---------- boot ---------- */
initScroll();
initRefresh();
initClock();

initPreloader().then(() => {
  initGL({ canvas: document.querySelector("[data-gl-canvas]") });
  initSplitHeadings();
  initReveals();
  initMarquee();
  initMagnetic();
  initCursor();
  ScrollTrigger.refresh();
});

/* React to a live change of the motion preference (users toggle it during review). */
REDUCED.addEventListener("change", () => location.reload());
