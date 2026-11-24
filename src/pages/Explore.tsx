import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { listPopularTags, listPublished } from "../lib/api/posts";
import { searchAuthors } from "../lib/api/people";
import { listCategories } from "../lib/api/categories";
import { useAsync } from "../lib/useAsync";
import { usePaged } from "../lib/usePaged";
import { useTitle } from "../lib/useTitle";
import { sanitizeSearch } from "../lib/format";
import { Avatar } from "../components/Avatar";
import { FollowButton } from "../components/Actions";
import { Icon } from "../components/Icon";
import { PostCard } from "../components/PostCard";
import { EmptyState, ErrorState, FeedSkeleton, LoadMore } from "../components/States";

/** Arama, kategoriler ve etiketler. Filtreler adres çubuğunda: ?q=…&kategori=…&etiket=… */
export default function Explore() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const cat = params.get("kategori");
  const tag = params.get("etiket");
  const [draft, setDraft] = useState(q);
  useTitle(q ? `"${q}" araması` : tag ? `#${tag}` : "Keşfet");

  // Yazarken adres çubuğunu 350 ms gecikmeyle güncelle.
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft.trim() === q) return;
      const next = new URLSearchParams(params);
      if (draft.trim()) next.set("q", draft.trim()); else next.delete("q");
      setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [draft, q, params, setParams]);
  useEffect(() => setDraft(q), [q]);

  const [cats] = useAsync(listCategories, []);
  const [tags] = useAsync(() => listPopularTags(24), []);
  const categoryId = cats.status === "success" ? cats.data.find((c) => c.slug === cat)?.id : undefined;
  const waitingForCategory = !!cat && cats.status === "loading";
  const term = sanitizeSearch(q);
  const { state: posts, retry, more, hasMore, moreBusy } = usePaged(
    (limit) => (waitingForCategory ? new Promise<never>(() => {}) : listPublished({ q: term, tag: tag ?? undefined, categoryId, limit })),
    [term, tag, categoryId, waitingForCategory]
  );
  const [people] = useAsync(() => (term ? searchAuthors(term) : Promise.resolve([])), [term]);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const filtered = !!(term || cat || tag);

  return (
    <>
      <header style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h1 style={{ fontSize: 34 }}>Keşfet</h1>
        <form role="search" onSubmit={(e) => e.preventDefault()} style={{ position: "relative" }}>
          <label className="sr-only" htmlFor="explore-q">Yazı, yazar ya da konu ara</label>
          <input id="explore-q" className="input" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Yazı, yazar ya da konu ara"
            autoFocus style={{ paddingLeft: 48, minHeight: 56, borderRadius: 999, fontSize: 17 }} />
          <span style={{ position: "absolute", left: 18, top: 18, color: "var(--muted)" }}><Icon name="search" /></span>
        </form>
        {cats.status === "success" && (
          <div className="tag-list" role="group" aria-label="Kategoriler">
            <button type="button" className={`chip ${!cat ? "on" : ""}`} onClick={() => set("kategori", null)}>Tüm kategoriler</button>
            {cats.data.map((c) => (
              <button key={c.id} type="button" className={`chip ${cat === c.slug ? "on" : ""}`} onClick={() => set("kategori", cat === c.slug ? null : c.slug)}>
                {c.name} <span className="muted">{c.posts}</span>
              </button>
            ))}
          </div>
        )}
        {tag && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="badge badge-blue" style={{ fontSize: 15, minHeight: 32 }}>#{tag}</span>
            <button type="button" className="linkish" onClick={() => set("etiket", null)}>Etiketi kaldır</button>
          </div>
        )}
        {!tag && tags.status === "success" && tags.data.length > 0 && (
          <div className="tag-list" aria-label="Etiketler">
            {tags.data.map((t) => <button key={t.tag} type="button" className="chip" onClick={() => set("etiket", t.tag)}>#{t.tag}</button>)}
          </div>
        )}
      </header>

      {people.status === "success" && people.data.length > 0 && (
        <section className="aside-box" aria-labelledby="bulunan-yazarlar">
          <h2 id="bulunan-yazarlar">Yazarlar</h2>
          {people.data.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link to={`/yazar/${a.id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, color: "var(--ink)" }}>
                <Avatar person={a} size={44} ring />
                <span><strong>{a.name}</strong><br /><small className="muted">{a.posts} yazı · {a.followers} takipçi</small></span>
              </Link>
              <FollowButton authorId={a.id} small />
            </div>
          ))}
        </section>
      )}

      {posts.status === "loading" && <FeedSkeleton rows={2} />}
      {posts.status === "error" && <ErrorState title="Sonuçlar yüklenemedi" error={posts.error} onRetry={retry} />}
      {posts.status === "success" && (posts.data.length === 0
        ? <EmptyState title={filtered ? "Bununla ilgili bir şey bulamadık" : "Henüz yayında yazı yok"}>{filtered ? "Başka bir kelime dene ya da filtreleri kaldır." : "Birazdan yine uğra."}</EmptyState>
        : <>
            {filtered && <p className="muted">{hasMore ? `${posts.data.length}+` : posts.data.length} yazı bulundu</p>}
            {posts.data.map((p) => <PostCard key={p.id} post={p} />)}
            <LoadMore hasMore={hasMore} busy={moreBusy} onMore={more} />
          </>)}
    </>
  );
}
