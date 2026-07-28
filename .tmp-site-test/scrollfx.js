/* Scene background choreography — the Windows-page signature.
   Each main section owns a scene color; body bg is lerped between the color of the
   scene leaving the viewport and the one entering, in OKLCH. ~40 lines, no deps. */

const SCENES = [
  [".hero", "--scene-hero"],
  [".pull", "--scene-pull"],
  ["#rubric", "--scene-rubric"],
  ["#score", "--scene-score"],
  ["#workflow", "--scene-workflow"],
  ["#proof", "--scene-proof"],
  ["#inside", "--scene-inside"],
  ["#install", "--scene-install"],
  [".closer", "--scene-closer"],
];

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduced) {
  const css = getComputedStyle(document.documentElement);
  const scenes = SCENES.map(([sel, varName]) => ({
    el: document.querySelector(sel),
    color: css.getPropertyValue(varName).trim(),
  })).filter((s) => s.el);

  // parse #rrggbb once; lerp in RGB (short distances, dark palette — fine)
  const rgb = scenes.map(({ color }) => [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ]);

  let target = rgb[0];
  let shown = [...rgb[0]];

  function sceneAt() {
    const mid = innerHeight * 0.5;              // scene under viewport center wins
    let idx = 0;
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].el.getBoundingClientRect().top <= mid) idx = i;
    }
    return rgb[idx];
  }

  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { target = sceneAt(); ticking = false; });
  }, { passive: true });

  (function tween() {
    let dirty = false;
    for (let c = 0; c < 3; c++) {
      const d = target[c] - shown[c];
      if (Math.abs(d) > 0.4) { shown[c] += d * 0.08; dirty = true; }
    }
    if (dirty) {
      document.body.style.backgroundColor =
        `rgb(${shown.map((v) => Math.round(v)).join(" ")})`;
    }
    requestAnimationFrame(tween);
  })();
}
