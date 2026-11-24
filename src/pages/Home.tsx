import { useAsync } from "../lib/useAsync";
import { listPublished } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import { BlobCanvas } from "../components/BlobCanvas";
import { FeaturedPost, PostRow } from "../components/PostItem";
import { EmptyState, ErrorState, PostListSkeleton } from "../components/States";

export default function Home() {
  useTitle();
  const [state, retry] = useAsync(listPublished, []);
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h1>Tombul Dergi</h1>
          <p>Bir avuç yazarın denemeleri, kısa hikâyeleri ve karalamaları. Az ama dolu dolu.</p>
          <a className="btn btn-primary" href="#yazilar">Yazıları oku</a>
        </div>
        <BlobCanvas family="family" className="hero-canvas" />
      </section>

      <section id="yazilar" className="section" aria-labelledby="h-latest">
        <h2 id="h-latest" className="section-title">Son yazılar</h2>
        {state.status === "loading" && <PostListSkeleton />}
        {state.status === "error" && <ErrorState title="Yazılar yüklenemedi" error={state.error} onRetry={retry} />}
        {state.status === "success" && (state.data.length === 0
          ? <EmptyState title="Henüz yayında yazı yok">Yazarlarımız ilk karalamaları hazırlıyor. Birazdan yine uğra.</EmptyState>
          : <>
              <FeaturedPost post={state.data[0]} />
              <div className="rows">{state.data.slice(1).map((p) => <PostRow key={p.id} post={p} />)}</div>
            </>)}
      </section>
    </>
  );
}
