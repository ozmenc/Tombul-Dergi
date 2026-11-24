import { Link, useParams } from "react-router";
import { useAsync } from "../lib/useAsync";
import { getAuthor } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import { Avatar } from "../components/Avatar";
import { PostRow } from "../components/PostItem";
import { EmptyState, ErrorState, NotFound, PostListSkeleton } from "../components/States";

export default function AuthorPage() {
  const { id = "" } = useParams();
  const [state, retry] = useAsync(() => getAuthor(id), [id]);
  useTitle(state.status === "success" ? state.data?.profile.name ?? "Yazar bulunamadı" : undefined);

  if (state.status === "loading") return <section className="page"><PostListSkeleton /></section>;
  if (state.status === "error") return <section className="page"><ErrorState title="Yazar yüklenemedi" error={state.error} onRetry={retry} /></section>;
  if (!state.data) return <NotFound title="Bu yazar bulunamadı">Adres yanlış olabilir ya da yazar artık burada yazmıyor.</NotFound>;

  const { profile, posts } = state.data;
  return (
    <section className="page">
      <Link to="/yazarlar" className="back">← Yazarlar</Link>
      <header className="author-head">
        <Avatar id={profile.id} name={profile.name} size={88} />
        <div>
          <h1 className="page-title">{profile.name || "İsimsiz yazar"}</h1>
          {profile.bio && <p className="page-lede">{profile.bio}</p>}
        </div>
      </header>
      {posts.length === 0
        ? <EmptyState title="Henüz yayında yazısı yok">{profile.name} ilk yazısını hazırlıyor.</EmptyState>
        : <div className="rows">{posts.map((p) => <PostRow key={p.id} post={p} showAuthor={false} />)}</div>}
    </section>
  );
}
