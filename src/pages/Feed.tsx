import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { listPublished } from "../lib/api/posts";
import { listAuthors } from "../lib/api/people";
import { listCategories } from "../lib/api/categories";
import { useAsync } from "../lib/useAsync";
import { usePaged } from "../lib/usePaged";
import { useTitle } from "../lib/useTitle";
import { useMe } from "../lib/auth";
import { useSocial } from "../lib/social";
import { popularity } from "../lib/format";
import { canWrite } from "../lib/types";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { PostCard } from "../components/PostCard";
import { EmptyState, ErrorState, FeedSkeleton, LoadMore } from "../components/States";

type Tab = "senin" | "takip" | "populer";
const TABS: [Tab, string][] = [["senin", "Senin için"], ["takip", "Takip ettiklerin"], ["populer", "Popüler"]];

export default function Feed() {
  useTitle();
  const me = useMe();
  const { following, ready } = useSocial();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find(([k]) => k === params.get("akis"))?.[0] ?? "senin") as Tab;
  const cat = params.get("kategori");

  const [cats] = useAsync(listCategories, []);
  const [authors] = useAsync(listAuthors, []);
  const categoryId = cats.status === "success" ? cats.data.find((c) => c.slug === cat)?.id : undefined;
  const followIds = [...following].sort().join(",");
  // Takip listesi ya da kategori kimliği henüz gelmediyse yanlış bir ilk sayfa çekme.
  const waiting = (tab === "takip" && !ready) || (!!cat && cats.status === "loading");
  const { state: posts, retry, more, hasMore, moreBusy } = usePaged(
    async (limit) => {
      if (waiting) return new Promise<never>(() => {});
      if (tab === "takip") return listPublished({ authorIds: [...following], categoryId, limit });
      if (tab === "populer") {
        // shortcut: popülerlik sayaçlardan hesaplanır; son 200 yazı içinde sıralanır. Yazılar binleri bulunca sunucuda sırala.
        const all = await listPublished({ categoryId, limit: 200 });
        return all.sort((a, b) => popularity(b.stats) - popularity(a.stats)).slice(0, limit);
      }
      return listPublished({ categoryId, limit });
    },
    [tab, categoryId, tab === "takip" ? followIds : "", me?.id, waiting]
  );

  const shown = useMemo(() => {
    if (posts.status !== "success") return [];
    return tab === "senin" ? [...posts.data].sort((a, b) => Number(b.featured) - Number(a.featured)) : posts.data;
  }, [posts, tab]);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <div className="stories" aria-label="Yazarlar">
        <Link to={!me ? "/kayit" : canWrite(me.role) ? "/panel/yeni" : "/hesap#yazarlik"} className="story story-add">
          <span className="ring"><span className="avatar" style={{ width: 66, height: 66, background: "var(--surface)", color: "var(--muted)" }}><Icon name="plus" /></span></span>
          <span>{me && canWrite(me.role) ? "Yeni yazı" : "Sen de yaz"}</span>
        </Link>
        {authors.status === "success" && authors.data.map((a) => (
          <Link key={a.id} to={`/yazar/${a.id}`} className="story">
            <Avatar person={a} size={66} ring />
            <span>{a.name || "İsimsiz"}</span>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div className="segmented" role="group" aria-label="Akış">
          {TABS.map(([k, label]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => set("akis", k === "senin" ? null : k)}>{label}</button>)}
        </div>
      </div>
      {cats.status === "success" && (
        <div className="stories" role="group" aria-label="Kategoriler" style={{ gap: 8 }}>
          <button type="button" className={`chip ${!cat ? "on" : ""}`} onClick={() => set("kategori", null)}>Hepsi</button>
          {cats.data.map((c) => <button key={c.id} type="button" className={`chip ${cat === c.slug ? "on" : ""}`} onClick={() => set("kategori", c.slug)}>{c.name}</button>)}
        </div>
      )}

      {tab === "takip" && !me ? (
        <EmptyState title="Takip ettiklerini görmek için giriş yap" action={<Link className="btn btn-primary" to="/giris?next=%2F%3Fakis%3Dtakip">Giriş yap</Link>}>
          Sevdiğin yazarları takip et, yazıları burada toplansın.
        </EmptyState>
      ) : posts.status === "loading" ? <FeedSkeleton />
        : posts.status === "error" ? <ErrorState title="Akış yüklenemedi" error={posts.error} onRetry={retry} />
        : shown.length === 0 ? (
          tab === "takip"
            ? <EmptyState title="Henüz kimseyi takip etmiyorsun" action={<Link className="btn btn-primary" to="/yazarlar">Yazarları keşfet</Link>}>Takip ettiğin yazarların yeni yazıları burada görünür.</EmptyState>
            : <EmptyState title={cat ? "Bu kategoride henüz yazı yok" : "Henüz yayında yazı yok"} action={cat ? <button className="btn" onClick={() => set("kategori", null)}>Tüm yazılar</button> : undefined}>Yazarlar karalamaya devam ediyor. Birazdan yine uğra.</EmptyState>
        ) : (
          <>
            {shown.map((p) => <PostCard key={p.id} post={p} />)}
            <LoadMore hasMore={hasMore} busy={moreBusy} onMore={more} />
          </>
        )}
    </>
  );
}
