import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router";
import { usePanel } from "./PanelLayout";
import { createPost, deletePost, getPost, IMAGE_TYPES, updatePost, uploadImage, type PostInput } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { SLUG_RE, slugify } from "../../lib/format";
import { renderMarkdown } from "../../lib/markdown";
import type { Post } from "../../lib/types";
import { useToast } from "../../components/Toast";
import { ArticleSkeleton, EmptyState, ErrorState } from "../../components/States";

const EMPTY: PostInput = { title: "", slug: "", content: "", cover: "", status: "draft" };

export default function Editor() {
  const { id } = useParams();
  const [state, retry] = useAsync(() => (id ? getPost(id) : Promise.resolve(null)), [id]);
  useTitle(id ? "Yazıyı düzenle" : "Yeni yazı");

  if (state.status === "loading") return <ArticleSkeleton />;
  if (state.status === "error") return <ErrorState title="Yazı yüklenemedi" error={state.error} onRetry={retry} />;
  if (id && !state.data)
    return (
      <EmptyState title="Yazı bulunamadı" action={<Link to="/panel" className="btn">Yazılara dön</Link>}>
        Silinmiş olabilir ya da bu yazıyı düzenleme yetkin yok.
      </EmptyState>
    );
  // key: başka bir yazıya geçince form sıfırlansın
  return <Form key={id ?? "new"} initial={state.data} />;
}

function Form({ initial }: { initial: Post | null }) {
  const { me } = usePanel();
  const toast = useToast();
  const navigate = useNavigate();
  const pick = (p: Post | null): PostInput => (p ? { title: p.title, slug: p.slug, content: p.content, cover: p.cover, status: p.status } : EMPTY);

  const [saved, setSaved] = useState<PostInput>(pick(initial));
  const [v, setV] = useState<PostInput>(saved);
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"" | "cover" | "inline">("");
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const leaving = useRef(false);

  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const set = <K extends keyof PostInput>(k: K, val: PostInput[K]) => setV((x) => ({ ...x, [k]: val }));

  async function onUpload(e: ChangeEvent<HTMLInputElement>, kind: "cover" | "inline") {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadImage(file, me.id);
      if (kind === "cover") set("cover", url);
      else {
        const ta = textarea.current, at = ta?.selectionStart ?? v.content.length;
        const before = v.content.slice(0, at).trimEnd(), after = v.content.slice(at).trimStart();
        set("content", [before, `![](${url})`, after].filter(Boolean).join("\n\n"));
      }
      toast("success", kind === "cover" ? "Kapak yüklendi." : "Resim metne eklendi.");
    } catch (err) {
      toast("error", (err as Error).message);
    } finally {
      setUploading("");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const input = { ...v, title: v.title.trim(), slug: v.slug.trim() };
    if (!input.title) return setError("Bir başlık yaz.");
    if (!SLUG_RE.test(input.slug)) return setError("Bağlantı adı sadece küçük harf, rakam ve tire içerebilir.");
    setError("");
    setSaving(true);
    try {
      const post = initial ? await updatePost(initial.id, input) : await createPost(input, me.id);
      const next = pick(post);
      setSaved(next);
      setV(next);
      toast("success", post.status === "published" ? "Kaydedildi, yazı yayında." : "Taslak kaydedildi.");
      if (!initial) { leaving.current = true; navigate(`/panel/yazi/${post.id}`, { replace: true }); }
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === "23505" ? "Bu bağlantı adı başka bir yazıda kullanılıyor. Farklı bir tane yaz." : "Kaydedilemedi: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    if (!armed) return setArmed(true);
    setDeleting(true);
    try {
      await deletePost(initial.id);
      leaving.current = true;
      toast("success", "Yazı silindi.");
      navigate("/panel", { replace: true });
    } catch (err) {
      toast("error", "Silinemedi: " + (err as Error).message);
      setDeleting(false);
      setArmed(false);
    }
  }

  const publicUrl = `${location.origin}/yazi/${v.slug || "…"}`;

  return (
    <form className="editor" onSubmit={submit} noValidate>
      <div className="panel-head">
        <h1>{initial ? "Yazıyı düzenle" : "Yeni yazı"}</h1>
        <div className="row-actions">
          {initial && saved.status === "published" && <a className="btn" href={`/yazi/${saved.slug}`} target="_blank" rel="noreferrer">Sitede gör</a>}
          <Link to="/panel" className="btn">Yazılara dön</Link>
        </div>
      </div>
      {initial && initial.author_id !== me.id && initial.author && <p className="muted">{initial.author.name} adına düzenliyorsun.</p>}

      <label className="field">
        <span>Başlık</span>
        <input className="input-title" value={v.title} maxLength={200} required
          onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
      </label>

      <label className="field">
        <span>Bağlantı adı</span>
        <input value={v.slug} maxLength={80} required aria-describedby="slug-help"
          onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} />
        <small id="slug-help" className="help">{publicUrl}</small>
      </label>

      <div className="field">
        <span>Kapak resmi</span>
        <div className="cover-picker">
          {v.cover ? <img src={v.cover} alt="Kapak önizlemesi" /> : <div className="cover-none">Kapak yok</div>}
          <div className="row-actions">
            <label className="btn">
              {uploading === "cover" ? "Yükleniyor…" : v.cover ? "Kapağı değiştir" : "Kapak seç"}
              <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={!!uploading} onChange={(e) => onUpload(e, "cover")} />
            </label>
            {v.cover && <button type="button" className="linkish" onClick={() => set("cover", "")}>Kapağı kaldır</button>}
          </div>
        </div>
      </div>

      <div className="field">
        <div className="editor-bar">
          <div className="segmented" role="tablist" aria-label="Metin">
            <button type="button" role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")}>Yaz</button>
            <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>Önizle</button>
          </div>
          <label className="btn btn-small">
            {uploading === "inline" ? "Yükleniyor…" : "Resim ekle"}
            <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={!!uploading} onChange={(e) => onUpload(e, "inline")} />
          </label>
        </div>
        {tab === "write"
          ? <textarea ref={textarea} aria-label="Metin" className="input-body" value={v.content} onChange={(e) => set("content", e.target.value)}
              placeholder="Yazmaya başla. Paragraflar arasında boş satır bırak. **kalın**, *eğik*, ## ara başlık, [bağlantı](https://...) kullanabilirsin." />
          : <div className="prose preview">{v.content.trim()
              ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(v.content) }} />
              : <p className="muted">Önizlenecek bir şey yok. Önce biraz yaz.</p>}</div>}
      </div>

      <fieldset className="field status-pick">
        <legend>Durum</legend>
        <label><input type="radio" name="status" checked={v.status === "draft"} onChange={() => set("status", "draft")} /> <span><strong>Taslak</strong> Sadece sen ve adminler görür.</span></label>
        <label><input type="radio" name="status" checked={v.status === "published"} onChange={() => set("status", "published")} /> <span><strong>Yayında</strong> Herkes görür.</span></label>
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="editor-foot">
        <button className="btn btn-primary" disabled={saving || !!uploading}>
          {saving ? "Kaydediliyor…" : v.status === "published" && saved.status !== "published" ? "Kaydet ve yayınla" : "Kaydet"}
        </button>
        <span className="muted">{dirty ? "Kaydedilmemiş değişiklikler var" : initial ? "Tüm değişiklikler kaydedildi" : ""}</span>
        {initial && (
          <button type="button" className={`btn btn-danger ${armed ? "armed" : ""}`} onClick={remove} disabled={deleting}>
            {deleting ? "Siliniyor…" : armed ? "Eminim, sil" : "Yazıyı sil"}
          </button>
        )}
      </div>

      {blocker.state === "blocked" && (
        <div className="leave-bar" role="alertdialog" aria-label="Kaydedilmemiş değişiklikler">
          <p>Kaydedilmemiş değişikliklerin var. Çıkarsan kaybolacak.</p>
          <button type="button" className="btn" onClick={() => blocker.reset()}>Sayfada kal</button>
          <button type="button" className="btn btn-danger armed" onClick={() => blocker.proceed()}>Değişiklikleri at ve çık</button>
        </div>
      )}
    </form>
  );
}
