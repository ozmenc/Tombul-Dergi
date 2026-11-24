import { Link } from "react-router";
import { useAsync } from "../lib/useAsync";
import { listAuthors } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import { Avatar } from "../components/Avatar";
import { EmptyState, ErrorState, PostListSkeleton } from "../components/States";

export default function Authors() {
  useTitle("Yazarlar");
  const [state, retry] = useAsync(listAuthors, []);
  return (
    <section className="page">
      <h1 className="page-title">Yazarlar</h1>
      <p className="page-lede">Tombul Dergi'de yazan öğrenciler. Birine tıkla, bütün yazılarını gör.</p>
      {state.status === "loading" && <PostListSkeleton rows={3} />}
      {state.status === "error" && <ErrorState title="Yazarlar yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && (state.data.length === 0
        ? <EmptyState title="Henüz yazar yok">Yazar ekibi kuruluyor.</EmptyState>
        : <ul className="people">
            {state.data.map((a) => (
              <li key={a.id}>
                <Link to={`/yazar/${a.id}`} className="card person">
                  <Avatar id={a.id} name={a.name} size={56} />
                  <span className="person-text">
                    <strong>{a.name || "İsimsiz yazar"}</strong>
                    {a.bio && <span className="person-bio">{a.bio}</span>}
                  </span>
                  <span className="person-count">{a.posts} yazı</span>
                </Link>
              </li>
            ))}
          </ul>)}
    </section>
  );
}
