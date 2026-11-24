import { useEffect, useId, useRef, useState } from "react";

export type BottleMood = "idle" | "happy" | "sad" | "shy" | "lost" | "filling";

type Props = {
  mood?: BottleMood;
  /** Genişlik (px); yükseklik orantılı. */
  size?: number;
  /** Gözler imleci takip etsin mi. */
  track?: boolean;
  /** Dokununca zıplasın (sevinç animasyonu). */
  playful?: boolean;
  /** Verilirse ekran okuyucuya anlatılır; yoksa süs. */
  label?: string;
  className?: string;
};

const MOUTH: Record<BottleMood, string> = {
  idle: "M33 84 Q40 90 47 84",
  happy: "M32 82 Q40 94 48 82 Z",
  sad: "M33 88 Q40 82 47 88",
  shy: "M35 85 Q40 88 45 85",
  lost: "M37 86 a3 3.6 0 1 0 6 0 a3 3.6 0 1 0 -6 0",
  filling: "M34 85 Q40 88 46 85",
};

/** Tombul Dergi'nin bira şişesi karakteri. */
export function Bottle({ mood = "idle", size = 80, track = true, playful = false, label, className = "" }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const pupils = useRef<SVGGElement>(null);
  const [pop, setPop] = useState(0);
  const id = useId().replace(/:/g, "");
  const eyesOpen = mood !== "shy";

  useEffect(() => {
    if (!track || !eyesOpen) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = svg.current?.getBoundingClientRect();
        if (!r || !pupils.current) return;
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.5);
        const l = Math.hypot(dx, dy) || 1, k = Math.min(1, l / 260) * 2.6;
        pupils.current.setAttribute("transform", `translate(${((dx / l) * k).toFixed(2)} ${((dy / l) * k).toFixed(2)})`);
      });
    };
    addEventListener("pointermove", onMove);
    return () => { removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, [track, eyesOpen]);

  // Devrik şişe yatay durur: çizim alanı da yataydır.
  const [vbW, vbH, viewBox] = mood === "lost" ? [190, 85, "20 70 190 85"] : [80, 150, "0 0 80 150"];
  const art = (
    <svg
      ref={svg}
      viewBox={viewBox}
      width={size}
      height={(size * vbH) / vbW}
      className={`bottle bottle-${mood} ${className}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <defs>
        <clipPath id={`glass-${id}`}>
          <path d="M31 30H49V48C49 58 66 62 66 78V132Q66 142 56 142H24Q14 142 14 132V78C14 62 31 58 31 48Z" />
        </clipPath>
      </defs>
      {mood === "lost" ? <ellipse className="bt-puddle" cx="178" cy="150" rx="26" ry="4" /> : <ellipse className="bt-shadow" cx="40" cy="146" rx="22" ry="3" />}
      {/* devrik: tabanın alt-ortası etrafında yana yatar. Stilsiz dış grup: CSS dönme ayarları bu dönüşümü etkilemesin. */}
      <g transform={mood === "lost" ? "translate(0 -24) rotate(78 40 146)" : undefined}>
      <g className="bt-body" key={pop}>
        <g clipPath={`url(#glass-${id})`}>
          <rect className="bt-glass" x="10" y="28" width="60" height="120" />
          <g className="bt-liquid">
            <rect className="bt-beer" x="10" y="44" width="60" height="110" />
            <path className="bt-foam" d="M10 46 Q16 40 22 45 Q28 39 34 45 Q40 39 46 45 Q52 39 58 45 Q64 40 70 46 V50 H10Z" />
          </g>
          <circle className="bt-bub b1" cx="22" cy="128" r="1.8" />
          <circle className="bt-bub b2" cx="30" cy="132" r="1.3" />
          <circle className="bt-bub b3" cx="54" cy="130" r="1.6" />
          <circle className="bt-bub b4" cx="60" cy="124" r="1.1" />
        </g>
        <path className="bt-outline" d="M31 30H49V48C49 58 66 62 66 78V132Q66 142 56 142H24Q14 142 14 132V78C14 62 31 58 31 48Z" />
        <path className="bt-shine" d="M20 84V126" />
        <g className="bt-cap">
          <path d="M28 16H52V28L49 31L46 28L43 31L40 28L37 31L34 28L31 31L28 28Z" />
          <rect x="29" y="12" width="22" height="6" rx="3" />
        </g>
        <rect className="bt-label" x="17" y="98" width="46" height="28" rx="9" />
        <text className="bt-label-text" x="40" y="116.5" textAnchor="middle">TOMBUL</text>
        <g className="bt-face">
          {mood === "sad" && <path className="bt-brow" d="M26 63 L35 66 M54 63 L45 66" />}
          {eyesOpen ? (
            <g className="bt-eyes">
              <ellipse className="bt-eye" cx="31" cy="72" rx="6.4" ry="7.2" />
              <ellipse className="bt-eye" cx="49" cy="72" rx="6.4" ry="7.2" />
              <g ref={pupils}>
                <circle className="bt-pupil" cx="31.5" cy="73" r="3.1" />
                <circle className="bt-pupil" cx="49.5" cy="73" r="3.1" />
                <circle className="bt-glint" cx="30.3" cy="71.4" r="1" />
                <circle className="bt-glint" cx="48.3" cy="71.4" r="1" />
              </g>
            </g>
          ) : (
            <path className="bt-closed" d="M25 72 Q31 77 37 72 M43 72 Q49 77 55 72" />
          )}
          <ellipse className="bt-cheek" cx="23" cy="81" rx="4" ry="2.4" />
          <ellipse className="bt-cheek" cx="57" cy="81" rx="4" ry="2.4" />
          <path className={`bt-mouth ${mood === "happy" ? "open" : ""}`} d={MOUTH[mood]} />
        </g>
      </g>
      </g>
    </svg>
  );

  if (!playful) return art;
  return (
    <button type="button" className={`bottle-hit ${pop ? "popping" : ""}`} onClick={() => setPop((n) => n + 1)} aria-label={label ?? "Tombul şişeyle tokuştur"}>
      {art}
    </button>
  );
}
