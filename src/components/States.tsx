import type { ReactNode } from "react";
import { Link } from "react-router";
import { BlobCanvas } from "./BlobCanvas";

export function PostListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: rows }, (_, i) => (
        <div className="sk-row" key={i}>
          <div className="sk sk-title" />
          <div className="sk sk-line" />
          <div className="sk sk-line short" />
        </div>
      ))}
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="article-wrap" aria-busy="true" aria-label="Yükleniyor">
      <div className="sk sk-meta" />
      <div className="sk sk-h1" />
      <div className="sk sk-h1 short" />
      {Array.from({ length: 6 }, (_, i) => <div className="sk sk-line" key={i} />)}
    </div>
  );
}

export function Spinner({ label = "Yükleniyor" }: { label?: string }) {
  return <div className="spinner-wrap" aria-busy="true"><span className="spinner" aria-hidden="true" /><span className="sr-only">{label}</span></div>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <div className="state-blob" aria-hidden="true" />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Yüklenemedi", error, onRetry }: { title?: string; error?: Error; onRetry?: () => void }) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="state state-error" role="alert">
      <h2>{title}</h2>
      <p>{offline ? "İnternet bağlantın yok gibi görünüyor. Bağlanınca tekrar dene." : "Sunucudan yanıt alınamadı. Birazdan tekrar dene."}</p>
      {error && <p className="state-detail">{error.message}</p>}
      {onRetry && <button className="btn" onClick={onRetry}>Tekrar dene</button>}
    </div>
  );
}

export function NotFound({ title = "Burada bir şey yok", children }: { title?: string; children?: ReactNode }) {
  return (
    <section className="lost">
      <BlobCanvas family="lost" className="lost-canvas" />
      <div className="lost-text">
        <p className="lost-code">404</p>
        <h1>{title}</h1>
        <p>{children ?? "Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir."}</p>
        <Link className="btn btn-primary" to="/">Ana sayfaya dön</Link>
      </div>
    </section>
  );
}
