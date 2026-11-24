// Tombul Dergi'nin karikatür kadrosu. Her biri 200×220'lik bir kutuda, ayakları y=200'de çizilir.
// Sınırlı animasyon: gövde tutulan bir çizimdir; kollar, eller, gözler, ağız ve küçük eşyalar oynar (iki karede bir).
import { CAST } from "./palette";
import { back, ellipse, hash, ink, move, path, reg, rrect, shape, sparkle, spline, starPts, twos, xform, TAU, type P } from "./toon";

export type Kind = "tombul" | "atom" | "flask" | "planet" | "scope" | "rocket";
export type Mood = "idle" | "busy" | "error" | "lost" | "search";
export type State = { t: number; look: P; poke: number; mood: Mood };

export const NAMES: Record<Kind, string> = { tombul: "Tombul", atom: "Atomcuk", flask: "Fokur", planet: "Halka", scope: "Mercek", rocket: "Füze" };

export const LINES: Record<Kind, string[]> = {
  tombul: ["Şerefe! Bugün ne yazıyorsun?", "Vize haftası mı? Önce bir yazı.", "Bu bardak da tombul, ben de."],
  atom: ["Her şey bizden yapılmış. Sen de!", "Elektronlarım hiç yerinde durmaz."],
  flask: ["Fokur fokur… deney zamanı!", "Bir damla merak, bir tutam kahve."],
  planet: ["Güneşin etrafında bir turum 29 yıl sürüyor.", "Halkalarım buz ve taştan."],
  scope: ["Küçük şeylerin büyük hikâyeleri var.", "Biraz daha yaklaşayım…"],
  rocket: ["3, 2, 1… yazmaya kalkış!", "Yörüngede okuyacak çok şey var."],
};

const INK = CAST.ink;
const SKIN = "#f2c7a0", SKIN_D = "#dda37c", HAIR = "#3a2621", BEER = "#e9a42c", BEER_D = "#c47f16";

// ---------- ortak parçalar ----------
const shp = (ctx: CanvasRenderingContext2D, pts: P[], fill: string | null, line: number, seed: number, extra: Partial<Parameters<typeof shape>[2]> = {}) =>
  shape(ctx, pts, { fill, line, lineColor: INK, seed, ...extra });

function shadow(ctx: CanvasRenderingContext2D, x: number, w: number) {
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = INK; path(ctx, ellipse(x, 203, w, 7)); ctx.fill(); ctx.restore();
}

function blinking(t: number, seed: number) { return (t + seed * 1.37) % 4.3 < 0.16; }

/** İki göz: beyaz oval, imlece bakan bebek. */
function eyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: State, o: { gap?: number; r?: number; seed: number; closed?: boolean }) {
  const { gap = 13, r = 8, seed } = o;
  const shut = o.closed || blinking(s.t, seed);
  for (const side of [-1, 1]) {
    const x = cx + side * gap;
    if (shut) { ink(ctx, ellipse(x, cy, r * 0.8, r * 0.5, 12, 0.15, Math.PI - 0.15), 2.6, { color: INK, seed: seed + side }); continue; }
    shp(ctx, ellipse(x, cy, r * 0.82, r, 20), CAST.white, 2.4, seed + side, { breaks: 0.1, regK: 0.4 });
    const k = s.mood === "lost" ? 0.15 : 0.38;
    const lx = s.mood === "search" ? Math.sin(twos(s.t) * 1.7) : s.look[0], ly = s.mood === "lost" ? -0.6 : s.look[1];
    ctx.fillStyle = INK; path(ctx, ellipse(x + lx * r * k, cy + ly * r * k, r * 0.4, r * 0.46, 12)); ctx.fill();
    ctx.fillStyle = CAST.white; path(ctx, ellipse(x + lx * r * k + r * 0.14, cy + ly * r * k - r * 0.18, r * 0.12, r * 0.12, 8)); ctx.fill();
  }
}

function mouth(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, s: State, seed: number) {
  if (s.mood === "busy" || s.poke < 0.5) { shp(ctx, ellipse(cx, cy + 1, w * 0.22, w * 0.26, 14), "#7a2f22", 2.2, seed, { regK: 0.3 }); return; }
  if (s.mood === "error" || s.mood === "lost") {
    const pts: P[] = []; for (let i = 0; i <= 10; i++) pts.push([cx - w / 2 + (w * i) / 10, cy + Math.sin(i * 1.4) * 1.8]);
    ink(ctx, pts, 2.4, { color: INK, seed }); return;
  }
  ink(ctx, ellipse(cx, cy - w * 0.18, w / 2, w * 0.32, 16, 0.35, Math.PI - 0.35), 2.6, { color: INK, seed });
}

/** Dört parmaklı beyaz eldiven; a: bilekten parmaklara açı. */
function glove(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, seed: number, k = 1) {
  const parts: P[][] = [ellipse(5, 0, 8, 7.5, 14)];
  [-0.6, 0, 0.6].forEach((r) => parts.push(ellipse(5 + Math.cos(r) * 11, Math.sin(r) * 11, 5.5, 3, 10, 0, TAU, r)));
  parts.push(ellipse(1, -8, 5, 2.8, 10, 0, TAU, -1.3));
  const Pp = parts.map((p) => xform(p, x, y, a, k));
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 2.6 * k; ctx.lineJoin = "round";
  for (const p of Pp) { path(ctx, p); ctx.stroke(); }
  const o = reg(seed, 0.4); ctx.fillStyle = CAST.white;
  for (const p of Pp) { path(ctx, move(p, o[0], o[1])); ctx.fill(); }
  ctx.restore();
}

/** Omuzdan ele kıvrık bir mürekkep kol; isteğe bağlı kumaş rengi. Eli döndürür. */
function arm(ctx: CanvasRenderingContext2D, sh: P, hand: P, seed: number, sleeve?: string, bend = 10) {
  const mx = (sh[0] + hand[0]) / 2, my = (sh[1] + hand[1]) / 2, dx = hand[0] - sh[0], dy = hand[1] - sh[1], l = Math.hypot(dx, dy) || 1;
  const pts = spline([sh, [mx - (dy / l) * bend, my + (dx / l) * bend], hand], false, 8);
  if (sleeve) {
    ink(ctx, pts, 15, { color: INK, seed, taper: false, wob: 0.08 });
    const o = reg(seed, 0.6);
    ink(ctx, move(pts, o[0], o[1]), 9.5, { color: sleeve, seed: seed + 1, taper: false, wob: 0.05 });
  } else ink(ctx, pts, 5, { color: INK, seed, taper: false, wob: 0.2 });
  const a = Math.atan2(hand[1] - pts[pts.length - 3][1], hand[0] - pts[pts.length - 3][0]);
  return a;
}

function legs(ctx: CanvasRenderingContext2D, xs: number[], top: number, seed: number) {
  xs.forEach((x, i) => {
    ink(ctx, [[x, top], [x + (i ? 2 : -2), 196]], 5, { color: INK, seed: seed + i, taper: false });
    ctx.fillStyle = INK; path(ctx, ellipse(x + (i ? 7 : -7), 199, 11, 5.5, 14)); ctx.fill();
  });
}

/** Kollar: dürtülünce ya da hevesliyken el sallama açısı. */
const wave = (s: State, seed: number) => (s.poke < 1.4 ? Math.sin(twos(s.poke) * 22) * 0.45 : Math.sin(twos(s.t) * 1.3 + seed) * 0.08);

function sweat(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number) {
  shp(ctx, spline([[x, y - 9], [x + 5, y + 1], [x, y + 5], [x - 5, y + 1]], true, 6), CAST.blueL, 2, seed, { regK: 0.4 });
}

// ---------- karakterler ----------

/** Tombul: tombul bardaktan bira içen tombul üniversiteli. 6 sn'de bir yudum alır. */
function tombul(ctx: CanvasRenderingContext2D, s: State) {
  const t = twos(s.t), cyc = t % 6.5;
  const lift = cyc < 3.8 ? 0 : cyc < 4.2 ? (cyc - 3.8) / 0.4 : cyc < 5.2 ? 1 : cyc < 5.6 ? 1 - (cyc - 5.2) / 0.4 : 0;
  const sipping = cyc >= 4.1 && cyc < 5.3, foam = cyc >= 5.2 || cyc < 0.4;
  shadow(ctx, 100, 54);
  legs(ctx, [86, 114], 178, 3);
  // sol kol: belde, dürtülünce sallar
  const wa = wave(s, 1);
  const lHand: P = s.poke < 1.4 ? [42 + Math.sin(wa) * 6, 96 + Math.cos(wa) * 6] : [50, 156];
  const la = arm(ctx, [62, 118], lHand, 11, CAST.teal, s.poke < 1.4 ? -12 : 8);
  // gövde: kolej kazağı, göğüste hardal şerit
  const body = spline([[100, 98], [141, 108], [154, 150], [139, 184], [100, 191], [61, 184], [46, 150], [59, 108]], true, 8);
  shp(ctx, body, CAST.teal, 3.6, 21, {
    shade: [
      { pts: [[40, 140], [160, 140], [160, 150], [40, 150]], color: CAST.mustard },
      { pts: [[40, 156], [160, 156], [160, 161], [40, 161]], color: CAST.mustard },
      { pts: spline([[128, 100], [160, 130], [150, 192], [124, 192], [138, 150]], true, 6), color: CAST.tealD, alpha: 0.5 },
    ],
  });
  glove(ctx, lHand[0], lHand[1], la, 12);
  // atkı
  ink(ctx, spline([[66, 104], [100, 114], [134, 104]], false, 8), 13, { color: INK, seed: 31, taper: false });
  const o = reg(31, 0.5);
  ink(ctx, move(spline([[66, 104], [100, 114], [134, 104]], false, 8), o[0], o[1]), 8, { color: CAST.coral, seed: 32, taper: false });
  ink(ctx, [[124, 110], [128, 134]], 11, { color: INK, seed: 33, taper: false });
  ink(ctx, move([[124, 110], [128, 134]], o[0], o[1]), 6.5, { color: CAST.coral, seed: 34, taper: false });
  // kafa: yumurta, saç tutamı, yanaklar
  shp(ctx, ellipse(100, 64, 41, 39, 36), SKIN, 3.4, 41, { shade: [{ pts: ellipse(122, 70, 26, 36, 20), color: SKIN_D, alpha: 0.45 }] });
  shp(ctx, spline([[66, 52], [76, 30], [100, 24], [126, 30], [138, 50], [122, 40], [104, 44], [86, 38]], true, 6), HAIR, 2.5, 42);
  ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = CAST.pink;
  path(ctx, ellipse(72, 80, 7, 5, 12)); ctx.fill(); path(ctx, ellipse(128, 80, 7, 5, 12)); ctx.fill(); ctx.restore();
  // gözlük + gözler (yudumda keyifle kapanır)
  eyes(ctx, 100, 66, s, { gap: 15, r: 7, seed: 43, closed: sipping });
  for (const x of [85, 115]) ink(ctx, ellipse(x, 66, 12.5, 11.5, 24), 2.4, { color: INK, closed: true, seed: 44 + x, breaks: 0.1 });
  ink(ctx, [[97, 64], [103, 64]], 2.2, { color: INK, seed: 46 });
  if (!sipping) mouth(ctx, 100, 88, 16, s, 47);
  if (foam) shp(ctx, spline([[88, 84], [94, 80], [100, 83], [106, 80], [112, 84], [100, 87]], true, 5), CAST.white, 2, 48, { regK: 0.4 });
  if (s.mood === "error") sweat(ctx, 140, 50, 49);

  // sağ kol + tombul bira bardağı
  const rest: P = [150, 150], up: P = [120, 92];
  const mug: P = [rest[0] + (up[0] - rest[0]) * lift, rest[1] + (up[1] - rest[1]) * lift];
  const tilt = -0.75 * lift;
  const hand: P = [mug[0] + 18 * Math.cos(tilt), mug[1] + 18 * Math.sin(tilt) + 4];
  arm(ctx, [138, 118], hand, 51, CAST.teal, lift > 0.5 ? -6 : 10);
  ctx.save(); ctx.translate(mug[0], mug[1]); ctx.rotate(tilt);
  // kulp (ele dönük)
  ink(ctx, ellipse(19, 2, 10, 13, 20, -1.5, 1.5), 5, { color: INK, seed: 52 });
  // gövde: göbekli cam, amber bira, kabarcıklar
  const glass = spline([[-18, -22], [18, -22], [24, 0], [19, 24], [-19, 24], [-24, 0]], true, 6);
  shp(ctx, glass, BEER, 3, 53, { shade: [{ pts: [[-30, 8], [30, 8], [30, 30], [-30, 30]], color: BEER_D, alpha: 0.5 }, { pts: rrect(-14, -14, 6, 26, 3), color: "#fff3cf", alpha: 0.7 }] });
  for (let i = 0; i < 4; i++) {
    const y = 20 - ((t * 18 + i * 11) % 38);
    ctx.fillStyle = "#fff3cf"; path(ctx, ellipse(-6 + i * 5, y, 1.6, 1.6, 6)); ctx.fill();
  }
  // köpük: taşan bulut
  shp(ctx, spline([[-22, -20], [-20, -32], [-8, -36], [2, -31], [12, -37], [22, -30], [23, -19], [10, -15], [-6, -16]], true, 6), CAST.white, 3, 54);
  ctx.restore();
  glove(ctx, hand[0], hand[1], Math.PI + tilt, 55);
}

/** Atomcuk: çekirdeği yüzü olan, elektronları dönen atom. */
function atom(ctx: CanvasRenderingContext2D, s: State) {
  const speed = s.mood === "busy" ? 4 : 1.2;
  shadow(ctx, 100, 36);
  legs(ctx, [90, 110], 150, 5);
  const orbits = [0, Math.PI / 3, -Math.PI / 3];
  orbits.forEach((r, i) => ink(ctx, ellipse(100, 112, 80, 25, 48, 0, TAU, r), 3, { color: INK, closed: true, seed: 60 + i, breaks: 0.22 }));
  const electron = (r: number, i: number, front: boolean) => {
    const a = s.t * speed * (1 + i * 0.25) + i * 2.1, local = Math.sin(a);
    if (local > 0 !== front) return;
    const x = Math.cos(a) * 80, y = local * 25, px = 100 + x * Math.cos(r) - y * Math.sin(r), py = 112 + x * Math.sin(r) + y * Math.cos(r);
    shp(ctx, ellipse(px, py, 7, 7, 14), [CAST.teal, CAST.mustard, CAST.blue][i], 2.2, 70 + i, { regK: 0.4 });
  };
  orbits.forEach((r, i) => electron(r, i, false));
  const wa = wave(s, 2);
  const lh: P = s.poke < 1.4 ? [44 + Math.sin(wa) * 6, 84] : [54, 132];
  glove(ctx, lh[0], lh[1], arm(ctx, [68, 118], lh, 66), 67);
  shp(ctx, ellipse(100, 112, 38, 38, 32), CAST.coral, 3.4, 80, { shade: [{ pts: ellipse(118, 124, 26, 30, 20), color: CAST.coralD, alpha: 0.55 }] });
  eyes(ctx, 100, 106, s, { gap: 12, r: 8, seed: 81 });
  mouth(ctx, 100, 124, 14, s, 82);
  const rh: P = [148, 134];
  glove(ctx, rh[0], rh[1], arm(ctx, [132, 118], rh, 68), 69);
  orbits.forEach((r, i) => electron(r, i, true));
  orbits.forEach((r, i) => ink(ctx, ellipse(100, 112, 80, 25, 24, 0.1, Math.PI - 0.1, r), 3, { color: INK, seed: 90 + i, breaks: 0.22 }));
}

/** Fokur: fokurdayan deney şişesi. Hata modunda içi kararır ve tüter. */
function flask(ctx: CanvasRenderingContext2D, s: State) {
  const t = twos(s.t), bad = s.mood === "error";
  shadow(ctx, 100, 50);
  legs(ctx, [82, 118], 182, 7);
  const lh: P = s.poke < 1.4 ? [30 + Math.sin(wave(s, 3)) * 6, 110] : [36, 156];
  glove(ctx, lh[0], lh[1], arm(ctx, [62, 138], lh, 101), 102);
  const rh: P = [166, 156];
  glove(ctx, rh[0], rh[1], arm(ctx, [140, 138], rh, 103), 104);
  const body: P[] = [[86, 46], [114, 46], [116, 94], [154, 168], [148, 186], [52, 186], [46, 168], [84, 94]];
  const glass = spline(body, true, 4);
  // sıvı: dalgalı yüzey
  const level = 128, surf: P[] = [];
  for (let i = 0; i <= 12; i++) { const x = 40 + i * 10; surf.push([x, level + Math.sin(i * 0.9 + t * 5) * 3]); }
  shp(ctx, glass, "rgba(181,200,222,0.55)", 0, 105, { regK: 0 });
  ctx.save(); path(ctx, glass); ctx.clip();
  shp(ctx, [...surf, [170, 200], [30, 200]], bad ? "#6b5d52" : CAST.teal, 0, 106, { shade: [{ pts: [[110, 120], [170, 120], [170, 200], [120, 200]], color: bad ? "#4a3f38" : CAST.tealD, alpha: 0.5 }] });
  for (let i = 0; i < 5; i++) {
    const y = 182 - ((t * 30 + i * 13) % 56), x = 70 + i * 14 + Math.sin(t * 3 + i) * 3;
    ink(ctx, ellipse(x, y, 3.5, 3.5, 10), 1.6, { color: CAST.white, closed: true, seed: 107 + i });
  }
  ctx.restore();
  ink(ctx, glass, 3.6, { color: INK, closed: true, seed: 108, breaks: 0.12 });
  shp(ctx, rrect(80, 32, 40, 18, 5), CAST.mustardD, 3, 109);
  ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = CAST.white; path(ctx, rrect(92, 58, 5, 30, 2.5)); ctx.fill(); ctx.restore();
  eyes(ctx, 100, 148, s, { gap: 14, r: 8, seed: 110 });
  mouth(ctx, 100, 168, 14, s, 111);
  if (bad) {
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.7 + i / 3) % 1), y = 26 - u * 30, r = 6 + u * 10;
      shp(ctx, ellipse(100 + Math.sin(u * 6 + i) * 10, y, r, r * 0.8, 14), "#d4c29f", 2, 112 + i, { alpha: 1 - u });
    }
    sweat(ctx, 150, 110, 115);
  }
}

/** Halka: halkalı gezegen, yanında küçük bir ay döner. */
function planet(ctx: CanvasRenderingContext2D, s: State) {
  const t = twos(s.t), tilt = -0.28 + Math.sin(t * 0.9) * 0.05;
  const moonA = s.t * 0.9, moon: P = [100 + Math.cos(moonA) * 96, 70 + Math.sin(moonA) * 18];
  shadow(ctx, 100, 44);
  legs(ctx, [88, 112], 150, 9);
  const moonDraw = () => shp(ctx, ellipse(moon[0], moon[1], 10, 10, 16), CAST.blueL, 2.4, 120, { shade: [{ pts: ellipse(moon[0] + 4, moon[1] + 3, 7, 8, 12), color: CAST.blue, alpha: 0.6 }] });
  if (Math.sin(moonA) < 0) moonDraw();
  ink(ctx, ellipse(100, 112, 88, 21, 40, Math.PI, TAU, tilt), 13, { color: INK, seed: 121 });
  ink(ctx, ellipse(100, 112, 88, 21, 40, Math.PI, TAU, tilt), 7, { color: CAST.teal, seed: 122, taper: false });
  const lh: P = s.poke < 1.4 ? [40 + Math.sin(wave(s, 4)) * 6, 80] : [46, 136];
  glove(ctx, lh[0], lh[1], arm(ctx, [62, 118], lh, 123), 124);
  shp(ctx, ellipse(100, 112, 46, 46, 36), CAST.mustard, 3.4, 125, {
    shade: [{ pts: ellipse(124, 124, 30, 40, 20), color: CAST.mustardD, alpha: 0.5 }, { pts: rrect(56, 92, 90, 7, 3), color: "#f3d37f", alpha: 0.8 }],
  });
  eyes(ctx, 100, 102, s, { gap: 13, r: 8, seed: 126 });
  mouth(ctx, 100, 122, 14, s, 127);
  const rh: P = [154, 140];
  glove(ctx, rh[0], rh[1], arm(ctx, [138, 120], rh, 128), 129);
  ink(ctx, ellipse(100, 112, 88, 21, 40, 0, Math.PI, tilt), 13, { color: INK, seed: 130 });
  ink(ctx, ellipse(100, 112, 88, 21, 40, 0, Math.PI, tilt), 7, { color: CAST.teal, seed: 131, taper: false });
  if (Math.sin(moonA) >= 0) moonDraw();
}

/** Mercek: mikroskop. Arama modunda tüpü eğilip bakınır, merceğinde pırıltı. */
function scope(ctx: CanvasRenderingContext2D, s: State) {
  const t = twos(s.t), peer = s.mood === "search" ? Math.sin(t * 1.6) * 0.18 : Math.sin(t * 0.8) * 0.04;
  shadow(ctx, 100, 56);
  shp(ctx, rrect(46, 180, 108, 18, 8), CAST.blueD, 3.2, 140);
  shp(ctx, rrect(112, 96, 24, 88, 9), CAST.blue, 3.2, 141, { shade: [{ pts: rrect(126, 96, 12, 88, 4), color: CAST.blueD, alpha: 0.5 }] });
  shp(ctx, rrect(58, 150, 86, 10, 4), CAST.chromeD, 2.8, 142);
  const lh: P = s.poke < 1.4 ? [150 + Math.sin(wave(s, 5)) * 6, 70] : [160, 130];
  glove(ctx, lh[0], lh[1], arm(ctx, [130, 120], lh, 143), 144);
  // tüp: kafası
  ctx.save(); ctx.translate(92, 96); ctx.rotate(-0.32 + peer);
  shp(ctx, rrect(-24, -58, 48, 104, 18), CAST.blue, 3.4, 145, { shade: [{ pts: rrect(8, -58, 18, 104, 8), color: CAST.blueD, alpha: 0.45 }] });
  shp(ctx, rrect(-17, -76, 34, 22, 7), CAST.chrome, 3, 146);
  shp(ctx, rrect(-11, 44, 22, 18, 5), CAST.chrome, 3, 147);
  eyes(ctx, 0, -18, s, { gap: 11, r: 8, seed: 148 });
  mouth(ctx, 0, 6, 12, s, 149);
  if (s.mood === "search" || s.poke < 1) sparkle(ctx, 0, 66, 11 + Math.sin(t * 6) * 3, CAST.white);
  ctx.restore();
  const rh: P = [50, 132];
  glove(ctx, rh[0], rh[1], arm(ctx, [74, 112], rh, 150), 151);
}

/** Füze: lombozundan bakan roket; kaybolunca yan yatar ve süzülür. */
function rocket(ctx: CanvasRenderingContext2D, s: State) {
  const t = twos(s.t), lost = s.mood === "lost";
  const bob = Math.sin(t * 2.2) * 4, rot = lost ? 0.45 + Math.sin(t * 0.7) * 0.12 : Math.sin(t * 1.1) * 0.03;
  shadow(ctx, 100, lost ? 30 : 40);
  ctx.save(); ctx.translate(100, 120 + bob - (lost ? 10 : 0)); ctx.rotate(rot); ctx.translate(-100, -120);
  // alev
  const fl = 0.8 + hash(Math.floor(s.t * 12), 3) * 0.5;
  shp(ctx, spline([[84, 168], [100, 168 + 34 * fl], [116, 168], [100, 174]], true, 6), CAST.coral, 2.6, 160, { regK: 0.6 });
  shp(ctx, spline([[92, 170], [100, 170 + 20 * fl], [108, 170]], true, 6), CAST.mustard, 0, 161);
  // kanatçıklar
  shp(ctx, [[72, 132], [48, 172], [76, 166]], CAST.mustard, 3, 162);
  shp(ctx, [[128, 132], [152, 172], [124, 166]], CAST.mustard, 3, 163);
  const lh: P = s.poke < 1.4 ? [42 + Math.sin(wave(s, 6)) * 6, 86] : [46, 128];
  glove(ctx, lh[0], lh[1], arm(ctx, [72, 116], lh, 164), 165);
  // gövde: krem, burun mercan
  const body = spline([[100, 18], [124, 56], [130, 120], [122, 170], [78, 170], [70, 120], [76, 56]], true, 8);
  shp(ctx, body, CAST.white, 3.6, 166, {
    shade: [{ pts: [[40, 0], [160, 0], [160, 52], [40, 52]], color: CAST.coral }, { pts: [[108, 50], [160, 50], [160, 180], [112, 180]], color: "#e6d8bc", alpha: 0.7 }],
  });
  // lomboz = yüz
  shp(ctx, ellipse(100, 92, 24, 24, 28), CAST.tealL, 3.4, 167);
  eyes(ctx, 100, 90, s, { gap: 9, r: 7, seed: 168 });
  mouth(ctx, 100, 136, 14, s, 169);
  const rh: P = [156, 124];
  glove(ctx, rh[0], rh[1], arm(ctx, [128, 116], rh, 170), 171);
  ctx.restore();
  if (lost) for (let i = 0; i < 3; i++) sparkle(ctx, 30 + i * 70, 30 + ((i * 37) % 50), 7 + hash(Math.floor(s.t * 6), i) * 6, CAST.mustard);
  if (lost) sweat(ctx, 140, 60, 172);
}

const DRAW: Record<Kind, (ctx: CanvasRenderingContext2D, s: State) => void> = { tombul, atom, flask, planet, scope, rocket };

/** Dürtme: hazırlık ezilmesi → zıplama → inişte sönümlü ezilme. Nefes alma da burada. */
export function drawMascot(ctx: CanvasRenderingContext2D, kind: Kind, s: State, enter = 1) {
  const u = twos(s.poke);
  let dy = 0, sq = 0.012 * Math.sin(twos(s.t) * 2.2 + kind.length);
  if (u >= 0 && u < 0.08) sq += 0.12;
  else if (u < 0.5) { dy = Math.sin(((u - 0.08) / 0.42) * Math.PI) * 26; sq -= 0.07; }
  else if (u < 1.2) sq += 0.16 * Math.exp(-(u - 0.5) * 6) * Math.cos((u - 0.5) * 18);
  const k = back(enter);
  ctx.save();
  ctx.translate(100, 200 - dy);
  ctx.scale(k * (1 + sq * 0.5), k * (1 - sq));
  ctx.translate(-100, -200);
  DRAW[kind](ctx, s);
  if (u >= 0.45 && u < 0.9) for (let i = 0; i < 5; i++) { // inişte yıldız patlaması
    const a = (i / 5) * TAU + 0.3, r = 70 + (u - 0.45) * 90;
    shape(ctx, starPts(100 + Math.cos(a) * r, 120 + Math.sin(a) * r * 0.7, 7, 4, 0.35), { fill: CAST.mustard, lineColor: INK, line: 0, seed: 200 + i, alpha: 1 - (u - 0.45) / 0.45 });
  }
  ctx.restore();
}
