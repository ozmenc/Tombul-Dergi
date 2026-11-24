import { useEffect, useRef } from "react";
import { GROUND } from "../toon/palette";
import { boomerang, ellipse, hash, ink, kidney, paperTexture, path, setClock, sparkle, starPts, twos, type P } from "../toon/toon";
import { subscribe } from "../toon/ticker";
import { useTheme } from "../lib/theme";

// Arka plan "oda" değildir: bir renk düzlemi, bir zemin bandı, boşluklu bir ufuk çizgisi ve birkaç atom çağı süsü.
const ORN: { x: number; y: number; s: number; r: number; kind: "boom" | "kid" | "star" | "dots" }[] = [
  { x: 0.08, y: 0.2, s: 70, r: 0.3, kind: "boom" },
  { x: 0.9, y: 0.16, s: 60, r: 0, kind: "star" },
  { x: 0.78, y: 0.55, s: 90, r: -0.4, kind: "kid" },
  { x: 0.16, y: 0.62, s: 40, r: 0, kind: "dots" },
  { x: 0.5, y: 0.08, s: 38, r: 0.6, kind: "dots" },
  { x: 0.34, y: 0.4, s: 46, r: 0.2, kind: "star" },
];

export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const c = ref.current!, ctx = c.getContext("2d")!, G = GROUND[theme];
    let W = 0, H = 0, lastStep = -1, pattern: CanvasPattern | null = null;
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; c.width = W * d; c.height = H * d; lastStep = -1; };
    fit();
    addEventListener("resize", fit);
    const unsub = subscribe((t) => {
      const step = Math.floor(t * 12);
      if (step === lastStep) return; // arka plan iki karede bir
      lastStep = step;
      setClock(t);
      const d = c.width / W;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.fillStyle = G.wall; ctx.fillRect(0, 0, W, H);
      const floorY = H * 0.86;
      ctx.fillStyle = G.floor; ctx.fillRect(0, floorY, W, H - floorY);
      ink(ctx, [[-10, floorY], [W + 10, floorY]], 2.6, { color: G.line, seed: 9, breaks: 0.35, taper: false, alpha: 0.45 });
      ORN.forEach((o, i) => {
        const x = o.x * W + Math.sin(twos(t) * 0.25 + i) * 6, y = o.y * H + Math.cos(twos(t) * 0.2 + i) * 5, col = G.orn[i % G.orn.length];
        ctx.fillStyle = col;
        if (o.kind === "dots") for (let k = 0; k < 6; k++) { path(ctx, ellipse(x + (k % 3) * o.s * 0.5, y + Math.floor(k / 3) * o.s * 0.5, o.s * 0.12, o.s * 0.12, 12)); ctx.fill(); }
        else {
          const pts: P[] = o.kind === "boom" ? boomerang(x, y, o.s, o.r) : o.kind === "kid" ? kidney(x, y, o.s, o.r) : starPts(x, y, o.s * 0.7, 8, 0.45, o.r + twos(t) * 0.05);
          path(ctx, pts); ctx.fill();
        }
      });
      const n = theme === "dark" ? 22 : 9;
      for (let i = 0; i < n; i++) {
        const x = hash(i, 1) * W, y = hash(i, 2) * floorY * 0.95, tw = hash(Math.floor(t * 12 / 3), i);
        sparkle(ctx, x, y, 4 + tw * (theme === "dark" ? 6 : 8), G.spark, 0, theme === "dark" ? 0.5 + tw * 0.5 : 0.35);
      }
      pattern ??= ctx.createPattern(paperTexture(), "repeat");
      if (pattern) { ctx.save(); ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = theme === "dark" ? 0.12 : 0.22; ctx.fillStyle = pattern; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    });
    return () => { unsub(); removeEventListener("resize", fit); };
  }, [theme]);

  return <canvas ref={ref} className="backdrop" aria-hidden="true" />;
}
