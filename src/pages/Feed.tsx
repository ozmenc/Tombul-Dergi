import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { listMostCheered, listPublished } from "../lib/api/posts";
import { listCategories } from "../lib/api/categories";
import { useAsync } from "../lib/useAsync";
import { usePaged } from "../lib/usePaged";
import { useTitle } from "../lib/useTitle";
import { PostCard } from "../components/PostCard";
import { EmptyState, ErrorState, FeedSkeleton, LoadMore } from "../components/States";

/** Dergi kapağı: öne çıkan yazı manşette, ardından en yeniler; kategoriyle süzülür (?kategori=…). */
export default function Feed() {
  useTitle();
  const [params, setParams] = useSearchParams();
  const cat = params.get("kategori");
  const [cats] = useAsync(listCategories, []);
  const [top] = useAsync(() => listMostCheered(5), []);
  const category = cats.status === "success" ? cats.data.find((c) => c.slug === cat) : undefined;
  const waiting = !!cat && cats.status === "loading"; // kategori kimliği gelmeden yanlış sayfa çekme
  const { state: posts, retry, more, hasMore, moreBusy } = usePaged(
    (limit) => (waiting ? new Promise<never>(() => {}) : listPublished({ categoryId: category?.id, limit })),
    [category?.id, waiting]
  );
  // Manşet: en yeni öne çıkan yazı; yoksa en yeni yazı.
  const [lead, rest] = useMemo(() => {
    if (posts.status !== "success" || posts.data.length === 0) return [null, []];
    const top = posts.data.find((p) => p.featured) ?? posts.data[0];
    return [top, posts.data.filter((p) => p.id !== top.id)];
  }, [posts]);

  const pick = (slug: string | null) => setParams(slug ? { kategori: slug } : {}, { replace: true });

  return (
    <>
      <header className="masthead">
        <h1>{category ? category.name : "Tombul Dergi"}</h1>
        <p className="muted">{category ? "Bu kategorideki yazılar, en yeniden eskiye." : "Deneme, hikâye, şehir, müzik, bilim ve gündem; üyelerimizin kaleminden."}</p>
      </header>
      {cats.status === "success" && (
        <nav className="section-nav" aria-label="Kategoriler">
          <button type="button" className={`chip ${!cat ? "on" : ""}`} aria-pressed={!cat} onClick={() => pick(null)}>Tümü</button>
          {cats.data.map((c) => <button key={c.id} type="button" className={`chip ${cat === c.slug ? "on" : ""}`} aria-pressed={cat === c.slug} onClick={() => pick(c.slug)}>{c.name}</button>)}
        </nav>
      )}
      {posts.status === "loading" && <FeedSkeleton />}
      {posts.status === "error" && <ErrorState title="Yazılar yüklenemedi" error={posts.error} onRetry={retry} />}
      {posts.status === "success" && (!lead
        ? <EmptyState title={cat ? "Bu kategoride henüz yazı yok" : "Henüz yayında yazı yok"} action={cat ? <button className="btn" onClick={() => pick(null)}>Tüm yazılar</button> : undefined}>Yazarlar karalamaya devam ediyor. Birazdan yine uğra.</EmptyState>
        : <>
            <PostCard post={lead} lead />
            {!cat && top.status === "success" && top.data.length > 0 && (
              <section className="top-cheered" aria-labelledby="en-cok">
                <h2 id="en-cok">En çok tokuşturulanlar</h2>
                <ol>
                  {top.data.map((p, i) => (
                    <li key={p.id}>
                      <span className="rank" aria-hidden="true">{i + 1}</span>
                      <Link className="t" to={`/yazi/${p.slug}`}>{p.title}</Link>
                      <span className="n">{p.cheers} tokuşturma</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {rest.map((p) => <PostCard key={p.id} post={p} />)}
            <LoadMore hasMore={hasMore} busy={moreBusy} onMore={more} />
          </>)}
    </>
  );
}
