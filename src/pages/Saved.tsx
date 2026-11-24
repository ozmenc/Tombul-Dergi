import { Link } from "react-router";
import { listPublished } from "../lib/api/posts";
import { useAsync } from "../lib/useAsync";
import { useTitle } from "../lib/useTitle";
import { useAuth } from "../lib/auth";
import { useSocial } from "../lib/social";
import { EmptyState, ErrorState, FeedSkeleton } from "../components/States";
import { PostCard } from "../components/PostCard";

export default function Saved() {
  useTitle("Kaydettiklerim");
  const auth = useAuth();
  const { saved, ready } = useSocial();
  const ids = [...saved];
  // Kayıttan çıkarılan yazı listeden hemen düşsün diye listeyi kaydedilen kümeden süzüyoruz; yeniden çekmiyoruz.
  const [state, retry] = useAsync(() => (auth.status === "signed-in" && ready ? listPublished({ ids }) : Promise.resolve([])), [auth.status, ready]);

  if (auth.status === "loading" || (auth.status === "signed-in" && !ready)) return <FeedSkeleton rows={2} />;
  if (auth.status !== "signed-in")
    return (
      <EmptyState title="Kaydettiklerini görmek için giriş yap" action={<Link className="btn btn-primary" to="/giris?next=%2Fkaydedilenler">Giriş yap</Link>}>
        Beğendiğin yazıları kaydet, sonra rahatça oku.
      </EmptyState>
    );

  return (
    <>
      <header>
        <h1 style={{ fontSize: 34 }}>Kaydettiklerim</h1>
        <p className="muted">Sonra okumak için ayırdıkların.</p>
      </header>
      {state.status === "loading" && <FeedSkeleton rows={2} />}
      {state.status === "error" && <ErrorState title="Kaydedilenler yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && (() => {
        const list = state.data.filter((p) => saved.has(p.id));
        return list.length === 0
          ? <EmptyState title="Henüz bir şey kaydetmedin" action={<Link className="btn btn-primary" to="/">Akışa göz at</Link>}>Bir yazının altındaki kaydet düğmesine bas, burada toplansın.</EmptyState>
          : list.map((p) => <PostCard key={p.id} post={p} />);
      })()}
    </>
  );
}
