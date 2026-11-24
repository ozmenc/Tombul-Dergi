import { useEffect, useRef } from "react";
import { GROUND } from "../toon/palette";
import { rays, twos } from "../toon/toon";
import { subscribe } from "../toon/ticker";
import { useTheme } from "../lib/theme";

/** Maskot sahnesinin arkasında yavaşça dönen 1950'ler reklam ışınları. */
export function Sunburst({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext("2d")!;
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 1.5); c.width = c.clientWidth * d; c.height = c.clientHeight * d; };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    const unsub = subscribe((t) => {
      const W = c.width, H = c.height;
      ctx.clearRect(0, 0, W, H);
      rays(ctx, W / 2, H * 0.78, 30, Math.hypot(W, H), GROUND[theme].rays, twos(t) * 0.04, 0.9);
    });
    return () => { unsub(); ro.disconnect(); };
  }, [theme]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
