/* ============================================================
   nothing here was filmed.

   Three jobs, in order of how much they matter:
     1. the hero loop plays, and only when it is on screen
     2. the index plays — one card at a time, scrubbing to the pointer
     3. the player is a real control surface, keyboard included

   No library. Under prefers-reduced-motion nothing autoplays and
   every poster stays put, which is the designed state, not a broken one.
   ============================================================ */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CAN_HOVER = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* The ledger is the page's spine: cards and table are both built from it,
   so a clip cannot appear on the page without its receipt appearing too. */
const LEDGER = await fetch("ledger.json").then((r) => r.json()).catch(() => null);

const fmtBytes = (n) =>
  n >= 1048576 ? (n / 1048576).toFixed(2) + " MB" : Math.round(n / 1024) + " KB";
const fmtTime = (s) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return m + ":" + String(Math.floor(s % 60)).padStart(2, "0");
};

/* ============================================================
   1 — the transport: native scroll position drives the film

   The signature moment. The three clips are one 18s file where every
   frame is a keyframe, so scroll can land anywhere without waiting for
   a GOP. Scroll is *mapped*, never hijacked: the page scrolls exactly as
   it would with this code deleted, and the film advances with it.
   ============================================================ */
{
  const scene = document.querySelector("[data-scene]");
  const stage = document.querySelector("[data-hero]");
  const video = stage?.querySelector("video");

  const CHAPTERS = LEDGER
    ? LEDGER.clips.map((c, i) => ({ at: i / LEDGER.clips.length, name: c.title }))
    : [{ at: 0, name: "" }];

  if (video && scene) {
    const ready = () => video.classList.add("is-ready");
    if (video.readyState >= 2) ready();
    else video.addEventListener("loadeddata", ready, { once: true });

    if (REDUCED) {
      /* No pin, no scrub, no autoplay: the poster and the cards below carry
         the whole reel. The scene collapses so nothing scrolls past a frozen
         frame for three viewport heights. */
      scene.style.height = "auto";
      stage.style.position = "static";
      stage.style.height = "auto";
      stage.style.aspectRatio = "16 / 9";
      video.remove();
      document.querySelector("[data-hint]")?.remove();
      document.querySelector("[data-transport]")?.remove();
    } else {
      /* The poster is the LCP element, so the film is not allowed to compete
         with it for bandwidth. Measured: fetching during first paint put LCP at
         2.2s on Fast 3G; deferring to load keeps the poster the LCP. */
      const begin = () => { video.preload = "auto"; video.load(); };
      if (document.readyState === "complete") begin();
      else addEventListener("load", begin, { once: true });

      const tc = document.querySelector("[data-tc]");
      const rule = document.querySelector("[data-rule]");
      const chapter = document.querySelector("[data-chapter]");

      let target = 0, applied = -1, ticking = false, live = false;

      const frame = () => {
        ticking = false;
        const d = video.duration;
        if (!isFinite(d)) return;

        // Only seek on a real change: a redundant currentTime write still costs
        // a decode, and at 60Hz that is what turns a scrub into a stutter.
        if (Math.abs(target - applied) > 0.0008) {
          applied = target;
          video.currentTime = target * d;
        }
        const t = target * d;
        if (tc) tc.textContent =
          String(Math.floor(t / 60)).padStart(2, "0") + ":" +
          String(Math.floor(t % 60)).padStart(2, "0");
        if (rule) rule.style.width = (target * 100).toFixed(2) + "%";
        if (chapter) {
          let name = CHAPTERS[0].name;
          for (const c of CHAPTERS) if (target >= c.at) name = c.name;
          if (chapter.textContent !== name) chapter.textContent = name;
        }
      };

      const onScroll = () => {
        const r = scene.getBoundingClientRect();
        const travel = scene.offsetHeight - innerHeight;
        const p = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
        target = p;

        // The transport only appears once the scene is actually the thing on
        // screen, so it does not sit over the poster before anything can move.
        const nowLive = r.top <= 8 && r.bottom > innerHeight * 0.5;
        if (nowLive !== live) { live = nowLive; stage.classList.toggle("is-running", live); }

        if (ticking) return;
        ticking = true;
        requestAnimationFrame(frame);
      };

      addEventListener("scroll", onScroll, { passive: true });
      addEventListener("resize", onScroll, { passive: true });
      video.addEventListener("loadedmetadata", onScroll, { once: true });
      onScroll();

      /* If the film cannot be scrubbed — a browser that refuses to seek, or a
         connection that never buffers it — it becomes an ordinary muted loop
         rather than a frozen frame. */
      addEventListener("load", () => {
        setTimeout(() => {
          if (video.seekable.length && video.seekable.end(0) > 0) return;
          video.loop = true;
          video.play().catch(() => {});
        }, 4000);
      }, { once: true });
    }
  }
}

/* ============================================================
   2 — the index plays
   ============================================================ */
{
  const list = document.querySelector("[data-cards]");

  if (list && LEDGER) {
    list.innerHTML = LEDGER.clips.map((c, i) => `
      <li class="card" data-card>
        <div class="card__frame">
          <img src="media/${c.slug}.poster.avif" width="1920" height="1080"
               loading="${i === 0 ? "eager" : "lazy"}" decoding="async" alt="${c.alt}">
          <video muted loop playsinline preload="${i === 0 ? "metadata" : "none"}"
                 width="1920" height="1080" aria-hidden="true" tabindex="-1">
            <source src="media/${c.slug}.prev.av1.mp4"  type='video/mp4; codecs="av01.0.05M.08"'>
            <source src="media/${c.slug}.prev.h264.mp4" type='video/mp4; codecs="avc1.4d401f"'>
          </video>
          <p class="card__badge">Generated</p>
          <div class="card__scrub" aria-hidden="true"><i></i></div>
        </div>
        <h3 class="card__title">${c.title}</h3>
        <p class="card__meta">
          <span>${c.duration}s</span><span>${c.resolution}</span><span>${fmtBytes(c.bytes.prev_av1)} preview</span>
        </p>
        <p class="card__prompt">${c.prompt}</p>
      </li>`).join("");

    const cards = [...list.querySelectorAll("[data-card]")];
    let live = null;

    const stop = (card) => {
      if (!card) return;
      const v = card.querySelector("video");
      v.pause();
      card.classList.remove("is-live");
      card.querySelector(".card__scrub i").style.width = "0";
      if (live === card) live = null;
    };

    /* Only ever one playing: the one under the pointer. */
    const start = (card) => {
      if (live === card) return;
      stop(live);
      live = card;
      card.classList.add("is-live");
      // Do not touch .preload here: mutating it on a live element re-runs the
      // resource selection algorithm, which resets currentTime and throws away
      // any seek the pointer just made. play() fetches what it needs anyway.
      card.querySelector("video").play().catch(() => {});
    };

    if (!REDUCED && CAN_HOVER) {
      for (const card of cards) {
        const v = card.querySelector("video");
        const bar = card.querySelector(".card__scrub i");
        const hint = document.createElement("p");
        hint.className = "card__hint";
        hint.textContent = "Plays on hover · move to scrub";
        card.append(hint);

        card.addEventListener("pointerenter", () => start(card));
        card.addEventListener("pointerleave", () => stop(card));

        /* Play and scrub are alternatives, not simultaneous: a loop that is
           playing while the pointer seeks it fights itself. So it plays on
           entry, and the first deliberate pointer move hands control over. */
        let queued = null, ticking = false, anchor = null, scrubbing = false;
        const seek = () => {
          ticking = false;
          if (queued == null || !isFinite(v.duration)) return;
          v.currentTime = queued * v.duration;
          bar.style.width = (queued * 100).toFixed(1) + "%";
        };
        card.addEventListener("pointerenter", () => { anchor = null; scrubbing = false; });
        card.addEventListener("pointerleave", () => { bar.style.width = "0"; });
        card.addEventListener("pointermove", (e) => {
          const r = card.querySelector(".card__frame").getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
          if (anchor === null) { anchor = x; return; }        // entry position, not intent
          if (!scrubbing && Math.abs(x - anchor) < 0.04) return;  // still just arriving
          if (!scrubbing) { scrubbing = true; v.pause(); }     // deliberate: take over
          queued = x;
          if (ticking) return;
          ticking = true;
          /* rAF, not requestVideoFrameCallback: rVFC only fires when a frame is
             presented, and a paused video presents none, so scrubbing a paused
             clip through rVFC deadlocks on the first seek. */
          requestAnimationFrame(seek);
        });
      }
    } else if (!REDUCED) {
      /* Touch: no hover exists. Tap plays inline, tap again pauses.
         Never a scroll hijack pretending to be playback. */
      for (const card of cards) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "card__hint";
        btn.textContent = "Tap to play";
        btn.setAttribute("aria-pressed", "false");
        card.append(btn);
        btn.addEventListener("click", () => {
          const on = live === card;
          if (on) { stop(card); btn.textContent = "Tap to play"; }
          else { start(card); btn.textContent = "Tap to pause"; }
          btn.setAttribute("aria-pressed", String(!on));
        });
      }
    }

    /* Nothing plays off screen, ever. */
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (!e.isIntersecting) stop(e.target);
    }, { rootMargin: "60px" });
    cards.forEach((c) => io.observe(c));
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(live); });
  }
}

/* ============================================================
   3 — the player
   ============================================================ */
{
  const root = document.querySelector("[data-player]");
  const v = root?.querySelector("video");

  if (v) {
    const playBtn = root.querySelector("[data-play]");
    const bigBtn = root.querySelector("[data-bigplay]");
    const icon = root.querySelector("[data-play-icon]");
    const seek = root.querySelector("[data-seek]");
    const cur = root.querySelector("[data-cur]");
    const dur = root.querySelector("[data-dur]");
    const fullBtn = root.querySelector("[data-full]");

    const paint = () => {
      const on = !v.paused && !v.ended;
      root.classList.toggle("is-playing", on);
      playBtn.setAttribute("aria-pressed", String(on));
      playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
      icon.innerHTML = on ? "&#10073;&#10073;" : "&#9654;";
    };
    const toggle = () => {
      if (!v.paused) { v.pause(); return; }
      if (v.ended || v.currentTime >= v.duration - 0.05) v.currentTime = 0;  // replay, not stall
      v.play().catch(() => {});
    };

    playBtn.addEventListener("click", toggle);
    bigBtn.addEventListener("click", toggle);
    v.addEventListener("play", paint);
    v.addEventListener("pause", paint);
    v.addEventListener("ended", paint);

    v.addEventListener("loadedmetadata", () => { dur.textContent = fmtTime(v.duration); });
    v.addEventListener("timeupdate", () => {
      cur.textContent = fmtTime(v.currentTime);
      if (document.activeElement !== seek && isFinite(v.duration)) {
        seek.value = Math.round((v.currentTime / v.duration) * 1000);
      }
    });
    seek.addEventListener("input", () => {
      if (isFinite(v.duration)) v.currentTime = (seek.value / 1000) * v.duration;
    });

    fullBtn.addEventListener("click", () => {
      // Fullscreen the container, so the controls come along with the picture
      const box = root.querySelector(".player__frame");
      if (document.fullscreenElement) document.exitFullscreen();
      else box.requestFullscreen?.().catch(() => {});
    });

    /* Keyboard, on the player as a whole: space toggles, arrows seek 5s. */
    root.tabIndex = 0;
    root.addEventListener("keydown", (e) => {
      if (e.target.matches("input, button") && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
      if (e.key === "ArrowRight") { e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 5); }
      if (e.key === "ArrowLeft") { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); }
    });

    paint();
  }
}

/* ============================================================
   4 — the receipts
   ============================================================ */
{
  const body = document.querySelector("[data-ledger] tbody");
  if (body && LEDGER) {
    body.innerHTML = LEDGER.clips.map((c) => `
      <tr>
        <td>${c.title}</td>
        <td>${LEDGER.model}</td>
        <td>${c.duration}s</td>
        <td>$${c.cost_usd.toFixed(2)}</td>
        <td>${fmtBytes(c.bytes.av1)}</td>
        <td>${fmtBytes(c.bytes.prev_av1)}</td>
        <td>${fmtBytes(c.bytes.poster)}</td>
      </tr>`).join("");

    const sum = (f) => LEDGER.clips.reduce((s, c) => s + f(c), 0);
    const foot = document.createElement("tfoot");
    foot.innerHTML = `
      <tr>
        <td>Total</td><td>&mdash;</td>
        <td>${sum((c) => c.duration)}s</td>
        <td>$${sum((c) => c.cost_usd).toFixed(2)}</td>
        <td>${fmtBytes(sum((c) => c.bytes.av1))}</td>
        <td>${fmtBytes(sum((c) => c.bytes.prev_av1))}</td>
        <td>${fmtBytes(sum((c) => c.bytes.poster))}</td>
      </tr>`;
    body.parentElement.append(foot);
  }
}
