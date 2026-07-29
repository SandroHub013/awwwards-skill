/* ============================================================
   gamut — the instrument.

   Four layers, composited every frame:
     under   grid and axis numbers        static, redrawn on resize
     field   the visible locus, in colour  static, rebuilt on gamut/paint change
     mask    flat grey over everything the cut gamut cannot emit
     over    locus outline, wavelength ticks, white point
   plus the triangle and the probe marker, which move.

   The field is built once at a fixed resolution and scaled into the plot, so
   resizing the window never re-runs the per-pixel pass.
   ============================================================ */
import { GAMUTS, coveringScale, encode, linearAt, rowXY, triangleAt } from "./color.js";

const FIELD_W = 800;                 /* internal resolution of the colour field */
const FIELD_H = 900;                 /* 0.8 x 0.9 of chromaticity space, isotropic */
const X_MAX = 0.8, Y_MAX = 0.9;

/* Two marks sit on the colour itself rather than on the page, so they do not
   follow the surround: dark for anything drawn over a pale chromaticity, light
   for the ring that has to survive on top of it. */
const ON_PALE = "rgb(28 28 30)";
const ON_DARK = "rgb(244 243 240)";

/* pow() three times per pixel is the whole cost of the build; this is the same
   curve read from a table instead. */
const LUT = new Uint8Array(1025);
for (let i = 0; i <= 1024; i++) LUT[i] = Math.round(255 * encode(i / 1024));

/* Below 480 nm the locus doubles back into the axis numbers, so the violet end
   is left unlabelled rather than labelled on top of something else. */
const TICKS = [480, 490, 500, 510, 520, 540, 560, 580, 600, 620, 700];
const TICKS_TIGHT = [480, 500, 520, 560, 600, 700];

export function createDiagram({ canvas, rows, locus, palette, colorSpace = "srgb" }) {
  const ctx = canvas.getContext("2d", { colorSpace, alpha: true });

  const layer = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return { c, x: c.getContext("2d", { colorSpace, alpha: true }) };
  };

  const field = layer(FIELD_W, FIELD_H);
  const mask = layer(FIELD_W, FIELD_H);
  const under = layer(1, 1);
  const over = layer(1, 1);

  /* out-of-gamut flags for the current cut gamut, kept so a theme change
     repaints the grey without re-running the colour maths */
  const outside = new Uint8Array(FIELD_W * FIELD_H);

  /* `k` is the scale of the grey front: it starts wide enough to sit outside the
     locus entirely and closes onto the gamut's own triangle at k = 1. Everything
     outside it is grey, so what the number says is what the picture shows. */
  const state = { gamut: GAMUTS.srgb, cut: 0, k: 1, k0: 1, probe: null, dpr: 1, geo: null };
  const byNm = new Map(rows.map((r) => [r.nm, r]));
  let pal = palette;

  /* ---- geometry: keep chromaticity space square, whatever the box is ---- */

  function measure() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(220, r.width), h = Math.max(220, r.height);
    const tight = w < 420;
    const padL = tight ? 26 : 38, padR = 10, padT = 10, padB = tight ? 22 : 26;
    const s = Math.min((w - padL - padR) / X_MAX, (h - padT - padB) / Y_MAX);
    const ox = padL + (w - padL - padR - s * X_MAX) / 2;
    const oy = padT + (h - padT - padB - s * Y_MAX) / 2 + s * Y_MAX;
    return { w, h, s, ox, oy, tight, px: (x) => ox + x * s, py: (y) => oy - y * s };
  }

  /* ---- the colour field ---- */

  function spans() {
    /* For each field row, the horizontal extent of the locus polygon. */
    const out = new Int32Array(FIELD_H * 2).fill(-1);
    for (let j = 0; j < FIELD_H; j++) {
      const y = Y_MAX * (1 - (j + 0.5) / FIELD_H);
      let lo = Infinity, hi = -Infinity;
      for (let i = 0, n = locus.length; i < n; i++) {
        const [x1, y1] = locus[i], [x2, y2] = locus[(i + 1) % n];
        if ((y1 > y) === (y2 > y)) continue;
        const x = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
      if (hi < lo) continue;
      out[j * 2] = Math.max(0, Math.round((lo / X_MAX) * FIELD_W));
      out[j * 2 + 1] = Math.min(FIELD_W - 1, Math.round((hi / X_MAX) * FIELD_W) - 1);
    }
    return out;
  }

  const rowSpans = spans();

  /* The colour field depends only on the space being painted in, which never
     changes while the page is open. Switching the cut re-runs `buildOutside`
     alone, which is the difference between a 25 ms interaction and an 85 ms one. */
  function buildColour(paintFrom) {
    const img = new ImageData(FIELD_W, FIELD_H, { colorSpace });
    const d = img.data;
    eachPixel((i, j, x, y) => {
      const [r, g, b] = linearAt(paintFrom, x, y);
      const m = Math.max(r, g, b);
      if (!(m > 0)) return;
      const k = 1 / m;
      const p = (j * FIELD_W + i) * 4;
      d[p] = LUT[Math.round(Math.max(0, r * k) * 1024)];
      d[p + 1] = LUT[Math.round(Math.max(0, g * k) * 1024)];
      d[p + 2] = LUT[Math.round(Math.max(0, b * k) * 1024)];
      d[p + 3] = 255;
    });
    field.x.putImageData(img, 0, 0);
  }

  /* A chromaticity is out of gamut exactly when it is outside the primaries'
     triangle, and a triangle is convex, so this is two fills per row rather
     than a matrix multiply per pixel. */
  function buildOutside(gamut) {
    outside.fill(0);
    const tri = [gamut.r, gamut.g, gamut.b];
    for (let j = 0; j < FIELD_H; j++) {
      const i0 = rowSpans[j * 2], i1 = rowSpans[j * 2 + 1];
      if (i0 < 0) continue;
      const y = Y_MAX * (1 - (j + 0.5) / FIELD_H);
      const base = j * FIELD_W;
      let lo = Infinity, hi = -Infinity;
      for (let e = 0; e < 3; e++) {
        const [x1, y1] = tri[e], [x2, y2] = tri[(e + 1) % 3];
        if ((y1 > y) === (y2 > y)) continue;
        const x = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
      if (hi < lo) { outside.fill(1, base + i0, base + i1 + 1); continue; }
      const a = Math.min(i1 + 1, Math.max(i0, Math.ceil((lo / X_MAX) * FIELD_W - 0.5)));
      const b = Math.max(i0 - 1, Math.min(i1, Math.floor((hi / X_MAX) * FIELD_W - 0.5)));
      if (a > i0) outside.fill(1, base + i0, base + a);
      if (b < i1) outside.fill(1, base + b + 1, base + i1 + 1);
    }
  }

  function eachPixel(fn) {
    for (let j = 0; j < FIELD_H; j++) {
      const y = Y_MAX * (1 - (j + 0.5) / FIELD_H);
      if (y < 1e-3) continue;
      const i0 = rowSpans[j * 2], i1 = rowSpans[j * 2 + 1];
      if (i0 < 0) continue;
      for (let i = i0; i <= i1; i++) fn(i, j, X_MAX * ((i + 0.5) / FIELD_W), y);
    }
  }

  const maskImg = new ImageData(FIELD_W, FIELD_H, { colorSpace });

  function buildMask() {
    const d = maskImg.data;
    d.fill(0);
    const [r, g, b] = pal.greyRGB;
    for (let n = 0, len = outside.length; n < len; n++) {
      if (!outside[n]) continue;
      const p = n * 4;
      d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
    }
    mask.x.putImageData(maskImg, 0, 0);
  }

  /* ---- static chrome ---- */

  const mono = (px) => `${px}px ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace`;

  function buildChrome() {
    const { w, h, s, tight, px, py } = state.geo;
    const dpr = state.dpr;
    for (const l of [under, over]) {
      l.c.width = Math.round(w * dpr); l.c.height = Math.round(h * dpr);
      l.x.setTransform(dpr, 0, 0, dpr, 0, 0);
      l.x.clearRect(0, 0, w, h);
    }

    /* grid + axis numbers, under the field */
    const u = under.x;
    u.font = mono(tight ? 8.5 : 10);
    u.lineWidth = 1;
    /* Each axis ends with its own name in place of the last number, so the two
       never sit on top of each other. */
    for (let i = 0; i <= 8; i++) {
      const v = i / 10;
      u.strokeStyle = pal.grid;
      u.beginPath(); u.moveTo(px(v), py(0)); u.lineTo(px(v), py(Y_MAX)); u.stroke();
      u.fillStyle = pal.faint;
      u.textAlign = "center"; u.textBaseline = "top";
      if (i === 8) u.fillText("x", px(v), py(0) + 7);
      else if (!tight || i % 2 === 0) u.fillText(v.toFixed(1), px(v), py(0) + 7);
    }
    for (let i = 0; i <= 9; i++) {
      const v = i / 10;
      u.strokeStyle = pal.grid;
      u.beginPath(); u.moveTo(px(0), py(v)); u.lineTo(px(X_MAX), py(v)); u.stroke();
      u.fillStyle = pal.faint;
      u.textAlign = "right"; u.textBaseline = "middle";
      if (i === 9) u.fillText("y", px(0) - 7, py(v));
      else if (!tight || i % 2 === 0) u.fillText(v.toFixed(1), px(0) - 7, py(v));
    }
    u.strokeStyle = pal.rule;
    u.beginPath(); u.moveTo(px(0), py(0)); u.lineTo(px(X_MAX), py(0)); u.stroke();
    u.beginPath(); u.moveTo(px(0), py(0)); u.lineTo(px(0), py(Y_MAX)); u.stroke();

    /* locus outline, wavelength ticks, white point — over the field */
    const o = over.x;
    o.lineJoin = "round";
    o.strokeStyle = pal.line;
    o.lineWidth = 1.4;
    o.beginPath();
    locus.forEach(([x, y], i) => (i ? o.lineTo(px(x), py(y)) : o.moveTo(px(x), py(y))));
    o.closePath();
    o.stroke();

    o.font = mono(tight ? 8.5 : 10);
    o.textBaseline = "middle";
    const list = tight ? TICKS_TIGHT : TICKS;
    for (const nm of list) {
      const row = rows.find((r) => r.nm === nm);
      if (!row) continue;
      const [x, y] = rowXY(row);
      const dx = x - 0.32, dy = y - 0.34;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len, ny = dy / len;
      const X = px(x), Y = py(y);
      o.strokeStyle = pal.line;
      o.lineWidth = 1;
      o.beginPath();
      o.moveTo(X, Y);
      o.lineTo(X + nx * 6, Y - ny * 6);
      o.stroke();
      o.fillStyle = pal.faint;
      o.textAlign = nx > 0.25 ? "left" : nx < -0.25 ? "right" : "center";
      o.fillText(String(nm), X + nx * 11, Y - ny * 11);
    }

    /* D65 sits on the white point of the diagram by definition, so its marker is
       dark in both surrounds: the ink colour would vanish into the paper there. */
    const wx = px(0.3127), wy = py(0.3290);
    o.strokeStyle = ON_PALE;
    o.lineWidth = 1;
    o.beginPath();
    o.moveTo(wx - 4, wy); o.lineTo(wx + 4, wy);
    o.moveTo(wx, wy - 4); o.lineTo(wx, wy + 4);
    o.stroke();
    if (!tight) {
      o.fillStyle = ON_PALE;
      o.textAlign = "left";
      o.fillText("D65", wx + 7, wy + 1);
    }
  }

  /* ---- the moving parts ---- */

  function render() {
    const { w, h, px, py, tight } = state.geo;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.drawImage(under.c, 0, 0, w, h);

    const rect = [px(0), py(Y_MAX), X_MAX * state.geo.s, Y_MAX * state.geo.s];
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(field.c, ...rect);
    if (state.cut > 0) {
      /* grey everywhere outside the closing triangle: rect minus triangle, even-odd */
      ctx.save();
      ctx.beginPath();
      ctx.rect(...rect);
      const front = triangleAt(state.gamut, state.k);
      front.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
      ctx.closePath();
      ctx.clip("evenodd");
      ctx.drawImage(mask.c, ...rect);
      ctx.restore();
    }

    ctx.drawImage(over.c, 0, 0, w, h);

    /* the triangle: faint while the colour is still there, solid once it is gone */
    const g = state.gamut;
    const tri = [g.r, g.g, g.b];
    ctx.lineWidth = 1 + state.cut;
    ctx.strokeStyle = pal.ink;
    ctx.globalAlpha = 0.45 + 0.55 * state.cut;
    ctx.beginPath();
    tri.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font = mono(tight ? 9 : 11);
    ctx.textBaseline = "middle";
    "RGB".split("").forEach((letter, i) => {
      const [x, y] = tri[i];
      const X = px(x), Y = py(y);
      ctx.fillStyle = pal.ink;
      ctx.beginPath(); ctx.arc(X, Y, 2.6, 0, Math.PI * 2); ctx.fill();
      if (tight) return;
      const outX = x > 0.4 ? 9 : x < 0.2 ? -9 : 0;
      const outY = y > 0.5 ? -9 : 9;
      ctx.textAlign = outX > 0 ? "left" : outX < 0 ? "right" : "center";
      ctx.fillText(letter, X + outX, Y + outY);
    });

    /* the probe */
    if (state.probe != null) {
      const row = byNm.get(state.probe);
      if (row) {
        const [x, y] = rowXY(row);
        /* The probe lands on saturated colour, where neither ink nor paper is
           legible on its own, so the ring is drawn twice: dark under light. */
        const X = px(x), Y = py(y);
        ctx.beginPath(); ctx.arc(X, Y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = ON_PALE; ctx.lineWidth = 4; ctx.stroke();
        ctx.strokeStyle = ON_DARK; ctx.lineWidth = 1.6; ctx.stroke();
      }
    }
  }

  /* ---- public surface ---- */

  function resize() {
    state.dpr = Math.min(2, devicePixelRatio || 1);
    state.geo = measure();
    /* Sizing the backing store is the expensive part, so it happens here and
       never in render(). */
    canvas.width = Math.round(state.geo.w * state.dpr);
    canvas.height = Math.round(state.geo.h * state.dpr);
    buildChrome();
    render();
  }

  /* ease the front, not the alpha: the number and the picture stay in step */
  const ease = (v) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);
  const applyCut = () => (state.k = state.k0 + (1 - state.k0) * ease(state.cut));

  function setGamut(id) {
    state.gamut = GAMUTS[id] ?? GAMUTS.srgb;
    state.k0 = coveringScale(state.gamut, locus);
    applyCut();
    buildOutside(state.gamut);
    buildMask();
    render();
  }

  function setTheme(next) {
    pal = next;
    buildMask();
    buildChrome();
    render();
  }

  const paintFrom = (GAMUTS[colorSpace === "display-p3" ? "p3" : "srgb"]).fromXYZ;

  state.k0 = coveringScale(state.gamut, locus);
  state.k = state.k0;
  buildColour(paintFrom);
  buildOutside(state.gamut);
  buildMask();
  resize();

  return {
    state,
    resize,
    setGamut,
    setTheme,
    setCut(p) {
      /* quantized so a scroll that moves two pixels does not repaint */
      const v = Math.round(Math.min(1, Math.max(0, p)) * 400) / 400;
      if (v === state.cut) return state.k;
      state.cut = v;
      applyCut();
      render();
      return state.k;
    },
    setProbe(nm) {
      if (state.probe === nm) return;
      state.probe = nm;
      render();
    },
    /** the uncut field, for the reduced-motion inset */
    drawFieldInto(c) {
      const x = c.getContext("2d", { colorSpace });
      const dpr = Math.min(2, devicePixelRatio || 1);
      const r = c.getBoundingClientRect();
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = Math.min(r.width / X_MAX, r.height / Y_MAX);
      x.drawImage(field.c, 0, 0, X_MAX * s, Y_MAX * s);
      x.strokeStyle = pal.line;
      x.lineWidth = 1;
      const px = (v) => v * s, py = (v) => Y_MAX * s - v * s;
      x.beginPath();
      locus.forEach(([lx, ly], i) => (i ? x.lineTo(px(lx), py(ly)) : x.moveTo(px(lx), py(ly))));
      x.closePath();
      x.stroke();
    },
  };
}
