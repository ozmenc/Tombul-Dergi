import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AdminOnly, PanelHead } from "./PanelLayout";
import { deleteComment, listRecentComments, setCommentHidden } from "../../lib/api/comments";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { fmtRelative } from "../../lib/format";
import { Avatar } from "../../components/Avatar";
import { Icon } from "../../components/Icon";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/States";
import { useToast } from "../../components/Toast";

export default function Moderation() {
  useTitle("Yorumlar");
  return <AdminOnly><CommentModeration /></AdminOnly>;
}

function CommentModeration() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const onlyHidden = params.get("gizli") === "1";
  const [state, retry, setState] = useAsync(() => listRecentComments(onlyHidden), [onlyHidden]);
  const [armed, setArmed] = useState("");

  /** fn: yeni gizlilik durumu ya da listeden çıkarmak için null. */
  const patch = (id: string, fn: (hidden: boolean) => boolean | null) =>
    setState((s) => s.status !== "success" ? s : {
      status: "success",
      data: s.data.flatMap((c) => { if (c.id !== id) return [c]; const h = fn(c.hidden); return h === null ? [] : [{ ...c, hidden: h }]; }),
    });

  async function toggle(id: string, hidden: boolean) {
    try { await setCommentHidden(id, !hidden); patch(id, () => (onlyHidden && hidden ? null : !hidden)); toast("success", hidden ? "Yorum yeniden görünür." : "Yorum gizlendi."); }
    catch { toast("error", "Güncellenemedi. Tekrar dene."); }
  }
  async function remove(id: string) {
    if (armed !== id) { setArmed(id); setTimeout(() => setArmed((a) => (a === id ? "" : a)), 4000); return; }
    try { await deleteComment(id); patch(id, () => null); toast("success", "Yorum silindi."); }
    catch { toast("error", "Silinemedi. Tekrar dene."); }
  }

  return (
    <section className="card panel-section">
      <PanelHead title="Yorumlar">
        <div className="segmented" role="group" aria-label="Yorum listesi">
          <button type="button" aria-pressed={!onlyHidden} onClick={() => setParams({}, { replace: true })}>Son yorumlar</button>
          <button type="button" aria-pressed={onlyHidden} onClick={() => setParams({ gizli: "1" }, { replace: true })}>Gizlenenler</button>
        </div>
      </PanelHead>
      {state.status === "loading" && <ListSkeleton rows={4} />}
      {state.status === "error" && <ErrorState title="Yorumlar yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && (state.data.length === 0
        ? <EmptyState card={false} title={onlyHidden ? "Gizlenen yorum yok" : "Henüz yorum yok"}>{onlyHidden ? "Gizlediğin yorumlar burada durur." : "Okurlar yorum yaptıkça burada görünür."}</EmptyState>
        : (
          <ul className="rows">
            {state.data.map((c) => (
              <li key={c.id} className={`row mod-row ${c.hidden ? "is-hidden" : ""}`}>
                {c.author && <Avatar person={c.author} size={38} />}
                <span className="row-main">
                  <strong>{c.author?.name || "Silinmiş üye"} {c.hidden && <span className="badge badge-muted">gizli</span>}</strong>
                  <span className="mod-body">{c.body}</span>
                  <small>{fmtRelative(c.created_at)} · {c.post ? <Link to={`/yazi/${c.post.slug}#yorumlar`}>{c.post.title}</Link> : "silinmiş yazı"} · {c.likes} beğeni · {c.dislikes} beğenmeme</small>
                </span>
                <button type="button" className="btn btn-sm" onClick={() => toggle(c.id, c.hidden)}><Icon name={c.hidden ? "eye" : "eyeOff"} /> {c.hidden ? "Göster" : "Gizle"}</button>
                <button type="button" className={`btn btn-sm ${armed === c.id ? "btn-danger" : "btn-ghost"}`} onClick={() => remove(c.id)}><Icon name="trash" /> {armed === c.id ? "Eminim" : "Sil"}</button>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
