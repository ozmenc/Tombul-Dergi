import type { ReactNode } from "react";
import { Link } from "react-router";
import { Bottle } from "./Bottle";

export function FeedSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 20 }} aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: rows }, (_, i) => (
        <div className="sk-card" key={i}>
          <div className="sk-row"><div className="sk sk-circle" /><div className="sk sk-line sk-short" /></div>
          <div className="sk sk-title" />
          <div className="sk sk-line" />
          <div className="sk sk-line sk-short" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="sk-card" aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: rows }, (_, i) => <div className="sk-row" key={i}><div className="sk sk-circle" /><div className="sk sk-line" /></div>)}
    </div>
  );
}

/** Şişe dolarken: bir şey yükleniyor. */
export function Spinner({ label = "Yükleniyor" }: { label?: string }) {
  return (
    <div className="state" aria-busy="true">
      <Bottle mood="filling" size={64} track={false} />
      <p>{label}…</p>
    </div>
  );
}

export function EmptyState({ title, children, action, card = true }: { title: string; children?: ReactNode; action?: ReactNode; card?: boolean }) {
  return (
    <div className={`state ${card ? "state-card" : ""}`}>
      <Bottle mood="sad" size={70} />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Yüklenemedi", error, onRetry }: { title?: string; error?: Error; onRetry?: () => void }) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="state state-card" role="alert">
      <Bottle mood="sad" size={70} />
      <h2>{title}</h2>
      <p>{offline ? "İnternet bağlantın yok gibi görünüyor. Bağlanınca tekrar dene." : "Sunucudan yanıt alınamadı. Birazdan tekrar dene."}</p>
      {error && <p className="state-detail">{error.message}</p>}
      {onRetry && <button className="btn btn-primary" onClick={onRetry}>Tekrar dene</button>}
    </div>
  );
}

/** 404: şişe devrilmiş. */
export function NotFound({ title = "Bu sayfa devrilmiş", children }: { title?: string; children?: ReactNode }) {
  return (
    <section className="state state-card lost">
      <Bottle mood="lost" size={200} />
      <p className="badge badge-amber">404</p>
      <h1>{title}</h1>
      <p>{children ?? "Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir."}</p>
      <Link className="btn btn-primary" to="/">Akışa dön</Link>
    </section>
  );
}

/** Yetkisi olmayan ama giriş yapmış kullanıcı. */
export function Forbidden({ children }: { children?: ReactNode }) {
  return (
    <section className="state state-card">
      <Bottle mood="shy" size={80} track={false} />
      <h1>Bu sayfa sana kapalı</h1>
      <p>{children ?? "Burayı görmek için gereken yetkin yok."}</p>
      <Link className="btn" to="/">Akışa dön</Link>
    </section>
  );
}
