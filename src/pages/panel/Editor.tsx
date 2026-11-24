import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router";
import { usePanel } from "./PanelLayout";
import { createPost, deletePost, getPost, updatePost, type PostInput } from "../../lib/api/posts";
import { listCategories } from "../../lib/api/categories";
import { IMAGE_TYPES, uploadImage } from "../../lib/api/storage";
import { errorCode } from "../../lib/api/client";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { SLUG_RE, normalizeTag, parseTags, readingMinutes, slugify } from "../../lib/format";
import { IMAGE_SIZES, renderMarkdown, type ImageSize } from "../../lib/markdown";
import type { Category, Post } from "../../lib/types";
import { Icon } from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/States";

const EMPTY: PostInput = { title: "", slug: "", content: "", excerpt: "", cover: "", status: "draft", category_id: null, tags: [], featured: false };

export default function Editor() {
  const { id } = useParams();
  const [post, retry] = useAsync(() => (id ? getPost(id) : Promise.resolve(null)), [id]);
  const [cats, retryCats] = useAsync(listCategories, []);
  useTitle(id ? "Yazıyı düzenle" : "Yeni yazı");

  if (post.status === "loading" || cats.status === "loading") return <ListSkeleton rows={5} />;
  if (post.status === "error") return <ErrorState title="Yazı yüklenemedi" error={post.error} onRetry={retry} />;
  if (cats.status === "error") return <ErrorState title="Kategoriler yüklenemedi" error={cats.error} onRetry={retryCats} />;
  if (id && !post.data)
    return <EmptyState title="Yazı bulunamadı" action={<Link to="/panel/yazilar" className="btn">Yazılara dön</Link>}>Silinmiş olabilir ya da bu yazıyı düzenleme yetkin yok.</EmptyState>;
  // key: başka bir yazıya geçince form sıfırlansın
  return <Form key={id ?? "new"} initial={post.data} categories={cats.data} />;
}

const pick = (p: Post | null): PostInput =>
  p ? { title: p.title, slug: p.slug, content: p.content, excerpt: p.excerpt, cover: p.cover, status: p.status, category_id: p.category_id, tags: p.tags, featured: p.featured } : EMPTY;

function Form({ initial, categories }: { initial: Post | null; categories: Category[] }) {
  const { me } = usePanel();
  const toast = useToast();
  const navigate = useNavigate();
  const isAdmin = me.role === "admin";

  const [saved, setSaved] = useState<PostInput>(pick(initial));
  const [v, setV] = useState<PostInput>(saved);
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [tagDraft, setTagDraft] = useState("");
  const [imgSize, setImgSize] = useState<ImageSize>("geniş");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"" | "cover" | "inline">("");
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const leaving = useRef(false);

  const dirty = JSON.stringify(v) !== JSON.stringify(saved) || tagDraft.trim() !== "";
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

  function addTags(input: string) {
    set("tags", parseTags([...v.tags, input].join(",")));
    setTagDraft("");
  }
  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (normalizeTag(tagDraft)) addTags(tagDraft); }
    else if (e.key === "Backspace" && !tagDraft && v.tags.length) set("tags", v.tags.slice(0, -1));
  }

  async function onUpload(e: ChangeEvent<HTMLInputElement>, kind: "cover" | "inline") {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadImage(file, me.id);
      if (kind === "cover") set("cover", url);
      else {
        const at = textarea.current?.selectionStart ?? v.content.length;
        const before = v.content.slice(0, at).trimEnd(), after = v.content.slice(at).trimStart();
        const image = imgSize === "geniş" ? `![](${url})` : `![](${url} "${imgSize}")`;
        set("content", [before, image, after].filter(Boolean).join("\n\n"));
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
    const tags = tagDraft.trim() ? parseTags([...v.tags, tagDraft].join(",")) : v.tags;
    const input: PostInput = { ...v, tags, title: v.title.trim(), slug: v.slug.trim(), excerpt: v.excerpt.trim(), featured: isAdmin ? v.featured : saved.featured };
    if (!input.title) return setError("Bir başlık yaz.");
    if (!SLUG_RE.test(input.slug)) return setError("Bağlantı adı sadece küçük harf, rakam ve tire içerebilir.");
    if (input.status === "published" && !input.content.trim()) return setError("Boş bir yazı yayınlanamaz. Önce biraz yaz.");
    setError("");
    setSaving(true);
    try {
      const post = initial ? await updatePost(initial.id, input) : await createPost(input, me.id);
      const next = pick(post);
      setSaved(next);
      setV(next);
      setTagDraft("");
      toast("success", post.status === "published" ? "Kaydedildi, yazı yayında." : "Taslak kaydedildi.");
      if (!initial) { leaving.current = true; navigate(`/panel/yazi/${post.id}`, { replace: true }); }
    } catch (err) {
      setError(errorCode(err) === "23505" ? "Bu bağlantı adı başka bir yazıda kullanılıyor. Farklı bir tane yaz." : "Kaydedilemedi: " + (err as Error).message);
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
      navigate("/panel/yazilar", { replace: true });
    } catch (err) {
      toast("error", "Silinemedi: " + (err as Error).message);
      setDeleting(false);
      setArmed(false);
    }
  }

  return (
    <form className="editor" onSubmit={submit} noValidate>
      <div className="editor-main card">
        <div className="editor-bar">
          <div className="segmented" role="tablist" aria-label="Metin">
            <button type="button" role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")}>Yaz</button>
            <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>Önizle</button>
          </div>
          <label className="btn btn-sm">
            <Icon name="image" />{uploading === "inline" ? "Yükleniyor…" : "Resim ekle"}
            <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={!!uploading} onChange={(e) => onUpload(e, "inline")} />
          </label>
          <label className="sr-only" htmlFor="ed-img-size">Eklenecek resmin boyutu</label>
          <select id="ed-img-size" className="input role-select" value={imgSize} onChange={(e) => setImgSize(e.target.value as ImageSize)}
            title='Eklenmiş bir resmin boyutunu değiştirmek için metinde ![](…) satırının sonuna "küçük" ya da "orta" yaz'>
            {(Object.keys(IMAGE_SIZES) as ImageSize[]).map((k) => <option key={k} value={k}>{k[0].toLocaleUpperCase("tr-TR") + k.slice(1)}</option>)}
          </select>
        </div>
        <label className="sr-only" htmlFor="ed-title">Başlık</label>
        <input id="ed-title" className="editor-title" value={v.title} maxLength={200} placeholder="Başlık"
          onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
        {tab === "write" ? (
          <>
            <label className="sr-only" htmlFor="ed-body">Metin</label>
            <textarea id="ed-body" ref={textarea} className="editor-body" value={v.content} onChange={(e) => set("content", e.target.value)}
              placeholder="Yazmaya başla. Paragraflar arasında boş satır bırak. **kalın**, *eğik*, ## ara başlık, > alıntı, [bağlantı](https://…)" />
          </>
        ) : (
          <div className="prose editor-preview">{v.content.trim()
            ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(v.content) }} />
            : <p className="muted">Önizlenecek bir şey yok. Önce biraz yaz.</p>}</div>
        )}
        <p className="help">{v.content.trim() ? `${v.content.trim().split(/\s+/).length} kelime · ${readingMinutes(v.content)} dk okuma` : "Henüz boş"}</p>
      </div>

      <aside className="editor-side card">
        <fieldset className="field status-pick">
          <legend>Durum</legend>
          <label><input type="radio" name="status" checked={v.status === "draft"} onChange={() => set("status", "draft")} /><span><strong>Taslak</strong>Sadece sen ve adminler görür</span></label>
          <label><input type="radio" name="status" checked={v.status === "published"} onChange={() => set("status", "published")} /><span><strong>Yayında</strong>Herkes görür</span></label>
        </fieldset>

        <label className="field">
          <span>Kategori</span>
          <select value={v.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
            <option value="">Kategorisiz</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <div className="field">
          <span id="tags-label">Etiketler</span>
          <div className="tag-input" onClick={() => document.getElementById("ed-tags")?.focus()}>
            {v.tags.map((t) => (
              <span key={t} className="chip">#{t}<button type="button" aria-label={`${t} etiketini kaldır`} onClick={() => set("tags", v.tags.filter((x) => x !== t))}><Icon name="close" /></button></span>
            ))}
            {v.tags.length < 8 && <input id="ed-tags" aria-labelledby="tags-label" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={onTagKey}
              onBlur={() => normalizeTag(tagDraft) && addTags(tagDraft)} placeholder={v.tags.length ? "" : "şehir, gece…"} />}
          </div>
          <small className="help">Enter ya da virgülle ekle. En fazla 8.</small>
        </div>

        <label className="field">
          <span>Kısa özet</span>
          <textarea rows={3} value={v.excerpt} maxLength={300} onChange={(e) => set("excerpt", e.target.value)} placeholder="Akışta başlığın altında görünür. Boş bırakırsan metnin başı kullanılır." />
          <small className="help">{300 - v.excerpt.length} karakter kaldı</small>
        </label>

        <div className="field">
          <span>Kapak</span>
          <div className="cover-picker">
            {v.cover ? <img src={v.cover} alt="Kapak önizlemesi" /> : <div className="cover-none"><Icon name="image" /></div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
              <label className="btn btn-sm">
                {uploading === "cover" ? "Yükleniyor…" : v.cover ? "Değiştir" : "Kapak seç"}
                <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={!!uploading} onChange={(e) => onUpload(e, "cover")} />
              </label>
              {v.cover && <button type="button" className="linkish" onClick={() => set("cover", "")}>Kaldır</button>}
            </div>
          </div>
        </div>

        <label className="field">
          <span>Bağlantı adı</span>
          <input value={v.slug} maxLength={80} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} />
          <small className="help">{location.origin}/yazi/{v.slug || "…"}</small>
        </label>

        {isAdmin && (
          <label className="check">
            <input type="checkbox" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} />
            <span><strong>Öne çıkar</strong><span>Akışta en üstte, yıldızla görünür.</span></span>
          </label>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="editor-actions">
          <button className="btn btn-primary btn-block btn-lg" disabled={saving || !!uploading}>
            {saving ? "Kaydediliyor…" : v.status === "published" && saved.status !== "published" ? "Kaydet ve yayınla" : "Kaydet"}
          </button>
          <span className="help" style={{ textAlign: "center" }}>{dirty ? "Kaydedilmemiş değişiklikler var" : initial ? "Tüm değişiklikler kaydedildi" : ""}</span>
          {initial && saved.status === "published" && <Link className="btn btn-block" to={`/yazi/${saved.slug}`} target="_blank"><Icon name="eye" /> Sitede gör</Link>}
          {initial && (
            <button type="button" className={`btn btn-block ${armed ? "btn-danger" : "btn-ghost"}`} onClick={remove} disabled={deleting}>
              <Icon name="trash" /> {deleting ? "Siliniyor…" : armed ? "Eminim, sil" : "Yazıyı sil"}
            </button>
          )}
        </div>
      </aside>

      {blocker.state === "blocked" && (
        <div className="leave-bar" role="alertdialog" aria-label="Kaydedilmemiş değişiklikler">
          <p>Kaydedilmemiş değişikliklerin var. Çıkarsan kaybolacak.</p>
          <button type="button" className="btn" onClick={() => blocker.reset()}>Sayfada kal</button>
          <button type="button" className="btn btn-danger" onClick={() => blocker.proceed()}>Değişiklikleri at ve çık</button>
        </div>
      )}
    </form>
  );
}
