/* ============================================================
   wonk — the straightening.

   Two independent controls, deliberately not sharing a value:
     hero word      ← the slider   (--hx-*)   you move it
     reading column ← scroll       (--ax-*)   it moves while you read

   Everything here is an enhancement. The stylesheet ships the page
   readable and the two states visible; this file only adds motion.
   ============================================================ */
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/+esm";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/ScrollTrigger.js/+esm";
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.3.25/+esm";

gsap.registerPlugin(ScrollTrigger);
document.documentElement.classList.add("js");

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* as shipped → as asked for */
const SHIPPED = { opsz: 9,   wght: 900, SOFT: 0,   WONK: 1 };
const ASKED   = { opsz: 144, wght: 300, SOFT: 100, WONK: 0 };

const fmt = (tag, v) => (tag === "WONK" ? v.toFixed(2) : Math.round(v).toString());

/* ---- smooth scroll, handed back to the browser when motion is off ---- */
let lenis = null;
if (!REDUCED) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ============================================================
   1 — the hero word, driven by the slider
   ============================================================ */
{
  const word = document.querySelector(".hero__word");
  const slider = document.querySelector("#wonk");
  const out = document.querySelector("#wonk-out");
  const cells = document.querySelectorAll(".hero__panel [data-ax]");

  if (word && slider) {
    const paint = (wonk) => {
      word.style.setProperty("--hx-wonk", wonk);
      out.value = wonk.toFixed(2);
      cells.forEach((c) => {
        const tag = c.dataset.ax;
        c.textContent = tag === "WONK" ? wonk.toFixed(2) : fmt(tag, SHIPPED[tag]);
      });
    };

    slider.addEventListener("input", () => paint(parseFloat(slider.value)));
    paint(parseFloat(slider.value));

    /* One breath on load so the control is discoverable inside 3s.
       Never under reduced motion, and never if the user got there first. */
    if (!REDUCED) {
      let touched = false;
      const markTouched = () => { touched = true; };
      slider.addEventListener("pointerdown", markTouched, { once: true });
      slider.addEventListener("keydown", markTouched, { once: true });

      const state = { v: 1 };
      gsap.timeline({ delay: 0.7 })
        .to(state, {
          v: 0, duration: 1.1, ease: "power2.inOut",
          onUpdate: () => { if (!touched) { slider.value = state.v; paint(state.v); } },
        })
        .to(state, {
          v: 1, duration: 0.9, ease: "power2.inOut",
          onUpdate: () => { if (!touched) { slider.value = state.v; paint(state.v); } },
        }, "+=0.35");
    }
  }
}

/* ============================================================
   2 — the reading column, scrubbed by scroll (the signature)
   ============================================================ */
{
  const col = document.querySelector(".read__col");
  const rail = document.querySelector(".read");
  const fill = document.querySelector("[data-rail-fill]");
  const cells = rail ? rail.querySelectorAll("[data-ax]") : [];

  if (col && !REDUCED) {
    const live = { ...SHIPPED };

    const paint = () => {
      for (const tag of Object.keys(live)) {
        col.style.setProperty(`--ax-${tag.toLowerCase()}`, live[tag]);
      }
      cells.forEach((c) => { c.textContent = fmt(c.dataset.ax, live[c.dataset.ax]); });
    };

    gsap.to(live, {
      ...ASKED,
      ease: "none",
      onUpdate: paint,
      scrollTrigger: {
        trigger: col,
        start: "top 78%",
        end: "bottom 62%",
        scrub: 0.6,
        onToggle: ({ isActive }) => {
          col.style.willChange = isActive ? "font-variation-settings" : "auto";
        },
      },
    });

    if (fill) {
      gsap.fromTo(fill, { scaleX: 0 }, {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: col, start: "top 78%", end: "bottom 62%", scrub: 0.6 },
      });
    }

    paint();
  }
}

/* ============================================================
   3 — the axis rows: one slider each, nothing else moves
   ============================================================ */
document.querySelectorAll(".axis").forEach((row) => {
  const slider = row.querySelector("[data-axis]");
  const spec = row.querySelector("[data-spec]");
  const out = row.querySelector("[data-out]");
  if (!slider || !spec) return;

  const tag = slider.dataset.axis;
  const base = { ...SHIPPED };

  const paint = () => {
    const v = parseFloat(slider.value);
    const s = { ...base, [tag]: v };
    spec.style.fontVariationSettings =
      `"opsz" ${s.opsz}, "wght" ${s.wght}, "SOFT" ${s.SOFT}, "WONK" ${s.WONK}`;
    if (out) out.textContent = fmt(tag, v);
  };

  slider.addEventListener("input", paint);
  slider.addEventListener("pointerdown", () => { spec.style.willChange = "font-variation-settings"; });
  slider.addEventListener("pointerup", () => { spec.style.willChange = "auto"; });
  paint();
});

/* ============================================================
   4 — reveals. Cheap, and independent of the scroll library.
   ============================================================ */
{
  const targets = document.querySelectorAll("[data-reveal]");
  if (REDUCED || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -12% 0px" });
    targets.forEach((el) => io.observe(el));
  }
}

/* Anchor links have to go through Lenis or they fight the smoothing. */
if (lenis) {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -24 });
    });
  });
}

/* Re-measure once the real face is in: line lengths change, triggers move. */
document.fonts?.ready.then(() => ScrollTrigger.refresh());
