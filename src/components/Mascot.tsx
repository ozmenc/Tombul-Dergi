import { useEffect, useRef, useState } from "react";
import { drawMascot, LINES, NAMES, type Kind, type Mood } from "../toon/mascots";
import { setClock, type P } from "../toon/toon";
import { reducedMotion, subscribe } from "../toon/ticker";

type Props = { kind: Kind; mood?: Mood; size?: number; delay?: number; talk?: boolean; className?: string };

/** Tek bir karikatür maskot. talk: dokununca zıplar ve bir şey söyler (klavyeyle de). */
export function Mascot({ kind, mood = "idle", size = 160, delay = 0, talk = false, className = "" }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef({ look: [0, 0] as P, pokeAt: -99, now: 0, born: -1 });
  const [say, setSay] = useState<string | null>(null);

  useEffect(() => {
    const c = canvas.current!, ctx = c.getContext("2d")!;
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 2); c.width = Math.round(c.clientWidth * d); c.height = Math.round(c.clientHeight * d); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    const still = reducedMotion();
    const unsub = subscribe((t) => {
      const s = st.current;
      s.now = t;
      if (s.born < 0) s.born = t + delay;
      const enter = still ? 1 : Math.min(1, Math.max(0, (t - s.born) / 0.35));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      if (enter <= 0) return;
      const k = c.width / 200;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      setClock(t);
      drawMascot(ctx, kind, { t, look: s.look, poke: t - s.pokeAt, mood }, enter);
    });
    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.4;
      const dx = e.clientX - cx, dy = e.clientY - cy, l = Math.hypot(dx, dy) || 1, f = Math.min(1, l / 300);
      st.current.look = [(dx / l) * f, (dy / l) * f];
    };
    addEventListener("pointermove", onMove);
    return () => { unsub(); ro.disconnect(); removeEventListener("pointermove", onMove); };
  }, [kind, mood, delay]);

  useEffect(() => {
    if (!say) return;
    const id = setTimeout(() => setSay(null), 2800);
    return () => clearTimeout(id);
  }, [say]);

  const poke = () => {
    st.current.pokeAt = st.current.now;
    const lines = LINES[kind];
    setSay((prev) => { let n = lines[Math.floor(Math.random() * lines.length)]; if (n === prev && lines.length > 1) n = lines[(lines.indexOf(n) + 1) % lines.length]; return n; });
  };

  const art = <canvas ref={canvas} className="mascot-canvas" aria-hidden="true" />;
  return (
    <div className={`mascot ${className}`} style={{ width: size }}>
      {say && <p className="bubble" role="status">{say}</p>}
      {talk ? <button type="button" className="mascot-hit" onClick={poke} aria-label={`${NAMES[kind]} ile konuş`}>{art}</button> : art}
      {talk && <span className="mascot-name">{NAMES[kind]}</span>}
    </div>
  );
}
