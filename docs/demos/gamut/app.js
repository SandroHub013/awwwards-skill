/* ============================================================
   gamut — wiring.

   Scroll position closes the grey front onto the gamut's triangle;
   nothing is intercepted and nothing animates on its own. The number
   beside the diagram is the clipped area of the locus at that exact
   moment, so it cannot drift away from the picture.
   ============================================================ */
import {
  GAMUTS, coverage, encode, linearAt, locusPolygon, parseCMF, remainingShare, rowXY, shoelace,
} from "./color.js";
import { createDiagram } from "./diagram.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---- what the machine says about itself ---- */

const reported =
  matchMedia("(color-gamut: rec2020)").matches ? "rec2020" :
  matchMedia("(color-gamut: p3)").matches ? "p3" :
  matchMedia("(color-gamut: srgb)").matches ? "srgb" : null;

const canvasSpace = (() => {
  if (reported !== "p3" && reported !== "rec2020") return "srgb";
  try {
    const c = document.createElement("canvas").getContext("2d", { colorSpace: "display-p3" });
    return c?.getContextAttributes?.().colorSpace === "display-p3" ? "display-p3" : "srgb";
  } catch {
    return "srgb";
  }
})();

/* ---- the palette lives in CSS, including the values the canvas needs ---- */

function palette() {
  const cs = getComputedStyle(document.documentElement);
  const raw = (n) => cs.getPropertyValue(n).trim();
  const rgb = (n) => `rgb(${raw(n)})`;
  return {
    bg: rgb("--c-bg"), ink: rgb("--c-ink"), faint: rgb("--c-faint"),
    line: rgb("--c-line"), grid: rgb("--c-grid"), rule: rgb("--c-rule"),
    greyRGB: raw("--c-grey").split(/[\s,]+/).map(Number),
  };
}

/* ---- surround ---- */

const root = document.documentElement;
const surroundBtn = $("[data-surround-toggle]");
const surroundName = $("[data-surroundname]");
let dark = matchMedia("(prefers-color-scheme: dark)").matches;
let diagram = null;

function applySurround() {
  root.dataset.surround = dark ? "graphite" : "paper";
  surroundBtn?.setAttribute("aria-pressed", String(dark));
  if (surroundName) surroundName.textContent = dark ? "graphite" : "paper";
  diagram?.setTheme(palette());
}
applySurround();
surroundBtn?.addEventListener("click", () => {
  dark = !dark;
  applySurround();
});

/* ---- reveal ---- */

if (!REDUCED && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }),
    { rootMargin: "0px 0px -12% 0px" }
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
}

/* ---- the measurements ---- */

const csv = await fetch("./data/ciexyz31_1.csv")
  .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
  .catch(() => null);

const verdict = $("[data-verdict]");

if (!csv) {
  /* The page is an argument about numbers, so say which numbers are missing
     rather than leaving an empty frame under the headline. */
  const wait = $("[data-wait]");
  if (wait) wait.textContent = "the 1931 measurements did not load";
  if (verdict) {
    verdict.innerHTML =
      "<b>The 1931 measurements did not load</b>, so the diagram is not drawn. " +
      "Everything below still holds: sRGB covers about a third of what you can see.";
  }
} else {
  const rows = parseCMF(csv);
  const byNm = new Map(rows.map((r) => [r.nm, r]));
  const locus = locusPolygon(rows);
  const locusArea = shoelace(locus);
  const cover = Object.fromEntries(
    Object.keys(GAMUTS).map((id) => [id, coverage(GAMUTS[id], locus)])
  );

  /* every printed percentage, from the file that draws the picture */
  for (const id of Object.keys(GAMUTS)) {
    const set = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
    set(`[data-cov-${id}]`, pct(cover[id].xy));
    set(`[data-tab-${id}-xy]`, pct(cover[id].xy));
    set(`[data-tab-${id}-uv]`, pct(cover[id].uv));
  }

  const mine = GAMUTS[reported] ?? GAMUTS.srgb;
  if (verdict) {
    verdict.innerHTML = reported
      ? `Your browser reports ${mine.article} <b>${mine.label}</b> display. Its three lights can mix
         <b>${pct(cover[mine.id].xy)}</b> of the shape below. The rest is not dark and not
         dim on your screen. It is absent.`
      : `Your browser will not name your display's gamut, so this page assumes
         <b>sRGB</b>: <b>${pct(cover.srgb.xy)}</b> of the shape below, and the rest absent.`;
  }

  /* ---- the instrument ---- */

  const canvas = $("[data-diagram]");
  diagram = createDiagram({
    canvas, rows, locus, palette: palette(), colorSpace: canvasSpace,
  });
  $("[data-wait]")?.remove();
  diagram.setGamut(mine.id);
  const radio = $(`input[name="gamut"][value="${mine.id}"]`);
  if (radio) radio.checked = true;

  const stateEl = $("[data-state]");
  const covEl = $("[data-cov]");
  const covXY = $("[data-covxy]");
  const covUV = $("[data-covuv]");

  let lastState = "";
  function paintHud(k) {
    const g = diagram.state.gamut;
    const share = remainingShare(g, k, locus, locusArea);
    if (covEl) covEl.textContent = pct(share);
    const text =
      diagram.state.cut < 0.02 ? "Every colour a standard eye can see"
      : diagram.state.cut > 0.98 ? `What ${g.label} can emit`
      : `Removing what ${g.label} cannot mix`;
    if (stateEl && text !== lastState) {
      stateEl.textContent = text;
      lastState = text;
    }
  }

  function paintGamutCopy() {
    const g = diagram.state.gamut;
    if (covXY) covXY.textContent = pct(cover[g.id].xy);
    if (covUV) covUV.textContent = pct(cover[g.id].uv);
    canvas.setAttribute(
      "aria-label",
      `The CIE 1931 chromaticity diagram. The ${g.label} triangle covers ` +
      `${pct(cover[g.id].xy)} of it by area; the rest is drawn grey once the cut completes.`
    );
  }
  paintGamutCopy();

  /* ---- the probe ---- */

  const range = $("[data-nm]");
  const nmOut = $("[data-nmout]");
  const xyOut = $("[data-xy]");
  const xyzOut = $("[data-xyz]");
  const linOut = $("[data-lin]");
  const clipOut = $("[data-clip]");
  const linSpace = $("[data-linspace]");
  const swatch = $("[data-swatch]");
  const swatchCap = $("[data-swatchcap]");
  const negLine = $("[data-negline]");

  const num = (v, d = 3) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(d);

  function paintProbe() {
    const nm = +range.value;
    const row = byNm.get(nm);
    if (!row) return;
    const [x, y] = rowXY(row);
    const g = diagram.state.gamut;
    const lin = linearAt(g.fromXYZ, x, y);
    const outside = lin.some((v) => v < 0);

    diagram.setProbe(nm);
    nmOut.textContent = `${nm} nm`;
    xyOut.textContent = `${x.toFixed(4)}, ${y.toFixed(4)}`;
    xyzOut.textContent = [row.X, row.Y, row.Z].map((v) => v.toFixed(4)).join("  ");
    if (linSpace) linSpace.textContent = g.label;
    linOut.innerHTML = lin
      .map((v) => (v < 0 ? `<span class="neg">${num(v)}</span>` : num(v)))
      .join("  ");

    /* what the screen actually receives: negatives clipped away, normalised, encoded */
    const shown = lin.map((v) => Math.max(0, v));
    const m = Math.max(...shown) || 1;
    clipOut.textContent = shown
      .map((v) => String(Math.round(255 * encode(v / m))).padStart(3, " "))
      .join("  ");

    /* the swatch is painted in whatever space this canvas can address, which is
       not always the space the numbers above are in */
    const space = canvasSpace === "display-p3" ? "display-p3" : "srgb";
    const paintLin = linearAt(
      (canvasSpace === "display-p3" ? GAMUTS.p3 : GAMUTS.srgb).fromXYZ, x, y
    ).map((v) => Math.max(0, v));
    const pm = Math.max(...paintLin) || 1;
    swatch.style.background =
      `color(${space} ${paintLin.map((v) => encode(v / pm).toFixed(4)).join(" ")})`;

    range.setAttribute(
      "aria-valuetext",
      `${nm} nanometres, ${outside ? `outside ${g.label}` : `inside ${g.label}`}`
    );
    if (swatchCap) {
      swatchCap.textContent = outside
        ? `the substitute your display sends for ${nm} nm`
        : `${nm} nm sits on the edge of ${g.label}: this one is real`;
    }
    if (negLine) negLine.hidden = !outside;
  }

  range?.addEventListener("input", paintProbe);
  paintProbe();

  /* ---- switching the cut ---- */

  $("[data-choice]")?.addEventListener("change", (e) => {
    const id = e.target.value;
    if (!GAMUTS[id]) return;
    diagram.setGamut(id);
    paintGamutCopy();
    paintProbe();
    paintHud(diagram.state.k);
  });

  /* ---- scroll drives the cut ---- */

  const instrument = $(".instrument");
  const cutStep = $("#cut");

  if (REDUCED) {
    /* No scroll-linked movement. Both states are shown at once instead: the cut
       diagram at full size, the untouched locus beside it. */
    paintHud(diagram.setCut(1));
    const inset = $("[data-inset]");
    if (inset) {
      inset.hidden = false;
      requestAnimationFrame(() => diagram.drawFieldInto($(".inset__canvas")));
    }
  } else {
    let queued = false;
    const frame = () => {
      queued = false;
      const top = instrument.getBoundingClientRect().top;
      /* The cut lands with the first step, but never asks for more than about a
         screen and a bit of scrolling — on a tall monitor that step is enormous. */
      const span = Math.max(240, Math.min(cutStep.offsetHeight * 0.9, innerHeight * 1.15));
      paintHud(diagram.setCut(clamp(-top / span, 0, 1)));
    };
    addEventListener("scroll", () => {
      if (!queued) { queued = true; requestAnimationFrame(frame); }
      if (scrollY > 40) $("[data-cue]")?.classList.add("is-done");
    }, { passive: true });
    frame();
  }

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      diagram.resize();
      if (REDUCED) diagram.drawFieldInto($(".inset__canvas"));
    }, 120);
  }, { passive: true });

  /* ---- what the browser will admit ---- */

  const spec = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
  spec("[data-spec-gamut]", reported ? GAMUTS[reported].label : "not reported");
  spec("[data-spec-hdr]", matchMedia("(dynamic-range: high)").matches ? "high" : "standard");
  spec("[data-spec-depth]", `${screen.colorDepth} bit`);
  spec("[data-spec-dpr]", (devicePixelRatio || 1).toFixed(2));
  spec("[data-spec-paint]", canvasSpace === "display-p3" ? "Display P3" : "sRGB");

  window.__gamut = { diagram, cover, locusArea, rows: rows.length };
}
