/* miliario — la Via Appia percorsa in orizzontale.
   Zero dipendenze. Un solo rAF loop muove track, parallasse, canvas, HUD e
   Tabula da un unico valore di progresso. I piani di parallasse sono SVG nel
   DOM (trasformazioni composite, colori via custom properties): il canvas
   ridisegna solo la strada — basoli, solchi e miliari — che è ground truth. */
"use strict";

const KM_TOTAL = 563;          // Roma → Brundisium, circa
const MILE_KM = 1.478;         // 1 mille passus = 1.478 m
const SEED = 312;              // anno di fondazione, usato come seme

const mqTouch = matchMedia("(pointer: coarse)");
const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");

const html = document.documentElement;
const journey = document.querySelector("[data-journey]");
const scene = document.querySelector("[data-scene]");
const track = document.querySelector("[data-track]");
const canvas = document.querySelector("[data-land]");
const ctx = canvas.getContext("2d");
const sunEl = document.querySelector("[data-sun]");
const layerEls = {
  hillsFar: document.querySelector("[data-layer='hillsFar']"),
  hillsNear: document.querySelector("[data-layer='hillsNear']"),
  mid: document.querySelector("[data-layer='mid']"),
  fore: document.querySelector("[data-layer='fore']"),
};
const panels = [...document.querySelectorAll(".panel")];
const routePath = document.querySelector("[data-route]");
const underPath = document.querySelector(".tabula__under");
const tabulaSvg = document.querySelector(".tabula__svg");
const dotsG = document.querySelector("[data-dots]");
const tabulaStop = document.querySelector("[data-tabula-stop]");
const hudMp = document.querySelector("[data-mp]");
const hudKm = document.querySelector("[data-km]");
const hudStop = document.querySelector("[data-stop]");
const cue = document.querySelector("[data-cue]");
const cueArrow = document.querySelector("[data-cue-arrow]");
const colophon = document.querySelector(".colophon");

/* ── numeri romani: le cifre della pagina sono calcolate, non scritte a mano ── */

function toRoman(n) {
  const T = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = "";
  for (const [v, r] of T) while (n >= v) { s += r; n -= v; }
  return s;
}
const mpOf = (km) => Math.max(1, Math.round(km / MILE_KM));

document.querySelectorAll("[data-mp-for]").forEach((el) => {
  const numeral = toRoman(mpOf(parseFloat(el.dataset.mpFor)));
  const prefix = el.textContent.trim().startsWith("MP") ? "MP " : "";
  if (el.textContent.trim() !== prefix + numeral)
    console.warn(`miliario: numerale corretto ${el.textContent.trim()} → ${prefix + numeral}`);
  el.textContent = prefix + numeral;
});

/* ── RNG deterministico ── */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── colori della strada (canvas): giorno e crepuscolo ── */

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

const DAY = {
  gap: hex("#26241f"), slabA: hex("#34322b"), slabB: hex("#4a473d"), rut: hex("#191713"),
  stone: hex("#d9cfba"), stoneDark: hex("#b0a588"), stoneInk: hex("#26241f"),
};
const DUSK = {
  gap: hex("#1a1915"), slabA: hex("#2b2923"), slabB: hex("#3a3830"), rut: hex("#0e0d0a"),
  stone: hex("#6e6656"), stoneDark: hex("#514c3d"), stoneInk: hex("#e8e0cd"),
};
const pal = (k, t) => mix(DAY[k], DUSK[k], t);

/* ── le tappe, lette dal DOM ── */

const STOPS = panels
  .filter((p) => p.dataset.km !== undefined && !p.classList.contains("panel--dark") && !p.classList.contains("panel--basoli"))
  .map((p) => ({
    km: parseFloat(p.dataset.km),
    name: parseFloat(p.dataset.km) === 0 ? "Roma · Porta Appia" : p.querySelector(".panel__name").textContent,
  }))
  .sort((a, b) => a.km - b.km);

/* ── il mondo: periodi, semi, geometrie (costruito una sola volta) ── */

const P_HILLS = 3600, P_MID = 5200, P_FORE = 4300;
let slabRows = [], milestones = [];
let strips = null; // { hillsFar, hillsNear, mid, fore: {el, P} }

const f1 = (v) => v.toFixed(1);

function ridgeD(seeds, baseY, amp, P) {
  let d = `M0,900 L0,${f1(baseY)}`;
  for (let x = 0; x <= P; x += 24) {
    let y = 0;
    for (const s of seeds) y += s.a * Math.sin((x / P) * Math.PI * 2 * s.k + s.p);
    d += ` L${x},${f1(baseY - y * amp * 0.5)}`;
  }
  return d + ` L${P},900 Z`;
}

function pineSvg(x, baseY, s) {
  return `<rect x="${f1(x - 2 * s)}" y="${f1(baseY - 30 * s)}" width="${f1(4 * s)}" height="${f1(30 * s)}"/>` +
    `<ellipse cx="${f1(x)}" cy="${f1(baseY - 34 * s)}" rx="${f1(34 * s)}" ry="${f1(12 * s)}"/>`;
}

function aquaSvg(x, baseY, arches) {
  const aw = 34, ah = 52, t = 6;
  let d = "";
  for (let i = 0; i < arches; i++) {
    const cx = x + i * aw + aw / 2, r = aw / 2 - t / 2, sy = baseY - ah + aw / 2;
    d += `M${f1(cx - r)},${baseY} L${f1(cx - r)},${f1(sy)} A${f1(r)},${f1(r)} 0 0 1 ${f1(cx + r)},${f1(sy)} L${f1(cx + r)},${baseY} `;
  }
  return `<path d="${d}" fill="none" stroke-width="${t}"/>` +
    `<rect class="a" x="${f1(x - t)}" y="${f1(baseY - ah - t)}" width="${f1(arches * aw + 2 * t)}" height="${t}"/>`;
}

function foreSvg(it) {
  const baseY = 630; // 0.70 × 900: il ciglio della strada, nel viewBox
  if (it.type === "tomb") {
    const w = it.w, h = it.h, x = it.x, s = it.s;
    return `<polygon points="${x},${baseY} ${x},${baseY - h} ${f1(x + w * .35)},${baseY - h - 6} ` +
      `${f1(x + w * (.5 + s * .2))},${baseY - h + 3} ${f1(x + w * .8)},${baseY - h - 3} ${x + w},${baseY - h + 1} ${x + w},${baseY}"/>`;
  }
  if (it.type === "column") {
    const h = it.h, w = 9, x = it.x;
    return `<rect x="${f1(x - w / 2)}" y="${baseY - h}" width="${w}" height="${h}"/>` +
      `<rect x="${f1(x - w * .9)}" y="${baseY - h - 4}" width="${f1(w * 1.8)}" height="4"/>` +
      `<rect x="${f1(x - w)}" y="${baseY - 4}" width="${w * 2}" height="4"/>`;
  }
  return `<ellipse cx="${it.x}" cy="${f1(baseY - 24 * it.s)}" rx="${f1(5.5 * it.s)}" ry="${f1(24 * it.s)}"/>`;
}

function buildLayers() {
  const rng = mulberry32(SEED);
  const mk = () => Array.from({ length: 4 }, () => ({ a: 0.4 + rng() * 0.6, k: 2 + (rng() * 3 | 0), p: rng() * Math.PI * 2 }));
  const far = mk(), near = mk();

  const midItems = [];
  midItems.push({ type: "aqua", x: 500 + rng() * 300, arches: 7 + (rng() * 4 | 0) });
  midItems.push({ type: "aqua", x: 2900 + rng() * 400, arches: 5 + (rng() * 3 | 0) });
  for (let i = 0; i < 9; i++) midItems.push({ type: "pine", x: rng() * P_MID, s: 0.7 + rng() * 0.7 });

  const foreItems = [];
  for (let i = 0; i < 5; i++) foreItems.push({ type: "tomb", x: rng() * P_FORE, w: 60 + rng() * 70, h: 26 + rng() * 30, s: rng() });
  for (let i = 0; i < 4; i++) foreItems.push({ type: "column", x: rng() * P_FORE, h: 40 + rng() * 34 });
  for (let i = 0; i < 6; i++) foreItems.push({ type: "cypress", x: rng() * P_FORE, s: 0.7 + rng() * 0.6 });

  const svg = (P, cls, body) =>
    `<svg viewBox="0 0 ${P} 900" preserveAspectRatio="none" style="width:${P}px" class="${cls}" aria-hidden="true">${body}</svg>`;
  const mount = (key, P, cls, body) => {
    const el = layerEls[key];
    const day = svg(P, "f-" + cls, body), dusk = svg(P, "g-" + cls, body);
    el.innerHTML = `<div class="layer__strip"><div class="layer__day">${day}${day}</div>` +
      `<div class="layer__dusk">${dusk}${dusk}</div></div>`;
    return { strip: el.firstElementChild, duskEl: el.querySelector(".layer__dusk"), P, lastD: -1 };
  };

  strips = {
    hillsFar: mount("hillsFar", P_HILLS, "hills-far",
      `<path d="${ridgeD(far, 468, 26, P_HILLS)}"/>`),
    hillsNear: mount("hillsNear", P_HILLS, "hills",
      `<path d="${ridgeD(near, 522, 34, P_HILLS)}"/>`),
    mid: mount("mid", P_MID, "mid", midItems.map((it) =>
      it.type === "aqua" ? aquaSvg(it.x, 599, it.arches) : pineSvg(it.x, 599, it.s)).join("")),
    fore: mount("fore", P_FORE, "fore", foreItems.map(foreSvg).join("")),
  };

  // basoli: 5 file, ciascuna col proprio periodo
  const rng2 = mulberry32(SEED + 7);
  slabRows = [];
  for (let r = 0; r < 5; r++) {
    const period = 2100 + r * 173, slabs = [];
    let x = 0;
    while (x < period) {
      const w = 150 + rng2() * 130;
      const shade = rng2();
      const rgbDay = DAY.slabA.map((v, i) => v + (DAY.slabB[i] - v) * shade);
      const rgbDusk = DUSK.slabA.map((v, i) => v + (DUSK.slabB[i] - v) * shade);
      slabs.push({
        x, w, j: [rng2(), rng2(), rng2(), rng2(), rng2(), rng2()],
        rgbDay, rgbDusk,
        cDay: `rgb(${rgbDay.map(Math.round).join(",")})`,
        cDusk: `rgb(${rgbDusk.map(Math.round).join(",")})`,
      });
      x += w;
    }
    slabRows.push({ period, slabs, maxW: 290 });
  }
}

/* le file di basoli precotte in tile (giorno/crepuscolo): al frame restano
   drawImage invece di ~75 riempimenti di path */
let roadTiles = null;
function bakeRoadTiles() {
  const td = Math.min(dpr, 1.5), H = 100, PAD = 8;
  roadTiles = slabRows.map((row) => {
    const mk = (dusk) => {
      const c = document.createElement("canvas");
      c.width = Math.ceil(row.period * td);
      c.height = Math.ceil((H + PAD) * td);
      const g = c.getContext("2d");
      g.setTransform(td, 0, 0, td, 0, 0);
      const paint = (s, dx) => {
        const j = s.j, x = s.x + dx;
        g.fillStyle = dusk ? s.cDusk : s.cDay;
        g.beginPath();
        g.moveTo(x + j[0] * 8, PAD + j[1] * 3);
        g.lineTo(x + s.w * 0.5, PAD - H * 0.07);          // dorso convesso
        g.lineTo(x + s.w - j[2] * 8, PAD + j[3] * 3);
        g.lineTo(x + s.w - j[4] * 10, PAD + H);
        g.lineTo(x + j[5] * 10, PAD + H);
        g.closePath();
        g.fill();
      };
      for (const s of row.slabs) {
        paint(s, 0);
        if (s.x + s.w > row.period) paint(s, -row.period); // cucitura del periodo
      }
      return c;
    };
    return { day: mk(false), dusk: mk(true), period: row.period, H, PAD };
  });
}

/* ── stato e misure: nessuna lettura di layout dentro il loop ── */

let mode = "scroll";
let vw = 0, vh = 0, dpr = 1;
let journeyPx = 0, gap = 0, trackW = 0, maxOff = 0;
let routeLen = 0, dots = [];

function measure() {
  vw = window.innerWidth;
  vh = window.innerHeight;
  journeyPx = Math.max(7.5 * vw, 6800);
  gap = 1.15 * vw;
  trackW = vw + gap + journeyPx;
  maxOff = trackW - vw;

  track.style.width = trackW + "px";
  journey.style.height = mode === "touch" ? "" : maxOff + vh + "px";

  panels.forEach((p) => {
    const cx = p.dataset.lead !== undefined
      ? vw / 2
      : vw / 2 + gap + (parseFloat(p.dataset.km) / KM_TOTAL) * journeyPx;
    p.style.left = cx + "px";
  });

  // miliari: uno ogni dieci miglia, piantato alla sua coordinata reale
  milestones = [];
  for (let m = 10; m <= 380; m += 10) {
    const km = m * MILE_KM;
    milestones.push({ x: vw / 2 + gap + (km / KM_TOTAL) * journeyPx, numeral: toRoman(m) });
  }

  dpr = Math.min(window.devicePixelRatio || 1, mqTouch.matches ? 1.5 : 2);
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bakeRoadTiles();

  // Tabula: il viewBox segue i pixel reali (niente punti schiacciati),
  // lunghezza del tracciato e punti-tappa sulle frazioni reali
  const tw = Math.max(240, Math.round(tabulaSvg.clientWidth || 1000));
  tabulaSvg.setAttribute("viewBox", `0 0 ${tw} 36`);
  const routeD = `M20,24 Q${tw / 2},6 ${tw - 20},20`;
  underPath.setAttribute("d", routeD);
  routePath.setAttribute("d", routeD);
  routeLen = routePath.getTotalLength();
  routePath.style.strokeDasharray = String(routeLen);
  dotsG.textContent = "";
  dots = STOPS.map((s) => {
    const pt = routePath.getPointAtLength((s.km / KM_TOTAL) * routeLen);
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", pt.x.toFixed(1));
    c.setAttribute("cy", pt.y.toFixed(1));
    c.setAttribute("r", "4");
    dotsG.appendChild(c);
    return c;
  });

  dirty = true;
}

/* ── modalità di input ── */

function setMode(m) {
  mode = m;
  html.dataset.mode = m === "touch" ? "touch" : "fine";
  if (m === "touch") {
    scene.tabIndex = 0;
    scene.setAttribute("role", "region");
    scene.setAttribute("aria-label", "La Via Appia: scorri orizzontalmente per camminare");
    cue.firstChild.textContent = "Scorri di lato per camminare ";
    cueArrow.innerHTML = "&#8594;";
  } else {
    scene.removeAttribute("tabindex");
    scene.removeAttribute("role");
    scene.removeAttribute("aria-label");
    cue.firstChild.textContent = "Scorri per camminare ";
    cueArrow.innerHTML = "&#8595;";
  }
}

/* frecce anche sullo scroller touch (il nativo già lo fa: questa è garanzia) */
scene.addEventListener("keydown", (e) => {
  if (mode !== "touch") return;
  const step = vw * 0.55;
  const behavior = mqReduce.matches ? "auto" : "smooth";
  if (e.key === "ArrowRight") { scene.scrollBy({ left: step, behavior }); e.preventDefault(); }
  else if (e.key === "ArrowLeft") { scene.scrollBy({ left: -step, behavior }); e.preventDefault(); }
  else if (e.key === "Home") { scene.scrollTo({ left: 0, behavior }); e.preventDefault(); }
  else if (e.key === "End") { scene.scrollTo({ left: maxOff, behavior }); e.preventDefault(); }
});

/* ── la strada (canvas): basoli, solchi, miliari ── */

const CUM = [0, 0.09, 0.23, 0.43, 0.69, 1]; // altezze prospettiche delle 5 file
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function drawMilestone(m, sx, y0, dusk, hsc) {
  if (sx < -80 || sx > vw + 80) return;
  const hs = Math.max(42, Math.min(84, vh * 0.085)) * hsc;
  const ws = hs * 0.44;
  const baseY = y0 + 4;
  ctx.fillStyle = pal("stoneDark", dusk);
  ctx.fillRect(sx - ws * 0.72, baseY - hs * 0.08, ws * 1.44, hs * 0.1); // plinto
  ctx.fillStyle = pal("stone", dusk);
  ctx.beginPath();
  ctx.moveTo(sx - ws / 2, baseY);
  ctx.lineTo(sx - ws / 2, baseY - hs + ws / 2);
  ctx.arc(sx, baseY - hs + ws / 2, ws / 2, Math.PI, 0);
  ctx.lineTo(sx + ws / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal("stoneDark", dusk); // fianco in ombra
  ctx.fillRect(sx + ws * 0.18, baseY - hs + ws * 0.5, ws * 0.32, hs - ws * 0.5);
  // iscrizione verticale, come sui cippi veri
  ctx.save();
  ctx.translate(sx - ws * 0.05, baseY - hs * 0.52);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = pal("stoneInk", dusk);
  ctx.font = `700 ${Math.max(9, ws * 0.42)}px Cinzel, Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`MP ${m.numeral}`, 0, 0);
  ctx.restore();
}

function drawRoad(off, zoom, dusk) {
  const y0 = vh * (0.70 + (0.14 - 0.70) * (zoom * zoom * (3 - 2 * zoom)));
  ctx.clearRect(0, 0, vw, vh);

  // letto della strada
  ctx.fillStyle = pal("gap", dusk);
  ctx.fillRect(0, y0, vw, vh - y0);

  const bandH = vh - y0;
  for (let r = 0; r < 5; r++) {
    const t = roadTiles[r];
    const yA = y0 + bandH * CUM[r], yB = y0 + bandH * CUM[r + 1];
    const dh = (yB - yA) * (t.H + t.PAD) / t.H;
    const dy = yA - (yB - yA) * t.PAD / t.H;
    const shift = off % t.period;
    for (let x = -shift; x < vw; x += t.period) {
      if (dusk < 1) { ctx.globalAlpha = 1 - dusk; ctx.drawImage(t.day, x, dy, t.period, dh); }
      if (dusk > 0) { ctx.globalAlpha = dusk; ctx.drawImage(t.dusk, x, dy, t.period, dh); }
    }
  }
  ctx.globalAlpha = 1;

  // solchi dei carri: continui lungo la via, non si spostano coi basoli
  ctx.strokeStyle = pal("rut", dusk);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(2, bandH * 0.02);
  for (const fy of [0.55, 0.74]) {
    ctx.beginPath();
    for (let x = 0; x <= vw; x += 24)
      ctx.lineTo(x, y0 + bandH * fy + Math.sin(x / 240 + fy * 9) * bandH * 0.012);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // miliari al ciglio, ogni dieci miglia
  const hsc = 1 + zoom * 0.9;
  for (const m of milestones) drawMilestone(m, m.x - off, y0, dusk, hsc);

  return y0;
}

/* ── il loop unico ── */

let cur = 0, target = 0, lastT = 0, dirty = true, lastApplied = -1;
let lastMp = "", lastKm = -1, lastStop = -1, lastDusk = false, lastZoom = -1;
const RATES = { hillsFar: 0.15, hillsNear: 0.24, mid: 0.45, fore: 0.75 };

function apply() {
  const pinX = mode === "touch" ? cur : 0;
  if (mode !== "touch") track.style.transform = `translate3d(${-cur}px,0,0)`;

  const progress = maxOff > 0 ? clamp01(cur / maxOff) : 0;
  const kmNow = clamp01((cur - gap) / journeyPx) * KM_TOTAL;

  // crepuscolo (km ~140–215) e zoom sui basoli (km ~340)
  const dusk = smooth(140, 165, kmNow) - smooth(190, 215, kmNow);
  const tri = clamp01(1 - Math.abs(kmNow - 340) / 55);
  const zoom = mqReduce.matches ? 0 : tri * tri * (3 - 2 * tri);
  const isDusk = dusk > 0.5;
  if (isDusk !== lastDusk) { html.classList.toggle("is-dusk", isDusk); lastDusk = isDusk; }
  const ze = zoom * zoom * (3 - 2 * zoom);
  const cover = clamp01((0.375 - (0.70 - 0.56 * ze)) / 0.25);
  if (Math.abs(cover - lastZoom) > 0.005) {
    html.style.setProperty("--zoom", cover.toFixed(3));
    lastZoom = cover;
  }

  // parallasse: strip SVG traslate (compositore), colori via custom properties
  const rates = mqReduce.matches ? { hillsFar: 1, hillsNear: 1, mid: 1, fore: 1 } : RATES;
  const y0 = drawRoad(cur, zoom, clamp01(dusk));
  const dy = y0 - vh * 0.70;
  for (const key of ["hillsFar", "hillsNear", "mid", "fore"]) {
    const s = strips[key];
    const o = ((cur * rates[key]) % s.P + s.P) % s.P;
    layerEls[key].style.transform = `translate3d(${pinX}px,0,0)`;
    s.strip.style.transform = `translate3d(${-o}px,${key === "fore" ? dy : 0}px,0)`;
    const d = clamp01(dusk);
    if (Math.abs(d - s.lastD) > 0.004) { s.duskEl.style.opacity = String(d); s.lastD = d; }
  }
  sunEl.style.transform = `translate3d(${pinX}px,0,0)`;
  canvas.style.transform = `translate3d(${pinX}px,0,0)`;

  // HUD: solo quando cambia ciò che è scritto
  const mp = toRoman(mpOf(kmNow));
  if (mp !== lastMp) { hudMp.textContent = mp; lastMp = mp; }
  const kmR = Math.round(kmNow);
  if (kmR !== lastKm) { hudKm.textContent = String(kmR); lastKm = kmR; }

  let best = 0, bestD = Infinity;
  STOPS.forEach((s, i) => { const d = Math.abs(s.km - kmNow); if (d < bestD) { bestD = d; best = i; } });
  if (best !== lastStop) {
    hudStop.textContent = STOPS[best].name;
    tabulaStop.textContent = STOPS[best].name.toUpperCase();
    dots.forEach((d, i) => d.classList.toggle("is-on", i === best));
    lastStop = best;
  }

  routePath.style.strokeDashoffset = String(routeLen * (1 - progress));
}

function tick(t) {
  requestAnimationFrame(tick);
  const dt = Math.min((t - lastT) / 1000 || 0, 0.1);
  lastT = t;
  if (document.hidden) return;

  target = mode === "touch" ? scene.scrollLeft : Math.min(Math.max(window.scrollY, 0), maxOff);
  if (mqReduce.matches || mode === "touch") {
    // touch: il track si muove già con inerzia nativa — il canvas deve restare 1:1
    cur = target;
  } else {
    cur += (target - cur) * (1 - Math.pow(0.0015, Math.max(dt, 0.001)));
    if (Math.abs(target - cur) < 0.05) cur = target;
  }
  if (cur !== lastApplied || dirty) {
    apply();
    lastApplied = cur;
    dirty = false;
  }
}

/* ── avvio e manutenzione ── */

function syncScroll(f) {
  if (mode === "touch") scene.scrollLeft = f * maxOff;
  else window.scrollTo(0, f * maxOff);
}

setMode(mqTouch.matches ? "touch" : "scroll");
buildLayers();
measure();
apply();

let resizeT;
window.addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { const f = maxOff ? cur / maxOff : 0; measure(); syncScroll(f); }, 120);
});
document.fonts.ready.then(() => measure());

mqTouch.addEventListener("change", (e) => {
  const f = maxOff ? cur / maxOff : 0;
  setMode(e.matches ? "touch" : "scroll");
  measure();
  syncScroll(f);
});

document.addEventListener("visibilitychange", () => { lastT = performance.now(); });

new IntersectionObserver(([e]) => {
  html.classList.toggle("is-past", e.isIntersecting);
}, { threshold: 0.12 }).observe(colophon);

requestAnimationFrame(tick);
