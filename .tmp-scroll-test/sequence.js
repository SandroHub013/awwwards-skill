/* Scroll-driven frame sequence on canvas — standalone test (no dependencies). */
export function initScrollSequence(canvas, { count = 120, path = "./frames/%04d.webp" } = {}) {
  const ctx = canvas.getContext("2d");
  const frames = new Array(count);
  let current = -1;

  const src = (i) => path.replace("%04d", String(i + 1).padStart(4, "0"));

  function load(i) {
    if (frames[i]) return frames[i];
    const img = new Image();
    img.src = src(i);
    return (frames[i] = img.decode().then(() => img).catch(() => null));
  }

  for (let i = 0; i < 20; i++) load(i);                    // first chunk eager
  addEventListener("load", () => { for (let i = 20; i < count; i++) load(i); });

  function draw(img) {
    const { width: cw, height: ch } = canvas;
    const s = Math.max(cw / img.width, ch / img.height);   // cover-fit
    ctx.drawImage(img, (cw - img.width * s) / 2, (ch - img.height * s) / 2,
      img.width * s, img.height * s);
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    current = -1;
  }
  addEventListener("resize", resize); resize();

  return async function update(progress) {
    const i = Math.min(count - 1, Math.floor(progress * count));
    if (i === current) return;
    const img = (await load(i)) ?? (await load(Math.max(0, i - 4)));
    if (img) { draw(img); current = i; }
    return i;
  };
}
