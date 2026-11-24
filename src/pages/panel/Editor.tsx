import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router";
import { usePanel } from "./PanelLayout";
import { createPost, deletePost, getPost, updatePost, type PostInput } from "../../lib/api/posts";
import { listCategories } from "../../lib/api/categories";
import { uploadImage } from "../../lib/api/storage";
import { errorCode } from "../../lib/api/client";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { SLUG_RE, fmtRelative, normalizeTag, parseTags, plainText, readingMinutes, slugify } from "../../lib/format";
import { IMAGE_SIZES, renderMarkdown, type ImageSize } from "../../lib/markdown";
import { continueList, insertBlock, link, pasteLink, toggleBlock, wrap, type Edit } from "../../lib/mdEdit";
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

const MOD = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl+";
type Tool = { label: string; glyph: ReactNode; keys?: string; edit: (v: string, s: number, e: number) => Edit };
const TOOLS: Tool[] = [
  { label: "Kalın", glyph: <b>B</b>, keys: "B", edit: (v, s, e) => wrap(v, s, e, "**", "kalın metin") },
  { label: "Eğik", glyph: <i style={{ fontFamily: "var(--read)" }}>I</i>, keys: "I", edit: (v, s, e) => wrap(v, s, e, "*", "eğik metin") },
  { label: "Ara başlık", glyph: "H", edit: (v, s, e) => toggleBlock(v, s, e, "h") },
  { label: "Alıntı", glyph: "❝", edit: (v, s, e) => toggleBlock(v, s, e, "quote") },
  { label: "Madde listesi", glyph: "•≡", edit: (v, s, e) => toggleBlock(v, s, e, "ul") },
  { label: "Numaralı liste", glyph: "1.", edit: (v, s, e) => toggleBlock(v, s, e, "ol") },
  { label: "Bağlantı", glyph: <Icon name="link" />, keys: "K", edit: link },
  { label: "Ayraç çizgisi", glyph: "—", edit: (v, s, e) => insertBlock(v, s, e, "---") },
];
const SHORTCUT = Object.fromEntries(TOOLS.filter((t) => t.keys).map((t) => [t.keys!.toLowerCase(), t.edit]));

const imageFiles = (list: FileList | null | undefined) => [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
const imageMarkdown = (url: string, size: ImageSize) => (size === "geniş" ? `![](${url})` : `![](${url} "${size}")`);
const pendingToken = (id: string) => `![Resim yükleniyor… ${id}]()`;

type Backup = { v: PostInput; at: string };
function readBackup(key: string, current: PostInput): Backup | null {
  try {
    const b = JSON.parse(localStorage.getItem(key) ?? "null") as Backup | null;
    if (!b?.v || typeof b.v.content !== "string") return null;
    const v = { ...EMPTY, ...b.v };
    return JSON.stringify(v) === JSON.stringify(current) ? null : { v, at: b.at };
  } catch { return null; }
}
const dropBackup = (key: string) => { try { localStorage.removeItem(key); } catch { /* depolama kapalı */ } };

function Form({ initial, categories }: { initial: Post | null; categories: Category[] }) {
  const { me } = usePanel();
  const toast = useToast();
  const navigate = useNavigate();
  const isAdmin = me.role === "admin";
  const backupKey = `tombul:yedek:${initial?.id ?? "yeni"}`;

  const [saved, setSaved] = useState<PostInput>(pick(initial));
  const [v, setV] = useState<PostInput>(saved);
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [tagDraft, setTagDraft] = useState("");
  const [imgSize, setImgSize] = useState<ImageSize>("geniş");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [focus, setFocus] = useState(false);
  const [dropping, setDropping] = useState<"" | "body" | "cover">("");
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState(0); // metne eklenmekte olan resimler
  const [coverUploading, setCoverUploading] = useState(false);
  const [backup, setBackup] = useState(() => readBackup(backupKey, saved));
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const leaving = useRef(false);

  const busy = saving || coverUploading || uploads > 0;
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

  // Tarayıcıya yerel yedek: sekme kapanır ya da elektrik giderse yazı kaybolmasın.
  // Eski bir yedek geri yükleme sorusunu beklerken üzerine yazılmaz.
  useEffect(() => {
    if (!dirty || backup) return;
    const t = setTimeout(() => { try { localStorage.setItem(backupKey, JSON.stringify({ v, at: new Date().toISOString() })); } catch { /* depolama dolu/kapalı */ } }, 800);
    return () => clearTimeout(t);
  }, [v, dirty, backup, backupKey]);

  // ⌘/Ctrl+S kaydeder, Esc odak modundan çıkar.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); formRef.current?.requestSubmit(); }
      else if (e.key === "Escape") setFocus(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // Metin kutusu içeriğe göre uzar; sayfa kayması olmasın diye kaydırma yeri korunur.
  useLayoutEffect(() => {
    const ta = textarea.current;
    if (!ta) return;
    const box = ta.closest(".editor-main"), y = scrollY, boxY = box?.scrollTop ?? 0;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
    scrollTo(scrollX, y);
    if (box) box.scrollTop = boxY;
  }, [v.content, tab, focus]);

  const set = <K extends keyof PostInput>(k: K, val: PostInput[K]) => setV((x) => ({ ...x, [k]: val }));

  /** Değişikliği tarayıcının kendi yazma komutuyla uygular; böylece ⌘Z geri alma çalışmaya devam eder. */
  function apply(edit: Edit | null) {
    const ta = textarea.current;
    if (!ta || !edit || (edit.from === edit.to && !edit.text)) return;
    ta.focus();
    ta.setSelectionRange(edit.from, edit.to);
    const ok = edit.text ? document.execCommand("insertText", false, edit.text) : document.execCommand("delete");
    if (!ok) { ta.setRangeText(edit.text, edit.from, edit.to); set("content", ta.value); }
    ta.setSelectionRange(...edit.sel);
  }
  const run = (tool: (v: string, s: number, e: number) => Edit | null) => {
    const ta = textarea.current;
    if (ta) apply(tool(ta.value, ta.selectionStart, ta.selectionEnd));
  };

  function addTags(input: string) {
    set("tags", parseTags([...v.tags, input].join(",")));
    setTagDraft("");
  }
  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (normalizeTag(tagDraft)) addTags(tagDraft); }
    else if (e.key === "Backspace" && !tagDraft && v.tags.length) set("tags", v.tags.slice(0, -1));
  }

  /** Resimleri imlecin olduğu yere "yükleniyor" yer tutucusuyla ekler; her biri yüklenince gerçek adresiyle değişir. */
  function insertImages(files: File[]) {
    if (!files.length) return;
    if (tab !== "write") setTab("write");
    const ids = files.map(() => Math.random().toString(36).slice(2, 8));
    const size = imgSize;
    requestAnimationFrame(() => run((val, s, e) => insertBlock(val, s, e, ids.map(pendingToken).join("\n\n"))));
    setUploads((n) => n + files.length);
    const swap = (id: string, md: string) =>
      setV((x) => ({ ...x, content: md ? x.content.replace(pendingToken(id), md) : x.content.replace(pendingToken(id), "").replace(/\n{3,}/g, "\n\n") }));
    files.forEach(async (file, i) => {
      try { swap(ids[i], imageMarkdown(await uploadImage(file, me.id), size)); }
      catch (err) { swap(ids[i], ""); toast("error", (err as Error).message); }
      finally { setUploads((n) => n - 1); }
    });
  }

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    setCoverUploading(true);
    try { set("cover", await uploadImage(file, me.id)); toast("success", "Kapak yüklendi."); }
    catch (err) { toast("error", (err as Error).message); }
    finally { setCoverUploading(false); }
  }

  function onBodyKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const tool = SHORTCUT[e.key.toLowerCase()];
      if (tool) { e.preventDefault(); apply(tool(ta.value, ta.selectionStart, ta.selectionEnd)); }
    } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      const edit = continueList(ta.value, ta.selectionStart, ta.selectionEnd);
      if (edit) { e.preventDefault(); apply(edit); }
    }
  }

  function onBodyPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const cd = e.clipboardData;
    const files = imageFiles(cd.files);
    // Word/Pages metin kopyalarken yanına resim de koyar; o durumda metni yapıştır.
    if (files.length && !cd.types.includes("text/rtf")) { e.preventDefault(); insertImages(files); return; }
    const ta = e.currentTarget;
    const edit = pasteLink(ta.value, ta.selectionStart, ta.selectionEnd, cd.getData("text/plain"));
    if (edit) { e.preventDefault(); apply(edit); }
  }

  const dragProps = (zone: "body" | "cover", onFiles: (files: File[]) => void) => ({
    onDragOver: (e: DragEvent) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDropping(zone); } },
    onDragLeave: () => setDropping(""),
    onDrop: (e: DragEvent) => {
      setDropping("");
      if (!e.dataTransfer.types.includes("Files")) return; // sürüklenen metin normal davransın
      e.preventDefault(); // resim olmayan dosya bırakılınca tarayıcı sayfadan çıkıp onu açmasın
      const files = imageFiles(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
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
      dropBackup(backupKey);
      setBackup(null);
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
      dropBackup(backupKey);
      toast("success", "Yazı silindi.");
      navigate("/panel/yazilar", { replace: true });
    } catch (err) {
      toast("error", "Silinemedi: " + (err as Error).message);
      setDeleting(false);
      setArmed(false);
    }
  }

  const words = plainText(v.content).split(" ").filter(Boolean).length; // resim adresleri ve işaretler sayılmaz

  return (
    <form ref={formRef} className={`editor ${focus ? "focus" : ""}`} onSubmit={submit} noValidate>
      <div className="editor-main card">
        {backup && (
          <div className="editor-note" role="status">
            <p>Bu yazının bu tarayıcıda kaydedilmemiş bir yedeği var ({fmtRelative(backup.at)}).</p>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => { setV(backup.v); setSlugTouched(true); setBackup(null); }}>Geri yükle</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => { dropBackup(backupKey); setBackup(null); }}>Yok say</button>
          </div>
        )}
        <div className="editor-bar">
          <div className="segmented" role="tablist" aria-label="Metin">
            <button type="button" role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")}>Yaz</button>
            <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>Önizle</button>
          </div>
          {tab === "write" && (
            <div className="md-tools" role="toolbar" aria-label="Biçim">
              {TOOLS.map((t) => (
                <button key={t.label} type="button" className="md-tool" aria-label={t.label} title={t.keys ? `${t.label} (${MOD}${t.keys})` : t.label}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => run(t.edit)}>{t.glyph}</button>
              ))}
              <label className="md-tool" title="Resim ekle (yapıştırabilir ya da sürükleyebilirsin)">
                <Icon name="image" /><span className="sr-only">Resim ekle</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { insertImages(imageFiles(e.target.files)); e.target.value = ""; }} />
              </label>
              <label className="sr-only" htmlFor="ed-img-size">Eklenecek resimlerin boyutu</label>
              <select id="ed-img-size" className="md-size" value={imgSize} onChange={(e) => setImgSize(e.target.value as ImageSize)}
                title='Eklenecek resimlerin boyutu. Eklenmiş bir resmi küçültmek için metinde ![](…) içindeki adresin sonuna "küçük" ya da "orta" yaz'>
                {(Object.keys(IMAGE_SIZES) as ImageSize[]).map((k) => <option key={k} value={k}>{k[0].toLocaleUpperCase("tr-TR") + k.slice(1)}</option>)}
              </select>
            </div>
          )}
          <button type="button" className="md-tool md-focus" aria-pressed={focus} onClick={() => setFocus((f) => !f)} title={focus ? "Odak modundan çık (Esc)" : "Odak modu: sadece yazı"}>
            <Icon name="expand" /><span className="sr-only">Odak modu</span>
          </button>
        </div>
        <label className="sr-only" htmlFor="ed-title">Başlık</label>
        <input id="ed-title" className="editor-title" value={v.title} maxLength={200} placeholder="Başlık"
          onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
        {tab === "write" ? (
          <>
            <label className="sr-only" htmlFor="ed-body">Metin</label>
            <textarea id="ed-body" ref={textarea} className={`editor-body ${dropping === "body" ? "dropping" : ""}`} value={v.content}
              onChange={(e) => set("content", e.target.value)} onKeyDown={onBodyKey} onPaste={onBodyPaste} {...dragProps("body", insertImages)}
              placeholder="Yazmaya başla. Resimleri doğrudan yapıştırabilir ya da buraya sürükleyebilirsin; yüklemeden önce otomatik küçültülür." />
          </>
        ) : (
          <div className="prose editor-preview">{v.content.trim()
            ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(v.content) }} />
            : <p className="muted">Önizlenecek bir şey yok. Önce biraz yaz.</p>}</div>
        )}
        <p className="help editor-status">
          <span>{words ? `${words} kelime · ${readingMinutes(v.content)} dk okuma` : "Henüz boş"}</span>
          {uploads > 0 && <span className="badge badge-amber">{uploads} resim yükleniyor…</span>}
          <span className="editor-keys">{MOD}B kalın · {MOD}I eğik · {MOD}K bağlantı · {MOD}S kaydet</span>
        </p>
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
          <textarea rows={3} value={v.excerpt} maxLength={300} onChange={(e) => set("excerpt", e.target.value)} placeholder="Listelerde başlığın altında görünür. Boş bırakırsan metnin başı kullanılır." />
          <small className="help">{300 - v.excerpt.length} karakter kaldı</small>
        </label>

        <div className="field">
          <span>Kapak</span>
          <div className={`cover-picker ${dropping === "cover" ? "dropping" : ""}`} {...dragProps("cover", (f) => uploadCover(f[0]))}>
            {v.cover ? <img src={v.cover} alt="Kapak önizlemesi" /> : <div className="cover-none"><Icon name="image" /></div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
              <label className="btn btn-sm">
                {coverUploading ? "Yükleniyor…" : v.cover ? "Değiştir" : "Kapak seç"}
                <input type="file" accept="image/*" className="sr-only" disabled={coverUploading} onChange={(e) => { uploadCover(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {v.cover ? <button type="button" className="linkish" onClick={() => set("cover", "")}>Kaldır</button> : <small className="help">ya da buraya sürükle</small>}
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
            <span><strong>Öne çıkar</strong><span>Ana sayfada manşette görünür.</span></span>
          </label>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="editor-actions">
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {saving ? "Kaydediliyor…" : uploads > 0 ? "Resimler yükleniyor…" : v.status === "published" && saved.status !== "published" ? "Kaydet ve yayınla" : "Kaydet"}
          </button>
          <p className="content-notice">Yayınlayarak yazının içeriğinden (metin, görsel, alıntı) hukuken yalnızca senin sorumlu olduğunu ve <Link to="/kosullar">kullanım koşullarını</Link> kabul edersin.</p>
          <span className="help" style={{ textAlign: "center" }}>{dirty ? "Kaydedilmemiş değişiklikler var (bu tarayıcıda yedeklendi)" : initial ? "Tüm değişiklikler kaydedildi" : ""}</span>
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
          <button type="button" className="btn btn-danger" onClick={() => { dropBackup(backupKey); blocker.proceed(); }}>Değişiklikleri at ve çık</button>
        </div>
      )}
    </form>
  );
}
