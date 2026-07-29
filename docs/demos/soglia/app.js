/* soglia — the scrub engine. Vanilla, no dependencies.
   Doctrine (references/17-video.md): native scroll position is the transport.
   We READ scrollY and map it onto clip time; we never intercept the wheel.
   Techniques ported from the scroll-world pattern: blob-loaded clips (always
   seekable), seek coalescing behind the decoder, stills as live posters until
   the first painted frame, iOS priming on first gesture, doorway connectors
   whose seam frames are pixel-identical by construction. */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
const smallMQ = window.matchMedia("(max-width: 860px)");
const isMobile = () => coarse || smallMQ.matches;

const DIVE_W = 1.6, CONN_W = 0.9;      // viewport-heights of scroll per segment
const CROSSFADE = 0.12;                // seam dissolve width, in vh

// A connector's still is the NEXT scene's poster: under reduced motion the
// stills alone must tell the journey, so the dissolve walks scene to scene.
const SEGMENTS = [
  { id: "s0-porta",   kind: "dive", w: DIVE_W, secs: 7.0, still: "s0-porta",
    alt: "A Tuscan town gate at dawn, cypresses along a dirt road, the arch open." },
  { id: "c0-arco",    kind: "conn", w: CONN_W, secs: 3.5, still: "s1-strada",
    alt: "The main street seen through the gate arch, laundry lines across it." },
  { id: "s1-strada",  kind: "dive", w: DIVE_W, secs: 7.0, still: "s1-strada",
    alt: "The main street climbing between plastered houses, laundry overhead." },
  { id: "c1-vicolo",  kind: "conn", w: CONN_W, secs: 3.5, still: "s2-piazza",
    alt: "The square and the church facade framed by a dark passage." },
  { id: "s2-piazza",  kind: "dive", w: DIVE_W, secs: 7.5, still: "s2-piazza",
    alt: "The square: church, fountain, café tables, a lantern over one door." },
  { id: "c2-varco",   kind: "conn", w: CONN_W, secs: 3.5, still: "s3-bottega",
    alt: "The workshop doorway, a lit workbench beyond it." },
  { id: "s3-bottega", kind: "dive", w: DIVE_W, secs: 7.0, still: "s3-bottega",
    alt: "The workshop: a half-made chair on the bench, dust in the light shaft." },
];
const DIVES = SEGMENTS.filter((s) => s.kind === "dive");

const flight = document.querySelector("[data-flight]");
const stage = document.querySelector("[data-stage]");
const bar = document.querySelector("[data-bar]");
const hint = document.querySelector("[data-hint]");
const copies = [...document.querySelectorAll("[data-copy]")];
const dots = [...document.querySelectorAll("[data-jump]")];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

// ── build scene figures (segment 0 exists in the HTML as the LCP still) ─────
const mobileOnce = isMobile(); // posters chosen once at mount, like scroll-world
for (const s of SEGMENTS) {
  s.el = document.querySelector(`[data-scene="${s.id}"]`);
  if (!s.el) {
    s.el = document.createElement("figure");
    s.el.className = "scene";
    s.el.dataset.scene = s.id;
    const img = document.createElement("img");
    img.className = "scene__still";
    img.alt = s.alt; img.decoding = "async"; img.loading = "lazy";
    img.src = mobileOnce ? `media/m/${s.still}.poster.avif` : `media/${s.still}.poster.avif`;
    s.el.appendChild(img);
    stage.insertBefore(s.el, document.querySelector("[data-copylayer]"));
  } else if (mobileOnce) {
    const img = s.el.querySelector(".scene__still");
    img.src = `media/m/${s.still}.poster.avif`;
  }
  s.img = s.el.querySelector(".scene__still");
  s.video = null; s.loading = false; s.ready = false; s.cur = 0; s.target = 0; s.visible = false;
}

// ── clip loading: blob → objectURL, so seeks never depend on byte-ranges ────
const AV1 = document.createElement("video").canPlayType('video/mp4; codecs="av01.0.05M.08"');
const clipURL = (s) => isMobile()
  ? `media/m/${s.id}.h264.mp4`
  : `media/${s.id}.${AV1 ? "av1" : "h264"}.mp4`;

let userReady = false;
function primeVideo(v) {
  if (!isMobile() || !v) return;
  try { const p = v.play(); if (p && p.then) p.then(() => { try { v.pause(); } catch {} }).catch(() => {}); } catch {}
}
function onFirstGesture() {
  if (userReady) return;
  userReady = true;
  for (const s of SEGMENTS) primeVideo(s.video);
}
window.addEventListener("pointerdown", onFirstGesture, { once: true, passive: true });
window.addEventListener("touchstart", onFirstGesture, { once: true, passive: true });

function loadClip(s) {
  // Under prefers-reduced-motion clips never load: the stills cross-dissolve.
  if (reduce || s.loading || s.ready) return;
  s.loading = true;
  fetch(clipURL(s))
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
    .then((blob) => {
      const v = document.createElement("video");
      v.className = "scene__video";
      v.muted = true; v.playsInline = true; v.preload = "auto";
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      v.src = URL.createObjectURL(blob);
      v.addEventListener("loadedmetadata", () => {
        // start at the CURRENT scroll position, not frame 0 — a clip that
        // arrives mid-segment must never replay frames the user already saw
        s.cur = s.target;
        try { v.currentTime = clamp(s.cur, 0, 0.999) * (v.duration || 1); } catch {}
        s.ready = true;
        read();
      });
      // reveal only once a real frame has painted — on iOS a seeked-but-never
      // played muted video stays blank
      v.addEventListener("seeked", () => s.el.classList.add("has-clip"), { once: true });
      v.addEventListener("loadeddata", () => { try { v.pause(); } catch {} if (userReady) primeVideo(v); });
      s.el.appendChild(v);
      s.video = v;
    })
    .catch(() => { s.loading = false; });
}

// ── layout: each segment owns a scroll range of w viewport-heights ──────────
let vh = window.innerHeight, totalW = 0, laidOutW = window.innerWidth;
function layout() {
  vh = window.innerHeight;
  laidOutW = window.innerWidth;
  let off = 0;
  for (const s of SEGMENTS) { s.start = off * vh; off += s.w; s.end = off * vh; }
  totalW = off;
  flight.style.height = `${(totalW + 1) * vh}px`; // +1vh so the last scene completes
  read();
}

function jumpTo(i) {
  const seg = DIVES[i];
  window.scrollTo({ top: seg.start + (seg.end - seg.start) * 0.5, behavior: reduce ? "auto" : "smooth" });
}
dots.forEach((d, i) => d.addEventListener("click", () => jumpTo(i)));

// ── read: scroll position → targets, opacities, chrome. Runs on scroll+rAF ──
let ticking = false, activeIndex = -1, currentSeg = null;
function read() {
  const y = window.scrollY || window.pageYOffset;
  const fade = CROSSFADE * vh;

  let ci = 0;
  for (let i = 0; i < SEGMENTS.length; i++) if (y >= SEGMENTS[i].start) ci = i;
  currentSeg = SEGMENTS[ci];

  for (let i = 0; i < SEGMENTS.length; i++) {
    const s = SEGMENTS[i];
    if (y > s.start - 1.6 * vh && y < s.end + 1.6 * vh) loadClip(s);
    const local = clamp((y - s.start) / (s.end - s.start));
    s.target = local;
    let outside = 0;
    if (y < s.start) outside = s.start - y; else if (y > s.end) outside = y - s.end;
    const op = smooth(1 - outside / fade);
    s.el.style.opacity = op;
    s.visible = op > 0.001;
    s.el.style.zIndex = i === ci ? "12" : String(10 + Math.round(op));
    if (!s.video || !s.ready) {
      const sc = reduce ? 1 : 1.03 + local * 0.14;
      s.img.style.transform = `scale(${sc.toFixed(3)})`;
    }
  }

  // copy: card greets on landing, middles peak mid-scene, last one holds
  for (let i = 0; i < DIVES.length; i++) {
    const seg = DIVES[i];
    const pr = clamp((y - seg.start) / (seg.end - seg.start));
    const before = y < seg.start, after = y > seg.end;
    let cop;
    if (i === 0) cop = after ? 0 : smooth(1 - pr / 0.62);
    else if (i === DIVES.length - 1) cop = before ? 0 : smooth(pr / 0.45);
    else cop = before || after ? 0 : smooth(1 - Math.abs(pr - 0.5) / 0.5);
    const c = copies[i];
    c.style.opacity = cop;
    c.style.transform = reduce ? "none" : `translateY(${(0.5 - pr) * 3}vh)`;
    c.style.pointerEvents = cop > 0.5 ? "auto" : "none";
  }

  // route dots follow the nearest dive (a connector belongs to its exit)
  const cur = SEGMENTS[ci];
  const near = clamp(
    cur.kind === "dive" ? DIVES.indexOf(cur)
      : ((y - cur.start) / (cur.end - cur.start) > 0.5 ? DIVES.indexOf(DIVES.find(d => d.start > cur.start)) : DIVES.indexOf(DIVES.find(d => d.start > cur.start)) - 1),
    0, DIVES.length - 1);
  if (near !== activeIndex) {
    activeIndex = near;
    dots.forEach((d, k) => d.classList.toggle("is-active", k === near));
  }

  bar.style.transform = `scaleX(${clamp(y / (totalW * vh))})`;
  hint.style.opacity = clamp(1 - y / (0.5 * vh));
  ticking = false;
}

// ── raf: two modes. Autoplay: the active segment plays natively (buttery,
// decode-ahead) with drift correction; everything else stays parked. Manual
// scroll: chase the target with seeks, never queueing behind the decoder ─────
function raf() {
  const eps = isMobile() ? 0.02 : 0.008; // seconds; coarser on phones = fewer decodes
  for (const s of SEGMENTS) {
    if (!s.video || !s.ready) continue;

    if (auto.on && s === currentSeg) {
      const dur = s.video.duration || 1;
      const expected = clamp(s.target, 0, 0.999) * dur;
      if (s.video.paused) {
        try { s.video.currentTime = expected; } catch {}
        const p = s.video.play(); if (p && p.catch) p.catch(() => {});
      } else {
        const diff = expected - s.video.currentTime;
        if (Math.abs(diff) > 0.15) { try { s.video.currentTime = expected; } catch {} }
        else if (Math.abs(s.video.playbackRate - 1) > 0.001 || Math.abs(diff) > 0.02) {
          s.video.playbackRate = clamp(1 + diff * 0.5, 0.92, 1.08);
        }
      }
      s.cur = s.target;
      continue;
    }

    if (!s.video.paused) {
      // handoff back to scrub mode: freeze where playback actually got to
      try { s.video.pause(); } catch {}
      s.video.playbackRate = 1;
      s.cur = clamp(s.video.currentTime / (s.video.duration || 1));
    }
    if (s.video.seeking) continue;
    if (!s.visible && Math.abs(s.cur - s.target) < 0.002) continue;
    s.cur += (s.target - s.cur) * (reduce ? 1 : 0.18);
    const dur = s.video.duration || 1;
    const t = clamp(s.cur, 0, 0.999) * dur;
    if (Math.abs(s.video.currentTime - t) > eps) { try { s.video.currentTime = t; } catch {} }
  }
  autoStep();
  requestAnimationFrame(raf);
}

window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });

// Mobile browsers fire resize when the URL bar slides. Recomputing the track
// height there yanks the scroll position, so on touch only a width change
// (rotation) relayouts.
function onResize() {
  if (coarse && window.innerWidth === laidOutW) return;
  layout();
}
window.addEventListener("resize", onResize);
window.addEventListener("orientationchange", layout);
window.addEventListener("load", layout);

// ── autoplay: the film runs itself at its baked pace ─────────────────────────
// The document really scrolls — the scrollbar keeps telling the truth, and any
// user input that would move the page (wheel, touch drag, arrow keys) pauses.
const FILM_SECS = SEGMENTS.reduce((a, s) => a + s.secs, 0);
{
  let t0acc = 0;
  for (const s of SEGMENTS) { s.t0 = t0acc; t0acc += s.secs; }
}
const timeToY = (t) => {
  for (const s of SEGMENTS) {
    if (t <= s.t0 + s.secs || s === SEGMENTS[SEGMENTS.length - 1])
      return s.start + clamp((t - s.t0) / s.secs) * (s.end - s.start);
  }
  return totalW * vh;
};
const yToTime = (y) => {
  for (const s of SEGMENTS) {
    if (y <= s.end || s === SEGMENTS[SEGMENTS.length - 1])
      return s.t0 + clamp((y - s.start) / (s.end - s.start)) * s.secs;
  }
  return FILM_SECS;
};

const autoBtn = document.querySelector("[data-auto]");
const auto = { on: false, t0: 0, base: 0, wasOn: false };
function setAuto(on) {
  if (reduce) on = false;
  if (on === auto.on) return;
  auto.on = on;
  if (on) { auto.base = yToTime(window.scrollY || 0); auto.t0 = performance.now(); }
  autoBtn.setAttribute("aria-pressed", String(on));
  autoBtn.setAttribute("aria-label", on ? "Pause the flight (spacebar)" : "Resume the flight (spacebar)");
  hint.querySelector("span").textContent = on ? "space to pause" : "space to fly";
}
autoBtn.addEventListener("click", (e) => { e.stopPropagation(); setAuto(!auto.on); });
window.addEventListener("keydown", (e) => {
  if (e.code !== "Space" || e.target.closest("a,button,input,textarea,[contenteditable]")) return;
  e.preventDefault();
  setAuto(!auto.on);
});
// any input that would move the page means the user is driving now
window.addEventListener("wheel", () => setAuto(false), { passive: true });
window.addEventListener("touchmove", () => setAuto(false), { passive: true });
window.addEventListener("keydown", (e) => {
  if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(e.code)) setAuto(false);
});
document.addEventListener("click", (e) => {
  if (auto.on && !e.target.closest("a,button")) setAuto(false);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { auto.wasOn = auto.on; setAuto(false); }
  else if (auto.wasOn) setAuto(true);
});
function autoStep() {
  if (!auto.on) return;
  const t = auto.base + (performance.now() - auto.t0) / 1000;
  if (t >= FILM_SECS) { window.scrollTo(0, totalW * vh); setAuto(false); return; }
  window.scrollTo(0, timeToY(t));
}
// starts on load, from the top, unless reduced motion
window.addEventListener("load", () => { if (!reduce && (window.scrollY || 0) < 10) setAuto(true); });

layout();
requestAnimationFrame(raf);
