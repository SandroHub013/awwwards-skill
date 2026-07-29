/* petrini — the takeover engine. Vanilla, no dependencies.

   The whole signature moment is six CSS custom properties travelling on one
   easing curve. Because --bg/--surf/--ink/--ink-muted/--line/--accent are
   registered with @property as <color>, the browser interpolates them itself:
   this file never touches a colour value per frame, it sets six strings once
   per section change and the compositor does the rest.

   Consequences worth stating, since they are the reason for the design:
   - Zero scroll handlers. Section changes come from IntersectionObserver.
   - The themes are never written here. They are declared in styles.css on
     [data-theme] and read back out of the cascade, so CSS stays the single
     source of truth and JS cannot drift from it.
   - With this file removed the page still works: the chapters carry their own
     theme locally, so every identity still paints. Only the fixed chrome stops
     following along. */

const ROLES = ["--bg", "--surf", "--ink", "--ink-muted", "--line", "--accent"];
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ── Read the themes out of the cascade ──────────────────────────────────── */

const read = (el) => {
  const cs = getComputedStyle(el);
  const out = {};
  for (const role of ROLES) out[role] = cs.getPropertyValue(role).trim();
  return out;
};

/* Neutral comes from the inline critical block, so it is correct at any point
   in the page's life. The chapter themes live in styles.css, which is loaded
   non-blocking (media="print" → all) — so they must be read *on demand*, never
   cached at startup. Caching them here read six neutral values four times,
   because this script had run before the stylesheet applied. */
const neutral = read(root);
const sections = [...document.querySelectorAll("[data-theme], .hero, .thesis, .colophon")];
const themeOf = (el) => (el?.dataset.theme ? read(el) : neutral);

const meta = document.querySelector('meta[name="theme-color"]');

const apply = (set) => {
  for (const role of ROLES) root.style.setProperty(role, set[role]);
  // Keep the mobile browser chrome inside the identity too. Cheap, and its
  // absence is the tell that a dark section was an afterthought.
  if (meta) meta.content = set["--bg"];
};

/* ── Which identity owns the page ─────────────────────────────────────────
   Active = whatever crosses the viewport centre. A -50%/-50% root margin
   collapses the root box to a single line, so exactly one section can match
   and there is no ambiguity to arbitrate. */

let active = null;
const rail = [...document.querySelectorAll(".rail__dot")];

const setActive = (el) => {
  if (el === active) return;
  active = el;
  apply(themeOf(el));
  const id = el.id;
  for (const dot of rail) {
    const on = dot.dataset.goto === id;
    dot.setAttribute("aria-current", String(on));
  }
};

const centreObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) if (e.isIntersecting) setActive(e.target);
  },
  { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
);
for (const el of sections) centreObserver.observe(el);

/* ── Reveals and the anchor rule ──────────────────────────────────────────
   One pattern, fired once. The rule and the reveals share a single class pair
   so a section is one event, not a queue of independent tweens. */

const revealObserver = new IntersectionObserver(
  (entries, obs) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-in", "is-drawn");
      obs.unobserve(e.target);
    }
  },
  { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
);
document
  .querySelectorAll(".thesis, .chapter, .colophon")
  .forEach((el) => revealObserver.observe(el));

/* ── The hero line-mask ───────────────────────────────────────────────────
   Split on the authored <br>s rather than measuring wrapped lines: the copy is
   three deliberate lines, so there is nothing to re-measure on resize and
   nothing to re-split when a font loads (there are no web fonts).

   Opacity stays at 1 throughout and only transform moves — the headline is the
   LCP element, and a fade would push LCP out by the length of the animation. */

const title = document.querySelector("[data-split]");
if (title && !reduce) {
  const html = title.innerHTML.split(/<br\s*\/?>/i);
  title.innerHTML = html
    .map((line) => `<span class="mask"><span class="line">${line}</span></span>`)
    .join("");
  requestAnimationFrame(() => title.classList.add("is-set"));
}

/* ── The rail: jump, and preview ──────────────────────────────────────────── */

for (const dot of rail) {
  const target = document.getElementById(dot.dataset.goto);
  if (!target) continue;

  dot.addEventListener("click", () => {
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Move focus with the viewport, or keyboard users land back at the rail on
    // the next Tab. The heading takes focus, not the section, so the screen
    // reader announces what was jumped to.
    const heading = target.querySelector("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  });

  // Hover previews the takeover at 35% without committing to it: enough to
  // answer "what is this?" before spending a scroll on it. Pointer-only —
  // touch gets tap-to-jump, never a hover-gated affordance.
  if (!canHover || reduce) continue;
  dot.addEventListener("pointerenter", () => {
    if (active === target) return;
    const set = themeOf(target);
    const now = getComputedStyle(root);
    for (const role of ROLES) {
      const from = now.getPropertyValue(role).trim();
      root.style.setProperty(role, `color-mix(in oklch, ${set[role]} 35%, ${from})`);
    }
  });
  dot.addEventListener("pointerleave", () => {
    apply(themeOf(active));
  });
}
