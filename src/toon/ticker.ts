// Tek bir saat tüm karikatür tuvallerini sürer: 24 fps çizer, pozlar iki karede bir (twos) değişir.
// Sekme gizliyken durur; "hareketi azalt" açıksa saat donar (çizimler yine bir kez yapılır).
type Fn = (t: number) => void;
const subs = new Set<Fn>();
let raf = 0, start = 0, lastFrame = -1;

export const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function loop(now: number) {
  if (!start) start = now;
  const t = (now - start) / 1000, frame = Math.floor(t * 24);
  if (frame !== lastFrame) { lastFrame = frame; subs.forEach((f) => f(t)); }
  raf = subs.size ? requestAnimationFrame(loop) : 0;
}

export function subscribe(fn: Fn) {
  subs.add(fn);
  if (reducedMotion()) fn(2.4); // donmuş ama karakterler yerinde
  else if (!raf) raf = requestAnimationFrame(loop);
  return () => { subs.delete(fn); };
}

/** Tema değişince donmuş çizimleri de yenile. */
export const redrawAll = () => { if (reducedMotion()) subs.forEach((f) => f(2.4)); };
