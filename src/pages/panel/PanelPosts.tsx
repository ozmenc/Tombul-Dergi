import { useState } from "react";
import { Link } from "react-router";
import { usePanel } from "./PanelLayout";
import { listPanelPosts } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { fmtDate } from "../../lib/format";
import { EmptyState, ErrorState, PostListSkeleton } from "../../components/States";

const FILTERS = [["all", "Tümü"], ["draft", "Taslaklar"], ["published", "Yayında"]] as const;

export default function PanelPosts() {
  const { me } = usePanel();
  useTitle("Panel");
  const [state, retry] = useAsync(() => listPanelPosts(me), [me.id, me.role]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");

  return (
    <>
      <div className="panel-head">
        <h1>{me.role === "admin" ? "Tüm yazılar" : "Yazıların"}</h1>
        <Link to="/panel/yeni" className="btn btn-primary">Yeni yazı</Link>
      </div>
      {state.status === "loading" && <PostListSkeleton />}
      {state.status === "error" && <ErrorState title="Yazılar yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && (state.data.length === 0
        ? <EmptyState title="Henüz yazın yok" action={<Link to="/panel/yeni" className="btn btn-primary">İlk yazını yaz</Link>}>
            Taslak olarak başla, hazır olunca yayınla.
          </EmptyState>
        : <>
            <div className="segmented" role="group" aria-label="Duruma göre süz">
              {FILTERS.map(([k, label]) => (
                <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>
                  {label} <span>{k === "all" ? state.data.length : state.data.filter((p) => p.status === k).length}</span>
                </button>
              ))}
            </div>
            <ul className="panel-list">
              {state.data.filter((p) => filter === "all" || p.status === filter).map((p) => (
                <li key={p.id}>
                  <Link to={`/panel/yazi/${p.id}`} className="panel-item">
                    <span>
                      <strong>{p.title}</strong>
                      <small>{me.role === "admin" && p.author ? `${p.author.name}, ` : ""}son değişiklik {fmtDate(p.updated_at)}</small>
                    </span>
                    <span className={`badge ${p.status}`}>{p.status === "published" ? "Yayında" : "Taslak"}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {state.data.every((p) => filter !== "all" && p.status !== filter) && (
              <p className="muted">{filter === "draft" ? "Taslağın yok." : "Yayında yazın yok."}</p>
            )}
          </>)}
    </>
  );
}
