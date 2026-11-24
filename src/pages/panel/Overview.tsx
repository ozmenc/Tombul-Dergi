import { Link } from "react-router";
import { usePanel, PanelHead } from "./PanelLayout";
import { listPanelPosts } from "../../lib/api/posts";
import { adminCounts, listMembers } from "../../lib/api/people";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { fmtRelative } from "../../lib/format";
import { Avatar } from "../../components/Avatar";
import { Bottle } from "../../components/Bottle";
import { Icon, type IconName } from "../../components/Icon";
import { ErrorState, ListSkeleton } from "../../components/States";

function Stat({ icon, label, value, to }: { icon: IconName; label: string; value: number | string; to?: string }) {
  const body = (<><span className="stat-icon"><Icon name={icon} /></span><strong>{value}</strong><span>{label}</span></>);
  return to ? <Link to={to} className="stat card">{body}</Link> : <div className="stat card">{body}</div>;
}

export default function Overview() {
  const { me } = usePanel();
  useTitle("Panel");
  const [posts, retry] = useAsync(() => listPanelPosts(me), [me.id]);
  const isAdmin = me.role === "admin";
  const [counts] = useAsync(() => (isAdmin ? adminCounts() : Promise.resolve(null)), [isAdmin]);
  const [members] = useAsync(() => (isAdmin ? listMembers() : Promise.resolve([])), [isAdmin]);

  if (posts.status === "loading") return <ListSkeleton rows={4} />;
  if (posts.status === "error") return <ErrorState title="Panel yüklenemedi" error={posts.error} onRetry={retry} />;

  const list = posts.data;
  const published = list.filter((p) => p.status === "published");
  const sum = (k: "likes" | "dislikes" | "comments") => published.reduce((a, p) => a + p.stats[k], 0);
  const pending = members.status === "success" ? members.data.filter((m) => m.role === "pending") : [];

  return (
    <>
      <section className="welcome card">
        <Bottle mood="happy" size={74} />
        <div>
          <h1>Selam {me.name.split(" ")[0] || "yazar"}!</h1>
          <p className="muted">{list.length === 0 ? "İlk yazını yazmaya ne dersin?" : `${published.length} yazın yayında, ${list.length - published.length} taslağın var.`}</p>
        </div>
      </section>

      <div className="stats">
        <Stat icon="pen" label="Yayında" value={published.length} to="/panel/yazilar?durum=published" />
        <Stat icon="folder" label="Taslak" value={list.length - published.length} to="/panel/yazilar?durum=draft" />
        <Stat icon="like" label="Beğeni" value={sum("likes")} />
        <Stat icon="comment" label="Yorum" value={sum("comments")} />
        {isAdmin && counts.status === "success" && counts.data && (
          <>
            <Stat icon="users" label="Üye" value={counts.data.members} to="/panel/uyeler" />
            <Stat icon="shield" label="Başvuru" value={counts.data.pending} to="/panel/uyeler?sekme=basvuru" />
            <Stat icon="eyeOff" label="Gizli yorum" value={counts.data.hidden} to="/panel/yorumlar?gizli=1" />
            <Stat icon="dislike" label="Beğenmeme" value={sum("dislikes")} />
          </>
        )}
      </div>

      {isAdmin && pending.length > 0 && (
        <section className="card panel-section">
          <PanelHead title="Onay bekleyen yazarlar"><Link to="/panel/uyeler?sekme=basvuru" className="btn btn-sm">Tümü</Link></PanelHead>
          <ul className="rows">
            {pending.slice(0, 4).map((m) => (
              <li key={m.id} className="row"><Avatar person={m} size={38} /><span className="row-main"><strong>{m.name || "İsimsiz"}</strong><small>{fmtRelative(m.created_at)} başvurdu</small></span></li>
            ))}
          </ul>
        </section>
      )}

      <section className="card panel-section">
        <PanelHead title="Son yazıların"><Link to="/panel/yazilar" className="btn btn-sm">Tümü</Link></PanelHead>
        {list.length === 0 ? (
          <p className="muted">Henüz yazın yok. <Link to="/panel/yeni">İlk yazını yaz</Link>.</p>
        ) : (
          <ul className="rows">
            {list.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link to={`/panel/yazi/${p.id}`} className="row">
                  <span className="row-main"><strong>{p.title}</strong><small>{fmtRelative(p.updated_at)} güncellendi</small></span>
                  <span className="row-stats"><Icon name="like" /> {p.stats.likes} <Icon name="comment" /> {p.stats.comments}</span>
                  <span className={`badge ${p.status === "published" ? "badge-mint" : "badge-muted"}`}>{p.status === "published" ? "Yayında" : "Taslak"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
