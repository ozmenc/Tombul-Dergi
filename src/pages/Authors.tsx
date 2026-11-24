import { Link } from "react-router";
import { listAuthors } from "../lib/api/people";
import { useAsync } from "../lib/useAsync";
import { useTitle } from "../lib/useTitle";
import { Avatar } from "../components/Avatar";
import { EmptyState, ErrorState, ListSkeleton } from "../components/States";

export default function Authors() {
  useTitle("Yazarlar");
  const [state, retry] = useAsync(listAuthors, []);
  return (
    <>
      <header>
        <h1 style={{ fontSize: 34 }}>Yazarlar</h1>
        <p className="muted">Tombul Dergi'de yazanlar.</p>
      </header>
      {state.status === "loading" && <ListSkeleton rows={4} />}
      {state.status === "error" && <ErrorState title="Yazarlar yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && (state.data.length === 0
        ? <EmptyState title="Henüz yazar yok">Yazar ekibi kuruluyor.</EmptyState>
        : (
          <ul className="people-grid">
            {state.data.map((a) => (
              <li key={a.id} className="person-card card">
                <Link to={`/yazar/${a.id}`} className="person-link">
                  <Avatar person={a} size={84} />
                  <strong>{a.name || "İsimsiz yazar"}</strong>
                  {a.bio && <span className="person-bio">{a.bio}</span>}
                  <small className="muted">{a.posts} yazı</small>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </>
  );
}
