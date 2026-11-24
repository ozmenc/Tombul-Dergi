// 1950'ler sınırlı animasyon çizim motoru: renk ve mürekkep iki ayrı "cel" gibi, renk çizgiden birkaç px kaymış
// basılır ve bu kayma iki karede bir (12 fps) yeniden titrer; çizgi nefes alır ve tam kapanmaz.
// Lemo-Opuscar "Mid-century Cartoon" demo motorundan (styles/midcentury-toon/demo/engine/toon.js) uyarlandı.
// Lemo-Opuscar by Lemomo (LemoLab), MIT License (LICENSE-lemo-opuscar.txt), https://github.com/lemomo-ai/lemo-opuscar — kısaltıldı ve TypeScript'e çevrildi.

export type P = [number, number];
export const TAU = Math.PI * 2;

// ---------- belirlenimci rastgelelik ----------
export const hash = (x: number, y = 0, z = 0) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
export function noise(seed = 0) {
  const g = (ix: number, iy: number) => hash(ix, iy, seed);
  return (x: number, y = 0) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return (g(ix, iy) * (1 - u) + g(ix + 1, iy) * u) * (1 - v) + (g(ix, iy + 1) * (1 - u) + g(ix + 1, iy + 1) * u) * v;
  };
}
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const back = (t: number, s = 1.7) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
/** Sınırlı animasyon: her çizim iki kare tutulur (12 fps). */
export const twos = (t: number) => Math.floor(t * 12 + 1e-6) / 12;

// ---------- register (renk cel'i ile mürekkep cel'i arası kayma) ----------
export const REG = { dx: 4, dy: 3, jit: 1.2, on: true };
let CLOCK = 0;
export const setClock = (t: number) => { CLOCK = t; };
export function reg(seed = 0, k = 1): P {
  if (!REG.on) return [0, 0];
  const f = Math.floor(CLOCK * 12 + 1e-6);
  return [(REG.dx + (hash(f, seed, 1) - 0.5) * 2 * REG.jit) * k, (REG.dy + (hash(f, seed, 2) - 0.5) * 2 * REG.jit) * k];
}

// ---------- geometri ----------
export function spline(pts: P[], closed = true, n = 8): P[] {
  const out: P[] = [], N = pts.length;
  const get = (i: number) => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  const segs = closed ? N : N - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[N - 1]);
  return out;
}
export const ellipse = (cx: number, cy: number, rx: number, ry: number, n = 40, a0 = 0, a1 = TAU, rot = 0): P[] => {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
};
export function rrect(x: number, y: number, w: number, h: number, r: number, n = 5): P[] {
  r = Math.min(r, w / 2, h / 2);
  const out: P[] = [];
  const c: [number, number, number][] = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * (i / n); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
export const move = (pts: P[], dx: number, dy: number): P[] => pts.map(([x, y]) => [x + dx, y + dy]);
export const xform = (pts: P[], ox: number, oy: number, a = 0, s = 1, sy = s): P[] => {
  const c = Math.cos(a), si = Math.sin(a);
  return pts.map(([x, y]) => [ox + c * x * s - si * y * sy, oy + si * x * s + c * y * sy]);
};
export function path(ctx: CanvasRenderingContext2D, pts: P[], closed = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (closed) ctx.closePath();
}

// ---------- mürekkep: basınçlı, kırıklı şerit ----------
type InkOpts = { color: string; closed?: boolean; wob?: number; seed?: number; breaks?: number; taper?: boolean; alpha?: number };
export function ink(ctx: CanvasRenderingContext2D, pts: P[], w: number, o: InkOpts) {
  const { color, closed = false, wob = 0.4, seed = 1, breaks = 0, taper = true, alpha = 1 } = o;
  const Pp = closed ? [...pts, pts[0], pts[1] || pts[0]] : pts;
  if (Pp.length < 2 || w <= 0) return;
  const L = [0];
  for (let i = 1; i < Pp.length; i++) L.push(L[i - 1] + Math.hypot(Pp[i][0] - Pp[i - 1][0], Pp[i][1] - Pp[i - 1][1]));
  const total = L[L.length - 1];
  if (total <= 0.5) return;
  const step = Math.max(1.2, Math.min(w * 0.7, total / 300)), n = Math.max(2, Math.ceil(total / step));
  const S: [number, number, number][] = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const d = (total * i) / n;
    while (j < L.length - 2 && L[j + 1] < d) j++;
    const u = (d - L[j]) / Math.max(1e-6, L[j + 1] - L[j]);
    S.push([Pp[j][0] + (Pp[j + 1][0] - Pp[j][0]) * u, Pp[j][1] + (Pp[j + 1][1] - Pp[j][1]) * u, d]);
  }
  const N = noise(seed * 13 + 5);
  const wid = (d: number) => {
    let k = 1 + wob * (N(d / (w * 16), 0.5) - 0.5) * 2;
    if (taper && !closed) k *= Math.min(1, 0.3 + (Math.min(d, total - d) / (w * 4)) * 0.7);
    return Math.max(0.08, k) * w * 0.5;
  };
  const runs: typeof S[] = [];
  let cur: typeof S = [];
  for (const s of S) {
    if (breaks > 0 && N(s[2] / (w * 11), 7.3) < breaks * 0.5) { if (cur.length > 1) runs.push(cur); cur = []; }
    else cur.push(s);
  }
  if (cur.length > 1) runs.push(cur);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  for (const run of runs) {
    const left: P[] = [], right: P[] = [];
    for (let i = 0; i < run.length; i++) {
      const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const r = wid(run[i][2]);
      left.push([run[i][0] + nx * r, run[i][1] + ny * r]);
      right.push([run[i][0] - nx * r, run[i][1] - ny * r]);
    }
    ctx.beginPath();
    left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fill();
    const r0 = wid(run[0][2]), r1 = wid(run[run.length - 1][2]);
    ctx.beginPath();
    ctx.arc(run[0][0], run[0][1], r0, 0, TAU);
    ctx.arc(run[run.length - 1][0], run[run.length - 1][1], r1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- stilin temel çağrısı: kaymış renk + kırık mürekkep ----------
export type ShapeOpts = {
  fill?: string | null; line?: number; lineColor: string; breaks?: number; seed?: number; wob?: number;
  off?: P; regK?: number; alpha?: number; shade?: { pts: P[]; color: string; alpha?: number }[];
};
export function shape(ctx: CanvasRenderingContext2D, pts: P[], o: ShapeOpts) {
  const { fill = null, line = 0, lineColor, breaks = 0.18, seed = 1, wob = 0.4, regK = 1, alpha = 1 } = o;
  const off = o.off || reg(seed, regK);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (fill) {
    const Pf = move(pts, off[0], off[1]);
    ctx.save();
    path(ctx, Pf);
    ctx.fillStyle = fill;
    ctx.fill();
    if (o.shade) {
      ctx.clip();
      for (const s of o.shade) {
        path(ctx, move(s.pts, off[0], off[1]));
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha * (s.alpha ?? 1);
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
    }
    ctx.restore();
  }
  if (line > 0) ink(ctx, pts, line, { closed: true, color: lineColor, breaks, seed, wob });
  ctx.restore();
}

// ---------- atom çağı süsleri ----------
export function starPts(cx: number, cy: number, r: number, n = 8, inner = 0.42, rot = 0): P[] {
  const out: P[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r * inner : r;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}
/** Dört köşeli ince atom pırıltısı. */
export function sparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string, rot = 0, alpha = 1) {
  const pts: P[] = [];
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2 - Math.PI / 2, b = a + Math.PI / 4;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    pts.push([cx + Math.cos(b) * r * 0.14, cy + Math.sin(b) * r * 0.14]);
  }
  ctx.save(); ctx.globalAlpha *= alpha; path(ctx, pts); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
}
/** Güneş ışınları: merkezden dönüşümlü dilimler. */
export function rays(ctx: CanvasRenderingContext2D, cx: number, cy: number, n: number, r: number, fill: string, rot = 0, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i * TAU) / n, a1 = a0 + (TAU / n) * 0.5;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
export const boomerang = (cx: number, cy: number, s: number, rot = 0) =>
  xform(spline([[-1, -0.25], [-0.2, -0.05], [0.15, -0.55], [0.95, -0.2], [0.35, 0.1], [0.1, 0.45], [-0.85, 0.35]], true, 10), cx, cy, rot, s);
export const kidney = (cx: number, cy: number, s: number, rot = 0) =>
  xform(spline([[-1, -0.1], [-0.6, -0.55], [0.1, -0.45], [0.35, -0.15], [0.8, -0.45], [1.05, 0.05], [0.6, 0.5], [-0.4, 0.5]], true, 10), cx, cy, rot, s);

// ---------- baskı dokusu (bir kez üretilir) ----------
let PAPER: HTMLCanvasElement | null = null;
export function paperTexture() {
  if (PAPER) return PAPER;
  const S = 256, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!, N = noise(48), img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const v = (N(x / 18, y / 18) - 0.5) * 40 + (hash(x, y, 7) - 0.5) * 30, i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 128 + v;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return (PAPER = c);
}
