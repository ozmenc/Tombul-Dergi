import { useState, type FormEvent } from "react";
import { AdminOnly, PanelHead } from "./PanelLayout";
import { createCategory, deleteCategory, listCategories, renameCategory, type CategoryWithCount } from "../../lib/api/categories";
import { errorCode } from "../../lib/api/client";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { slugify } from "../../lib/format";
import { Icon } from "../../components/Icon";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/States";
import { useToast } from "../../components/Toast";

export default function Categories() {
  useTitle("Kategoriler");
  return <AdminOnly><CategoryManager /></AdminOnly>;
}

function CategoryManager() {
  const toast = useToast();
  const [state, retry, setState] = useAsync(listCategories, []);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const replace = (fn: (l: CategoryWithCount[]) => CategoryWithCount[]) => setState((s) => (s.status === "success" ? { status: "success", data: fn(s.data) } : s));

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!slugify(name)) return setError("Bir kategori adı yaz.");
    setError("");
    setBusy(true);
    try {
      const c = await createCategory(name);
      replace((l) => [...l, { ...c, posts: 0 }].sort((a, b) => a.name.localeCompare(b.name, "tr")));
      setName("");
      toast("success", `"${c.name}" eklendi.`);
    } catch (err) {
      setError(errorCode(err) === "23505" ? "Bu adla bir kategori zaten var." : "Eklenemedi: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card panel-section">
      <PanelHead title="Kategoriler" />
      <form className="inline-form" onSubmit={add} noValidate>
        <label className="sr-only" htmlFor="cat-name">Yeni kategori adı</label>
        <input id="cat-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Yeni kategori, ör. Spor" />
        <button className="btn btn-primary" disabled={busy}><Icon name="plus" /> {busy ? "Ekleniyor…" : "Ekle"}</button>
      </form>
      {error && <p className="form-error" role="alert" style={{ marginTop: 10 }}>{error}</p>}
      {state.status === "loading" && <ListSkeleton rows={4} />}
      {state.status === "error" && <ErrorState title="Kategoriler yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && (state.data.length === 0
        ? <EmptyState card={false} title="Henüz kategori yok">Yukarıdan ilk kategoriyi ekle.</EmptyState>
        : <ul className="rows">{state.data.map((c) => <CategoryRow key={c.id} c={c} onRenamed={(n) => replace((l) => l.map((x) => (x.id === c.id ? { ...x, name: n } : x)))} onDeleted={() => replace((l) => l.filter((x) => x.id !== c.id))} />)}</ul>)}
    </section>
  );
}

function CategoryRow({ c, onRenamed, onDeleted }: { c: CategoryWithCount; onRenamed: (name: string) => void; onDeleted: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [armed, setArmed] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === c.name) return setEditing(false);
    try { await renameCategory(c.id, name); onRenamed(name.trim()); setEditing(false); toast("success", "Kategori güncellendi."); }
    catch { toast("error", "Güncellenemedi. Tekrar dene."); }
  }
  async function remove() {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    try { await deleteCategory(c.id); onDeleted(); toast("success", `"${c.name}" silindi. Yazıları kategorisiz kaldı.`); }
    catch { toast("error", "Silinemedi. Tekrar dene."); }
  }

  return (
    <li className="row">
      {editing ? (
        <form className="inline-form" onSubmit={save} style={{ flex: 1 }}>
          <label className="sr-only" htmlFor={`cat-${c.id}`}>Kategori adı</label>
          <input id={`cat-${c.id}`} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
          <button className="btn btn-sm btn-primary">Kaydet</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setName(c.name); setEditing(false); }}>Vazgeç</button>
        </form>
      ) : (
        <>
          <span className="row-main"><strong>{c.name}</strong><small>/{c.slug} · {c.posts} yazı</small></span>
          <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>Yeniden adlandır</button>
          <button type="button" className={`btn btn-sm ${armed ? "btn-danger" : "btn-ghost"}`} onClick={remove}><Icon name="trash" /> {armed ? "Eminim" : "Sil"}</button>
        </>
      )}
    </li>
  );
}
