/* gate — the consistency gate, running. Vanilla, no dependencies.

   The signature moment is one sequenced pass over seven rows. What matters about
   this file is what it does *not* do: it does not tween a counter from 0 to 7.

   His site prints a consistency gate in its footer — "1 check · 18 comparisons ·
   0 contradictions · 1 excused" — and a contradiction refuses `astro build`. The
   check is: an announcement date must fall in the year of the fact it hangs on,
   or the year before it (invited in N−1 to serve at the N edition). So this file
   reads the two halves of each comparison off the row's own data attributes,
   evaluates that predicate for real, and writes the answer it computed. The
   counter is the number of comparisons genuinely discharged, and row 07's
   `excused` is the predicate failing, not a scripted beat.

   Consequences worth stating, since they are the reason for the design:
   - The authored HTML is the *resolved* ledger. This file only ever adds the
     unresolved state on top. Remove it and the page is finished, not empty.
   - It also checks itself: if the answer it computes disagrees with the answer
     authored in the HTML, that is exactly the class of drift the gate exists to
     catch, and it says so in the console instead of quietly overwriting.
   - Nothing here reads or writes layout per frame. One class per row per step. */

const root = document.documentElement;

/* ── chrome ───────────────────────────────────────────────────────────────────
   His toggle, his localStorage key, so a visitor arriving from his site keeps
   the choice they made there. The theme-color meta follows, because its absence
   is the tell that the dark theme was an afterthought. */

const themeMeta = document.querySelector('meta[name="theme-color"]');
const paintChrome = () => {
  if (themeMeta) {
    themeMeta.content = getComputedStyle(root).getPropertyValue("--page").trim();
  }
};
paintChrome();

document.getElementById("theme-toggle")?.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
  paintChrome();
});

/* ── the check ────────────────────────────────────────────────────────────────
   announced ∈ {fact − 1, fact}. Nothing else. The set is printed on the row so
   the reader can disagree with the predicate rather than trust the verdict —
   which is the entire argument of the site this intro is for. */

const holds = (fact, announced) => announced === fact || announced === fact - 1;

const answer = (fact, announced) => {
  const ok = holds(fact, announced);
  return `${announced} ${ok ? "∈" : "∉"} {${fact - 1}, ${fact}} · ${ok ? "holds" : "excused"}`;
};

const gate = document.querySelector("[data-gate]");
const rows = gate ? [...gate.querySelectorAll(".row")] : [];

const checks = rows.map((row) => {
  const fact = Number(row.dataset.fact);
  const announced = Number(row.dataset.announced.slice(0, 4));
  const ok = holds(fact, announced);
  const computed = answer(fact, announced);

  // The row's own claim about itself, and the copy authored beside it. If either
  // disagrees with what the predicate just returned, the ledger has drifted from
  // the record — say so. Refusing to render would punish the reader for a bug in
  // this file; a warning names it without hiding the page.
  const claimed = row.dataset.holds === "yes";
  const authored = row.querySelector(".row__value").textContent.replace(/\s+/g, " ").trim();
  if (claimed !== ok || authored !== computed) {
    console.warn(
      `[gate] row ${row.querySelector(".row__n").textContent.trim()} drifted — ` +
        `authored "${authored}" (holds=${claimed}), computed "${computed}" (holds=${ok})`
    );
  }

  return { row, ok, computed, value: row.querySelector(".row__value") };
});

const total = checks.length;
const bad = checks.filter((c) => !c.ok && !c.row.querySelector(".row__why")).length;
const excused = checks.filter((c) => !c.ok && c.row.querySelector(".row__why")).length;

/* ── the readout ──────────────────────────────────────────────────────────── */

const meterN = document.querySelector("[data-meter-n]");
const meterBad = document.querySelector("[data-meter-bad]");
const meterExc = document.querySelector("[data-meter-exc]");
const meterFill = document.querySelector("[data-meter-fill]");
const verdict = document.querySelector("[data-verdict]");

const readout = (n, exc) => {
  if (meterN) meterN.textContent = String(n);
  if (meterExc) meterExc.textContent = String(exc);
  if (meterFill) meterFill.style.transform = `scaleX(${total ? n / total : 1})`;
};

const settle = () => {
  if (meterBad) meterBad.textContent = String(bad);
  readout(total, excused);
  if (verdict) verdict.textContent = bad ? "astro build — refused" : "astro build — passes";
  gate?.setAttribute("aria-busy", "false");
  // Disarming is what grants the page: every pending rule and every held column
  // hangs off this one class, so the gate has exactly one way to end.
  root.classList.remove("gate-armed");
  try { sessionStorage.setItem("gate:passed", "1"); } catch {}
};

/* Write the computed answers over the authored ones regardless of whether the
   sequence runs. On a repeat visit, under reduced motion, and after a skip, the
   values on screen are still the ones this file worked out. */
for (const c of checks) c.value.innerHTML = c.computed.replace(/· (holds|excused)$/, "· <b>$1</b>");

/* ── the sequence ─────────────────────────────────────────────────────────────
   Whether it runs at all was already decided in the head, by the arming script:
   it declined for a visitor who asked for less motion and for one who has already
   watched it in this tab, because an intro you have seen is a delay. This file
   asks the class rather than re-deriving the condition, so the CSS and the
   sequence cannot disagree about whether a gate is running.

   Both paths land on exactly the same page, which is the test that no information
   lives only inside the animation. */

if (!gate || !total || !root.classList.contains("gate-armed")) {
  settle();
} else {
  const DECLARE = 60;   // ledger appears
  const STAGGER = 30;   // ...one row at a time
  const START = 240;    // first comparison
  const STEP = 130;     // between comparisons
  const DRAW = 180;     // hairline draw, matches --dur-row
  const CAP = 1900;     // hard cap: the gate can never hold the page longer

  gate.setAttribute("aria-busy", "true");
  if (meterBad) meterBad.textContent = "0";
  readout(0, 0);
  if (verdict) verdict.textContent = "checking…";

  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    for (const t of timers) clearTimeout(t);
    settle();
  };

  // Any input ends it. Not a hidden affordance — it is the same contract as a
  // skippable preloader, and the page underneath is complete either way.
  for (const evt of ["pointerdown", "keydown", "wheel", "touchstart"]) {
    addEventListener(evt, finish, { once: true, passive: true });
  }
  at(CAP, finish);

  checks.forEach((c, i) => {
    at(DECLARE + i * STAGGER, () => c.row.classList.add("is-shown"));

    const t = START + i * STEP;
    at(t, () => c.row.classList.add("is-drawing"));
    at(t + DRAW, () => {
      c.row.classList.add("is-done");
      readout(
        i + 1,
        checks.slice(0, i + 1).filter((x) => !x.ok).length
      );
      if (i === total - 1) at(60, finish);
    });
  });
}
