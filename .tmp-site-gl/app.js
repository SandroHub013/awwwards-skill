/* ═══════════════════════════════════════════════════════════
   awwwards.skill — showcase behaviour
   No dependencies. Reveals are native CSS scroll-driven
   animations; this file only handles what CSS cannot do.
   ═══════════════════════════════════════════════════════════ */

/* ── score calculator: the signature moment ─────────────── */
const WEIGHTS = { design: 0.4, usability: 0.3, creativity: 0.2, content: 0.1 };

const TIERS = [
  { min: 0,   i: 0, title: "Not submittable yet.",            note: "This is a concept or craft problem, not a polish problem. Start at phase zero." },
  { min: 6.0, i: 1, title: "Nearly there.",                    note: "Find your two lowest rows and fix those before anything else." },
  { min: 6.5, i: 2, title: "Honorable Mention territory.",     note: "Remember the user vote has to clear 6.5 independently too." },
  { min: 7.0, i: 3, title: "Site of the Day contender.",       note: "Developer Award is in reach if the performance and accessibility rows are clean." },
  { min: 7.6, i: 4, title: "Strong SOTD / SOTM contender.",    note: "Now protect it: freeze deploys during the five-day voting window." },
];

function initCalculator() {
  const form = document.getElementById("calc");
  const dial = document.querySelector("[data-dial]");
  const total = document.querySelector("[data-total]");
  const verdict = document.querySelector("[data-verdict]");
  const tiers = [...document.querySelectorAll("[data-tier]")];
  if (!form || !dial) return;

  const outs = Object.fromEntries(
    [...document.querySelectorAll("[data-out]")].map((el) => [el.dataset.out, el])
  );

  const update = () => {
    const data = new FormData(form);
    let score = 0;

    for (const [key, weight] of Object.entries(WEIGHTS)) {
      const value = Number(data.get(key));
      score += value * weight;
      if (outs[key]) outs[key].textContent = value.toFixed(1);
    }

    const tier = [...TIERS].reverse().find((t) => score >= t.min) ?? TIERS[0];

    total.textContent = score.toFixed(2);
    dial.style.setProperty("--v", (score / 10).toFixed(4));
    dial.dataset.tier = String(tier.i);
    verdict.innerHTML = `<b>${tier.title}</b>${tier.note}`;

    tiers.forEach((el) => el.toggleAttribute("data-active", Number(el.dataset.tier) === tier.i));
  };

  form.addEventListener("input", update);
  update();
}

/* ── copy buttons ───────────────────────────────────────── */
function initCopy() {
  for (const button of document.querySelectorAll("[data-copy]")) {
    const label = button.querySelector(".copy__label") ?? button;
    const source = document.querySelector(button.dataset.copy);
    if (!source) continue;

    button.addEventListener("click", async () => {
      const text = source.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // clipboard blocked (insecure context, permissions): select instead
        const range = document.createRange();
        range.selectNodeContents(source);
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(range);
        label.textContent = "Select + copy";
        return;
      }
      label.textContent = "Copied";
      button.dataset.state = "done";
      setTimeout(() => {
        label.textContent = "Copy";
        delete button.dataset.state;
      }, 1600);
    });
  }
}

/* ── install tabs (full ARIA keyboard pattern) ──────────── */
function initTabs() {
  const root = document.querySelector("[data-tabs]");
  if (!root) return;

  const tabs = [...root.querySelectorAll('[role="tab"]')];

  const select = (tab, focus = true) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    }
    if (focus) tab.focus();
  };

  root.addEventListener("click", (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) select(tab);
  });

  root.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    select(tabs[(keys[e.key] + tabs.length) % tabs.length]);
  });
}

/* ── measured metrics: report this page's real numbers ──── */
function initMetrics() {
  const cell = (name) => document.querySelector(`[data-measured="${name}"]`);
  const set = (name, value) => { const el = cell(name); if (el) el.textContent = value; };

  // LCP / CLS / INP straight from the browser's own observers
  try {
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) set("lcp", `${(last.startTime / 1000).toFixed(2)} s`);
    }).observe({ type: "largest-contentful-paint", buffered: true });

    // No shift means the observer never fires, so seed the cell with the truth: zero.
    let cls = 0;
    set("cls", "0.000");
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) cls += entry.value;
      set("cls", cls.toFixed(3));
    }).observe({ type: "layout-shift", buffered: true });

    // INP is undefined until the visitor actually interacts. Say so rather than print a zero.
    let inp = 0;
    set("inp", "awaiting input");
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) inp = Math.max(inp, entry.duration);
      if (inp > 0) set("inp", `${Math.round(inp)} ms`);
    }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  } catch {
    /* older browsers: the dash placeholder stays, which is honest */
  }

  // transfer size and JS weight from the resource timeline
  addEventListener("load", () => {
    setTimeout(() => {
      const entries = performance.getEntriesByType("resource");
      const nav = performance.getEntriesByType("navigation")[0];

      // encodedBodySize is the body as sent, so it stays correct whether the server
      // compressed it or not. transferSize is avoided because a cached reload reports
      // only the ~300-byte revalidation, which would flatter the page dishonestly.
      const bytes = (e) => e.encodedBodySize || e.transferSize || 0;

      const totalBytes = (nav ? bytes(nav) : 0) + entries.reduce((sum, e) => sum + bytes(e), 0);
      const jsBytes = entries
        .filter((e) => e.initiatorType === "script" || e.name.endsWith(".js"))
        .reduce((sum, e) => sum + bytes(e), 0);

      if (totalBytes > 0) set("weight", `${(totalBytes / 1024).toFixed(0)} KB`);
      if (jsBytes > 0) set("js", `${(jsBytes / 1024).toFixed(1)} KB`);
    }, 400);
  });
}

/* ── boot ───────────────────────────────────────────────── */
initCalculator();
initCopy();
initTabs();
initMetrics();
