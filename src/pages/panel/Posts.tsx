import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { usePanel, PanelHead } from "./PanelLayout";
import { listPanelPosts } from "../../lib/api/posts";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { fmtRelative } from "../../lib/format";
import { Icon } from "../../components/Icon";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/States";

const FILTERS = [["all", "Tümü"], ["published", "Yayında"], ["draft", "Taslak"]] as const;
type Filter = (typeof FILTERS)[number][0];

export default function Posts() {
  const { me } = usePanel();
  useTitle("Yazılar");
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.find(([k]) => k === params.get("durum"))?.[0] ?? "all") as Filter;
  const [q, setQ] = useState("");
  const [state, retry] = useAsync(() => listPanelPosts(me), [me.id]);

  const shown = useMemo(() => {
    if (state.status !== "success") return [];
    const term = q.trim().toLocaleLowerCase("tr-TR");
    return state.data.filter((p) => (filter === "all" || p.status === filter) && (!term || p.title.toLocaleLowerCase("tr-TR").includes(term)));
  }, [state, filter, q]);

  const count = (f: Filter) => (state.status === "success" ? state.data.filter((p) => f === "all" || p.status === f).length : 0);
  const setFilter = (f: Filter) => setParams(f === "all" ? {} : { durum: f }, { replace: true });

  return (
    <section className="card panel-section">
      <PanelHead title={me.role === "admin" ? "Tüm yazılar" : "Yazıların"} />
      {state.status === "loading" && <ListSkeleton rows={4} />}
      {state.status === "error" && <ErrorState title="Yazılar yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && (state.data.length === 0 ? (
        <EmptyState card={false} title="Henüz yazın yok" action={<Link className="btn btn-primary" to="/panel/yeni">İlk yazını yaz</Link>}>
          Taslak olarak başla, hazır olunca yayınla.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <div className="segmented" role="group" aria-label="Duruma göre süz">
              {FILTERS.map(([k, label]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label} <span>{count(k)}</span></button>)}
            </div>
            <label className="search-mini">
              <Icon name="search" />
              <span className="sr-only">Başlıkta ara</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlıkta ara" />
            </label>
          </div>
          {shown.length === 0 ? <p className="muted" style={{ padding: "16px 4px" }}>Bu filtreyle eşleşen yazı yok.</p> : (
            <ul className="rows">
              {shown.map((p) => (
                <li key={p.id}>
                  <Link to={`/panel/yazi/${p.id}`} className="row">
                    <span className="row-main">
                      <strong>{p.featured && <Icon name="star" className="icon inline-star" filled />}{p.title}</strong>
                      <small>{me.role === "admin" && p.author ? `${p.author.name} · ` : ""}{p.category?.name ?? "Kategorisiz"} · {fmtRelative(p.updated_at)} güncellendi</small>
                    </span>
                    <span className="row-stats"><Icon name="like" /> {p.stats.likes} <Icon name="dislike" /> {p.stats.dislikes} <Icon name="comment" /> {p.stats.comments}</span>
                    <span className={`badge ${p.status === "published" ? "badge-mint" : "badge-muted"}`}>{p.status === "published" ? "Yayında" : "Taslak"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ))}
    </section>
  );
}
