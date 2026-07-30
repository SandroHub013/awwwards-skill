/* stacco — the cut engine. Vanilla, no dependencies.

   Same doctrine as demo 09 (references/19-scroll-scrub.md): native scroll
   position is the transport. We READ scrollY and map it onto clip time; we never
   intercept the wheel. One difference runs through the whole file, and it is the
   concept:

     soglia dissolves between segments. This one CUTS.

   A dissolve is a hundred milliseconds in which a poster can stand in for a clip
   that has not finished arriving. A cut has no such window — it lands on frame
   one or it lands on a still. So:

     · the look-ahead radius is asymmetric (AHEAD 2.4vh, BEHIND 0.8vh)
     · visibility is a switch, not an opacity ramp
     · the copy and the slate cut with the picture, because a film in which the
       image cuts and the caption fades is a film with two editors

   Techniques kept from the scroll-world pattern: blob-loaded clips (always
   seekable), seek coalescing behind the decoder, stills as live posters until
   the first painted frame, iOS priming on the first gesture. */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
const smallMQ = window.matchMedia("(max-width: 860px)");
const isMobile = () => coarse || smallMQ.matches;

const VH_PER_SEC = 0.25;   // scroll weight: 41 baked seconds ≈ 10.25 viewport heights
const AHEAD = 2.4, BEHIND = 0.8;

/* The shot list. It is the same table the renderer used, minus the geometry —
   duration, lens and move are what the slate prints, so the caption on screen
   cannot drift from the file it is captioning. */
const SHOTS = [
  { id: "01-partenza", secs: 5.0, lens: 28, move: "LOCK + PUSH", eyebrow: "prima luce",
    head: "She is given a basket and a road",
    body: "First light on the mother’s cottage. The wood begins where the light stops, and the road only goes one way.",
    alt: "A cottage at first light with its door open, a small red-cloaked figure walking away down a dirt path toward dark trees." },
  { id: "02-margine", secs: 4.5, lens: 50, move: "STATIC LOW", eyebrow: "il limite del bosco",
    head: "The wood does not have a door, it has an edge",
    body: "Fifty millimetres, held still, low to the ground. Everything in the frame stays exactly where it is, and she gets smaller anyway.",
    alt: "A long lens held low at the treeline: dark trunks, and a small red figure walking into the gap between them." },
  { id: "03-sentiero", secs: 5.0, lens: 35, move: "TRACK LEFT", eyebrow: "dentro",
    head: "Walk beside her and the wood walks past",
    body: "The camera moves at exactly her pace, so she is the only still thing in the frame and the trunks do all the moving.",
    alt: "A tracking shot alongside the girl: she walks a pale path while dark trunks wipe across the foreground and light falls in shafts." },
  { id: "04-dall-alto", secs: 4.0, lens: 24, move: "CRANE DOWN", eyebrow: "nessun orizzonte",
    head: "From up here she is four red pixels",
    body: "The only shot in the film with no horizon, and it arrives on a hard cut out of a side-track — the axis turns ninety degrees in a single frame.",
    alt: "Straight down over the canopy: black treetops, a thread of pale path between them, and one small red figure walking along it." },
  { id: "05-occhi", secs: 3.5, lens: 85, move: "STATIC LONG", eyebrow: "un inserto",
    head: "Something in the undergrowth is already awake",
    body: "An insert: eighty-five millimetres, no camera move, no context. A continuous take cannot hold a shot like this — it has nowhere to put it.",
    alt: "Extreme close-up in near darkness: the blunt outline of a wolf’s head, and two amber eyes opening." },
  { id: "06-incontro", secs: 5.0, lens: 21, move: "SLOW ARC", eyebrow: "ventun millimetri",
    head: "A wide lens makes whoever is nearest a monster",
    body: "Nobody is exaggerated here. He is put close to a twenty-one and she is put far from it, and the lens says the rest.",
    alt: "Low wide angle: the wolf’s body fills the right of the frame while the small red figure stands far back on the path." },
  { id: "07-scorciatoia", secs: 4.0, lens: 18, move: "RACE LOW", eyebrow: "diciotto millimetri",
    head: "He knows a shorter way and takes it at speed",
    body: "Knee height, eighteen millimetres, and the whole frame is foreground. The fastest shot in the film is also the one with the least in it.",
    alt: "A low racing camera through undergrowth, trunks whipping past, the wolf running ahead toward a cottage in the gloom." },
  { id: "08-radura", secs: 4.5, lens: 40, move: "CRANE DOWN", eyebrow: "ultima luce",
    head: "One lit window, and the door already open",
    body: "The crane comes down out of the branches to eye level. Nothing in the clearing moves. The door is the only thing in the frame doing any talking.",
    alt: "Dusk in a clearing: the grandmother’s cottage with one warmly lit window and a door standing ajar." },
  { id: "09-che-occhi", secs: 5.5, lens: 58, move: "PUSH IN", eyebrow: "l’ultimo stacco",
    head: "The ears are wrong and everybody knows it",
    body: "One lamp, one push, one shape under the blanket. The film ends on the line the whole tale was built to arrive at, and does not say it.",
    alt: "A lamplit bedroom: a shape under the blanket, a bonnet on the pillow, two ears that are much too long, and two lit eyes." },
];
const FILM_SECS = SHOTS.reduce((a, s) => a + s.secs, 0);
{
  let t = 0;
  for (const s of SHOTS) { s.t0 = t; t += s.secs; s.w = s.secs * VH_PER_SEC; }
}

const film = document.querySelector("[data-film]");
const gate = document.querySelector("[data-gate]");
const prog = document.querySelector("[data-prog]");
const listEl = document.querySelector("[data-list]");
const slate = {
  shot: document.querySelector("[data-slate-shot]"),
  lens: document.querySelector("[data-slate-lens]"),
  move: document.querySelector("[data-slate-move]"),
  tc: document.querySelector("[data-slate-tc]"),
  cut: document.querySelector("[data-slate-cut]"),
};
const card = document.querySelector("[data-card]");
const copyEl = document.querySelector("[data-copy]");
const copy = {
  eyebrow: document.querySelector("[data-eyebrow]"),
  head: document.querySelector("[data-head]"),
  body: document.querySelector("[data-body]"),
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const pad2 = (n) => String(n).padStart(2, "0");
const timecode = (t) =>
  `${pad2(Math.floor(t / 60))}:${pad2(Math.floor(t % 60))}.${Math.floor((t % 1) * 10)}`;

// ── build the shot figures (shot 01 exists in the HTML as the LCP still) ─────
const mobileOnce = isMobile();
const posterURL = (s) => (mobileOnce ? `media/m/${s.id}.poster.avif` : `media/${s.id}.poster.avif`);
for (const s of SHOTS) {
  s.el = gate.querySelector(`[data-shot="${s.id}"]`);
  if (!s.el) {
    s.el = document.createElement("figure");
    s.el.className = "shot";
    s.el.dataset.shot = s.id;
    const img = document.createElement("img");
    img.className = "shot__still";
    img.alt = s.alt; img.decoding = "async"; img.loading = "lazy";
    img.width = mobileOnce ? 720 : 1920; img.height = mobileOnce ? 900 : 804;
    img.src = posterURL(s);
    s.el.appendChild(img);
    gate.appendChild(s.el);
  } else if (mobileOnce) {
    const img = s.el.querySelector(".shot__still");
    img.src = posterURL(s);
    img.width = 720; img.height = 900;
  }
  s.img = s.el.querySelector(".shot__still");
  s.video = null; s.loading = false; s.ready = false; s.cur = 0; s.target = 0;
}

// the shot list: nine real buttons that scroll to real document positions
SHOTS.forEach((s, i) => {
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.className = "list__dot";
  b.type = "button";
  b.dataset.jump = String(i);
  b.innerHTML = `<span aria-hidden="true">${pad2(i + 1)}</span>`;
  b.setAttribute("aria-label", `Shot ${i + 1} of 9 — ${s.lens} mm, ${s.move.toLowerCase()}`);
  li.appendChild(b);
  listEl.appendChild(li);
  b.addEventListener("click", () => {
    window.scrollTo({ top: s.start + (s.end - s.start) * 0.06, behavior: reduce ? "auto" : "smooth" });
  });
});
const dots = [...listEl.querySelectorAll("[data-jump]")];

// ── clip loading: blob → objectURL, so seeks never depend on byte-ranges ────
const AV1 = document.createElement("video").canPlayType('video/mp4; codecs="av01.0.05M.08"');
const clipURL = (s) => (isMobile()
  ? `media/m/${s.id}.h264.mp4`
  : `media/${s.id}.${AV1 ? "av1" : "h264"}.mp4`);

let userReady = false;
function primeVideo(v) {
  if (!isMobile() || !v) return;
  try {
    const p = v.play();
    if (p && p.then) p.then(() => { try { v.pause(); } catch {} }).catch(() => {});
  } catch {}
}
function onFirstGesture() {
  if (userReady) return;
  userReady = true;
  for (const s of SHOTS) primeVideo(s.video);
}
window.addEventListener("pointerdown", onFirstGesture, { once: true, passive: true });
window.addEventListener("touchstart", onFirstGesture, { once: true, passive: true });

/* One clip at a time, nearest first.

   The look-ahead is 2.4 viewport-heights, so at the top of the page three shots
   want loading at once. Fetching them together is a stampede: on Fast 3G the
   FIRST clip then finishes at 9.8s instead of the ~3.4s it needs on its own, and
   the film opens on a still it should have been past. A queue costs six lines
   and is the difference between the shots arriving in the order they are needed
   and all of them arriving late together. */
const queue = [];
let inFlight = 0;
function want(s) {
  if (reduce || s.loading || s.ready || s.queued) return;
  s.queued = true;
  queue.push(s);
  pump();
}
function pump() {
  if (inFlight >= 1 || !queue.length) return;
  const y = window.scrollY || 0;
  queue.sort((a, b) => Math.abs(a.start - y) - Math.abs(b.start - y));
  const s = queue.shift();
  inFlight++;
  loadClip(s).finally(() => { inFlight--; pump(); });
}

function loadClip(s) {
  if (reduce || s.loading || s.ready) return Promise.resolve();
  s.loading = true;
  return fetch(clipURL(s))
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
    .then((blob) => {
      const v = document.createElement("video");
      v.className = "shot__clip";
      v.muted = true; v.playsInline = true; v.preload = "auto";
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      v.src = URL.createObjectURL(blob);
      v.addEventListener("loadedmetadata", () => {
        // a clip that arrives mid-shot starts where the scroll already is —
        // revealing at frame 0 and catching up is the loudest bug in this pattern
        s.cur = s.target;
        try { v.currentTime = clamp(s.cur, 0, 0.999) * (v.duration || 1); } catch {}
        s.ready = true;
        read();
      });
      v.addEventListener("seeked", () => s.el.classList.add("has-clip"), { once: true });
      v.addEventListener("loadeddata", () => {
        try { v.pause(); } catch {}
        if (userReady) primeVideo(v);
      });
      s.el.appendChild(v);
      s.video = v;
    })
    .catch(() => { s.loading = false; });
}

// ── layout ──────────────────────────────────────────────────────────────────
let vh = window.innerHeight, totalW = 0, laidOutW = window.innerWidth;
function layout() {
  vh = window.innerHeight;
  laidOutW = window.innerWidth;
  let off = 0;
  for (const s of SHOTS) { s.start = off * vh; off += s.w; s.end = off * vh; }
  totalW = off;
  film.style.height = `${(totalW + 1) * vh}px`;   // +1vh so the last shot completes
  read();
}

// ── read: scroll position → the visible shot, its clip target, and the chrome ─
let ticking = false, shownIndex = -1;
function read() {
  const y = window.scrollY || window.pageYOffset;

  let ci = 0;
  for (let i = 0; i < SHOTS.length; i++) if (y >= SHOTS[i].start) ci = i;

  for (let i = 0; i < SHOTS.length; i++) {
    const s = SHOTS[i];
    // asymmetric: far forward, barely back. A cut gives no warning, so the next
    // shot has to already be here; the previous one no longer matters.
    if (y > s.start - AHEAD * vh && y < s.end + BEHIND * vh) want(s);
    s.target = clamp((y - s.start) / (s.end - s.start));
    if (!s.video || !s.ready) {
      // the still gets a slow scale, so a not-yet-loaded shot is still a shot
      const sc = reduce ? 1 : 1.015 + s.target * 0.045;
      s.img.style.transform = `scale(${sc.toFixed(3)})`;
    }
  }

  // the main title belongs to shot 01 and leaves inside it, so the first cut
  // never has to carry a title off the screen as well as a shot
  card.style.opacity = reduce ? String(SHOTS[0].target < 0.5 ? 1 : 0)
    : (1 - clamp((SHOTS[0].target - 0.24) / 0.4)).toFixed(3);

  if (ci !== shownIndex) cut(ci);

  slate.tc.textContent = timecode(clamp(yToTime(y), 0, FILM_SECS));
  prog.style.transform = `scaleX(${clamp(y / (totalW * vh))})`;
  ticking = false;
}

/* The cut itself. Everything on screen changes in the same frame: the picture,
   the caption, the slate. Under reduced motion the shots cross-dissolve instead
   — that is the one place in this build where a dissolve is the right answer,
   because there the stills are the whole film. */
function cut(i) {
  const prev = shownIndex;
  shownIndex = i;
  const s = SHOTS[i];

  for (let k = 0; k < SHOTS.length; k++) SHOTS[k].el.classList.toggle("is-on", k === i);

  slate.shot.textContent = `SHOT ${pad2(i + 1)}/09`;
  slate.lens.textContent = `${s.lens} mm`;
  slate.move.textContent = s.move;
  copy.eyebrow.textContent = s.eyebrow;
  copy.head.textContent = s.head;
  copy.body.textContent = s.body;
  copyEl.setAttribute("aria-label",
    `Shot ${i + 1} of 9, ${s.lens} millimetre, ${s.move.toLowerCase()}`);

  dots.forEach((d, k) => d.classList.toggle("is-active", k === i));

  // the edit gets one blink of acknowledgement, and only when it is a real cut
  if (prev >= 0 && !reduce) {
    slate.cut.classList.remove("is-flash");
    void slate.cut.offsetWidth;
    slate.cut.classList.add("is-flash");
  }
}

/* Tried and dropped: warming the next shot's decoder with a play()/pause() half
   a viewport-height before its cut, on the theory that a cut cannot afford the
   long frames a cold decoder spends on its first play. Measured over five
   autoplay runs it was neutral at best — 4.1/4.1/4.3% long frames without it,
   4.1/4.6/5.9% with — because the warm-up costs the frames it was meant to
   save. The clip is already decoded once on arrival (the load seek), and that
   turns out to be enough. Recorded here as a note rather than as code. */

// ── raf: autoplay plays natively; manual scroll seeks ───────────────────────
function raf() {
  const eps = isMobile() ? 0.02 : 0.008;   // coarser on phones = fewer decodes
  for (let i = 0; i < SHOTS.length; i++) {
    const s = SHOTS[i];
    if (!s.video || !s.ready) continue;

    if (auto.on && i === shownIndex) {
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
      // handoff back to scrub: freeze exactly where playback got to
      try { s.video.pause(); } catch {}
      s.video.playbackRate = 1;
      s.cur = clamp(s.video.currentTime / (s.video.duration || 1));
    }
    if (s.video.seeking) continue;                       // never queue behind the decoder
    if (i !== shownIndex && Math.abs(s.cur - s.target) < 0.002) continue;
    s.cur += (s.target - s.cur) * (reduce ? 1 : 0.20);
    const dur = s.video.duration || 1;
    const t = clamp(s.cur, 0, 0.999) * dur;
    if (Math.abs(s.video.currentTime - t) > eps) { try { s.video.currentTime = t; } catch {} }
  }
  autoStep();
  requestAnimationFrame(raf);
}

window.addEventListener("scroll", () => {
  if (!ticking) { ticking = true; requestAnimationFrame(read); }
}, { passive: true });

// Mobile browsers fire resize when the URL bar slides; relayouting there yanks
// the scroll position, so on touch only a width change (rotation) relayouts.
function onResize() {
  if (coarse && window.innerWidth === laidOutW) return;
  layout();
}
window.addEventListener("resize", onResize);
window.addEventListener("orientationchange", layout);
window.addEventListener("load", layout);

// ── autoplay: the film runs itself at its baked pace ────────────────────────
const timeToY = (t) => {
  for (const s of SHOTS) {
    if (t <= s.t0 + s.secs || s === SHOTS[SHOTS.length - 1])
      return s.start + clamp((t - s.t0) / s.secs) * (s.end - s.start);
  }
  return totalW * vh;
};
function yToTime(y) {
  for (const s of SHOTS) {
    if (y <= s.end || s === SHOTS[SHOTS.length - 1])
      return s.t0 + clamp((y - s.start) / (s.end - s.start)) * s.secs;
  }
  return FILM_SECS;
}

const autoBtn = document.querySelector("[data-auto]");
const auto = { on: false, t0: 0, base: 0, wasOn: false };
function setAuto(on) {
  if (reduce) on = false;
  if (on === auto.on) return;
  auto.on = on;
  if (on) { auto.base = yToTime(window.scrollY || 0); auto.t0 = performance.now(); }
  autoBtn.setAttribute("aria-pressed", String(on));
  autoBtn.setAttribute("aria-label", on ? "Pause the film (spacebar)" : "Resume the film (spacebar)");
  document.body.classList.toggle("is-auto", on);
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
window.addEventListener("load", () => { if (!reduce && (window.scrollY || 0) < 10) setAuto(true); });

layout();
cut(0);
requestAnimationFrame(raf);
