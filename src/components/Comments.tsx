import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { addComment, deleteComment, listComments, setCommentHidden } from "../lib/api/comments";
import { errorCode } from "../lib/api/client";
import { useAsync } from "../lib/useAsync";
import { useMe } from "../lib/auth";
import { fmtRelative } from "../lib/format";
import type { Comment, Profile } from "../lib/types";
import { Avatar } from "./Avatar";
import { VoteButtons } from "./Actions";
import { Icon } from "./Icon";
import { ErrorState, ListSkeleton } from "./States";
import { useToast } from "./Toast";

const MAX = 2000;
type Sort = "new" | "top";

/** Bir yazının yorumları: yaz, yanıtla, oyla, sil; admin gizler. */
export function Comments({ postId, postAuthorId, onCountChange }: { postId: string; postAuthorId: string; onCountChange?: (n: number) => void }) {
  const me = useMe();
  const [state, retry, setState, refresh] = useAsync(() => listComments(postId), [postId, me?.id]);
  const [sort, setSort] = useState<Sort>("new");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  const list = state.status === "success" ? state.data : [];
  const visibleCount = list.filter((c) => !c.hidden).length;
  useEffect(() => { if (state.status === "success") onCountChange?.(visibleCount); }, [visibleCount, state.status, onCountChange]);

  const threads = useMemo(() => {
    const top = list.filter((c) => !c.parent_id);
    const score = (c: Comment) => c.likes - c.dislikes;
    top.sort((a, b) => (sort === "top" ? score(b) - score(a) : 0) || b.created_at.localeCompare(a.created_at));
    return top.map((c) => ({ c, replies: list.filter((r) => r.parent_id === c.id) }));
  }, [list, sort]);

  const update = (fn: (l: Comment[]) => Comment[]) => setState((s) => (s.status === "success" ? { status: "success", data: fn(s.data) } : s));
  // Ekranda hemen göster, sonra sunucudan sessizce tazele (yolda kalmış eski bir yükleme listeyi ezmesin).
  const added = (c: Comment) => { update((l) => (l.some((x) => x.id === c.id) ? l : [...l, c])); setFresh(c.id); setReplyTo(null); refresh(); };
  const removed = (id: string) => update((l) => l.filter((c) => c.id !== id && c.parent_id !== id));
  const toggledHidden = (id: string, hidden: boolean) => update((l) => l.map((c) => (c.id === id ? { ...c, hidden } : c)));

  return (
    <section id="yorumlar" className="comments" aria-labelledby="yorum-baslik">
      <div className="comments-head">
        <h2 id="yorum-baslik">Yorumlar {state.status === "success" && <span className="muted">· {visibleCount}</span>}</h2>
        <div className="segmented" role="group" aria-label="Sırala">
          <button type="button" aria-pressed={sort === "new"} onClick={() => setSort("new")}>En yeni</button>
          <button type="button" aria-pressed={sort === "top"} onClick={() => setSort("top")}>En beğenilen</button>
        </div>
      </div>

      {me ? <Composer me={me} postId={postId} parentId={null} onAdded={added} /> : <LoginNudge />}

      {state.status === "loading" && <ListSkeleton rows={3} />}
      {state.status === "error" && <ErrorState title="Yorumlar yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && threads.length === 0 && (
        <p className="muted" style={{ textAlign: "center", padding: "12px 0" }}>Henüz yorum yok. İlk yorumu sen yaz.</p>
      )}
      {threads.map(({ c, replies }) => (
        <CommentItem key={c.id} c={c} postAuthorId={postAuthorId} fresh={fresh === c.id} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} onRemoved={removed} onHidden={toggledHidden}>
          {(replies.length > 0 || replyTo === c.id) && (
            <div className="replies">
              {replies.map((r) => <CommentItem key={r.id} c={r} postAuthorId={postAuthorId} fresh={fresh === r.id} onRemoved={removed} onHidden={toggledHidden} />)}
              {replyTo === c.id && me && <Composer me={me} postId={postId} parentId={c.id} onAdded={added} autoFocus onCancel={() => setReplyTo(null)} />}
            </div>
          )}
        </CommentItem>
      ))}
    </section>
  );
}

function LoginNudge() {
  const { pathname } = useLocation();
  const next = encodeURIComponent(pathname + "#yorumlar");
  return (
    <div className="login-nudge">
      <p>Yorum yapmak, beğenmek ve yanıtlamak için giriş yap.</p>
      <Link className="btn" to={`/giris?next=${next}`}>Giriş yap</Link>
      <Link className="btn btn-primary" to={`/kayit?next=${next}`}>Kayıt ol</Link>
    </div>
  );
}

type ComposerProps = { me: Profile; postId: string; parentId: string | null; onAdded: (c: Comment) => void; autoFocus?: boolean; onCancel?: () => void };

function Composer({ me, postId, parentId, onAdded, autoFocus, onCancel }: ComposerProps) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false); // Ctrl+Enter düğmeyi atlar; state ikinci basışı aynı anda göremez
  const over = text.length > MAX;

  async function submit(e: FormEvent | React.KeyboardEvent) {
    e.preventDefault();
    if (sending.current || !text.trim() || over) return;
    sending.current = true;
    setBusy(true);
    try {
      onAdded(await addComment(postId, me, text, parentId));
      setText("");
      toast("success", parentId ? "Yanıtın eklendi." : "Yorumun eklendi. Şerefe!");
    } catch (err) {
      if (errorCode(err) === "23505") { setText(""); toast("info", "Bu yorumu az önce gönderdin."); } // supabase/006_comment_dedupe.sql
      else toast("error", "Yorum gönderilemedi. Tekrar dene.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const label = parentId ? "Yanıtın" : "Yorumun";
  return (
    <div className="composer">
      <Avatar person={me} size={parentId ? 34 : 42} />
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor={`c-${parentId ?? "top"}`}>{label}</label>
        <textarea id={`c-${parentId ?? "top"}`} value={text} onChange={(e) => setText(e.target.value)} autoFocus={autoFocus}
          placeholder={parentId ? "Yanıtını yaz…" : "Ne düşünüyorsun? Kibar ol, tombul ol."}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e); }} />
        {(text || parentId) && (
          <div className="composer-foot">
            <small className={over ? "over" : ""}>{over ? `${text.length - MAX} karakter fazla` : `${MAX - text.length} karakter kaldı`}</small>
            {onCancel && <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>Vazgeç</button>}
            <button className="btn btn-sm btn-primary" disabled={busy || !text.trim() || over}>{busy ? "Gönderiliyor…" : parentId ? "Yanıtla" : "Gönder"}</button>
          </div>
        )}
      </form>
    </div>
  );
}

type ItemProps = {
  c: Comment; postAuthorId: string; fresh: boolean; children?: React.ReactNode;
  onReply?: () => void; onRemoved: (id: string) => void; onHidden: (id: string, hidden: boolean) => void;
};

function CommentItem({ c, postAuthorId, fresh, children, onReply, onRemoved, onHidden }: ItemProps) {
  const me = useMe();
  const toast = useToast();
  const [armed, setArmed] = useState(false);
  const mine = me?.id === c.author?.id;
  const isAdmin = me?.role === "admin";

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  async function remove() {
    if (!armed) return setArmed(true);
    try { await deleteComment(c.id); onRemoved(c.id); toast("success", "Yorum silindi."); }
    catch { toast("error", "Silinemedi. Tekrar dene."); }
  }
  async function hide() {
    try { await setCommentHidden(c.id, !c.hidden); onHidden(c.id, !c.hidden); toast("success", c.hidden ? "Yorum yeniden görünür." : "Yorum gizlendi."); }
    catch { toast("error", "Güncellenemedi. Tekrar dene."); }
  }

  return (
    <div className={`comment ${c.hidden ? "hidden" : ""} ${fresh ? "fresh" : ""}`}>
      {c.author && <Avatar person={c.author} size={c.parent_id ? 34 : 42} />}
      <div className="comment-main">
        <div className="comment-bubble">
          <div className="comment-meta">
            <strong>{c.author?.name || "Silinmiş üye"}</strong>
            {c.author?.id === postAuthorId && <span className="badge badge-ink">yazar</span>}
            {c.hidden && <span className="badge badge-muted">gizli</span>}
            <small>{fmtRelative(c.created_at)}</small>
          </div>
          <p className="comment-body">{c.body}</p>
        </div>
        <div className="comment-actions">
          <VoteButtons kind="comment" id={c.id} likes={c.likes} dislikes={c.dislikes} myVote={c.myVote} />
          {onReply && <button type="button" className="act" onClick={onReply}><Icon name="reply" /> Yanıtla</button>}
          {(mine || isAdmin) && <button type="button" className="act" onClick={remove} style={armed ? { color: "var(--danger)" } : undefined}><Icon name="trash" /> {armed ? "Eminim, sil" : "Sil"}</button>}
          {isAdmin && <button type="button" className="act" onClick={hide}><Icon name={c.hidden ? "eye" : "eyeOff"} /> {c.hidden ? "Göster" : "Gizle"}</button>}
        </div>
        {children}
      </div>
    </div>
  );
}
