import { useEffect, useRef, useState } from "react";
import { sendCheers } from "../lib/api/cheers";
import { useToast } from "./Toast";

const BATCH_MS = 600; // hızlı tıklamalar birikir, tek istekte gider
const MAX_BATCH = 50; // tek istekte en fazla (api/cheer.js)
const DROPS = [-16, -9, -2, 6, 13, 19].map((dx, i) => ({ "--dx": `${dx}px`, "--dy": `${-12 - (i % 3) * 5}px` }) as React.CSSProperties);

/** Bira şişesi: boyun, omuz, gövde, etiket ve kapak; `x` gövdenin ortası. */
function Bottle({ x }: { x: number }) {
  return (
    <g>
      <path className="cb-glass" d={`M${x - 3} 8h6v7l4 6v21a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V21l4-6z`} />
      <path className="cb-beer" d={`M${x - 6} 24h12v18a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z`} />
      <rect className="cb-label" x={x - 6} y={27} width={12} height={8} rx={1} />
      <ellipse className="cb-foam" cx={x} cy={4} rx={5} ry={3.2} />
      <rect className="cb-cap" x={x - 4} y={4} width={8} height={4} rx={1} />
      <path className="cb-shine" d={`M${x - 4} 23v14`} />
    </g>
  );
}

/** Tokuştur düğmesi: herkes istediği kadar basar; her basışta iki şişe çarpışır. */
export function CheersButton({ postId, count, large = false }: { postId: string; count: number; large?: boolean }) {
  const toast = useToast();
  const [confirmed, setConfirmed] = useState(count); // sunucunun son bildirdiği toplam
  const [pending, setPending] = useState(0); // gönderilmemiş + yoldaki basışlar
  const [burst, setBurst] = useState(0); // animasyonu her basışta baştan oynatmak için
  const queue = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const busy = useRef(false);

  useEffect(() => setConfirmed(count), [count]);

  async function flush() {
    if (busy.current || queue.current === 0) return;
    busy.current = true;
    const n = Math.min(queue.current, MAX_BATCH);
    queue.current -= n;
    try {
      const total = await sendCheers(postId, n);
      setConfirmed(total);
    } catch (err) {
      queue.current = 0;
      setPending(0);
      toast("error", (err as Error).message || "Tokuşturulamadı. Birazdan tekrar dene.");
      busy.current = false;
      return;
    }
    setPending((p) => Math.max(0, p - n));
    busy.current = false;
    if (queue.current > 0) void flush();
  }

  // Sayfadan çıkarken biriken basışlar da gitsin.
  useEffect(() => () => { clearTimeout(timer.current); if (queue.current > 0) void sendCheers(postId, Math.min(queue.current, MAX_BATCH)).catch(() => {}); }, [postId]);

  function cheer() {
    queue.current += 1;
    setPending((p) => p + 1);
    setBurst((b) => b + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, queue.current >= MAX_BATCH ? 0 : BATCH_MS);
  }

  const total = confirmed + pending;
  return (
    <button type="button" className={`cheers ${large ? "cheers-lg" : ""}`} onClick={cheer} aria-label={`Tokuştur, ${total} tokuşturma`}>
      <span className="cheers-art" aria-hidden="true">
        <svg key={burst} className={burst ? "clink" : ""} viewBox="0 0 64 48" width={large ? 52 : 34} height={large ? 39 : 26}>
          <g className="cb-left"><Bottle x={20} /></g>
          <g className="cb-right"><Bottle x={44} /></g>
          <path className="cb-spark" d="M32 0l2 5 5 1-5 2-2 5-2-5-5-2 5-1z" />
          {DROPS.map((s, i) => <circle key={i} className="cb-drop" cx={32} cy={9} r={i % 2 ? 1.6 : 2.2} style={s} />)}
        </svg>
        {burst > 0 && <span key={`p${burst}`} className="cheers-plus">+1</span>}
      </span>
      <span className="cheers-count" aria-live="polite">{total}</span>
      {large && <span className="cheers-label">Tokuştur</span>}
    </button>
  );
}
