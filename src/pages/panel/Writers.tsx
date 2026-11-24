import { useState, type FormEvent } from "react";
import { usePanel } from "./PanelLayout";
import { createAuthor, listProfiles, setRole } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { fmtDate } from "../../lib/format";
import type { Role } from "../../lib/types";
import { Avatar } from "../../components/Avatar";
import { useToast } from "../../components/Toast";
import { EmptyState, ErrorState, PostListSkeleton } from "../../components/States";

const ROLES: [Role, string][] = [["author", "Yazar"], ["admin", "Admin"], ["pending", "Durduruldu"]];

export default function Writers() {
  const { me } = usePanel();
  useTitle("Yazarlar");
  if (me.role !== "admin")
    return <EmptyState title="Bu sayfa adminler için">Yazar eklemek ya da rolleri değiştirmek için admin olman gerekiyor.</EmptyState>;
  return <WritersAdmin myId={me.id} />;
}

function WritersAdmin({ myId }: { myId: string }) {
  const toast = useToast();
  const [state, retry, setState] = useAsync(listProfiles, []);
  const [busyId, setBusyId] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [password, setPassword] = useState("");

  async function changeRole(id: string, role: Role) {
    if (state.status !== "success") return;
    const before = state.data;
    setBusyId(id);
    setState({ status: "success", data: before.map((p) => (p.id === id ? { ...p, role } : p)) });
    try {
      await setRole(id, role);
      toast("success", "Rol güncellendi.");
    } catch (err) {
      setState({ status: "success", data: before }); // geri al
      toast("error", "Rol değiştirilemedi: " + (err as Error).message);
    } finally {
      setBusyId("");
    }
  }

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const body = { name: String(f.get("name")).trim(), email: String(f.get("email")).trim(), password };
    if (!body.name) return setFormError("Yazarın adını yaz.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return setFormError("Geçerli bir e-posta yaz.");
    if (body.password.length < 8) return setFormError("Şifre en az 8 karakter olmalı.");
    setFormError("");
    setAdding(true);
    try {
      await createAuthor(body);
      toast("success", `${body.name} yazar olarak eklendi. E-postayı ve şifreyi kendisine ilet.`);
      form.reset();
      setPassword("");
      retry();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  const generate = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    setPassword(Array.from(crypto.getRandomValues(new Uint32Array(14)), (n) => chars[n % chars.length]).join(""));
  };

  return (
    <>
      <div className="panel-head"><h1>Yazarlar</h1></div>
      <p className="muted">Yazarlar kendi yazılarını yazar ve düzenler. Adminler her şeyi yönetir. "Durduruldu" yapılan hesap giriş yapabilir ama yazamaz.</p>

      {state.status === "loading" && <PostListSkeleton rows={2} />}
      {state.status === "error" && <ErrorState title="Yazarlar yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && (
        <ul className="panel-list">
          {state.data.map((p) => (
            <li key={p.id} className="writer">
              <Avatar id={p.id} name={p.name} />
              <span className="writer-text"><strong>{p.name || "İsimsiz"}{p.id === myId && " (sen)"}</strong><small>katıldı {fmtDate(p.created_at)}</small></span>
              <label className="sr-only" htmlFor={`role-${p.id}`}>{p.name} rolü</label>
              <select id={`role-${p.id}`} value={p.role} disabled={p.id === myId || busyId === p.id}
                title={p.id === myId ? "Kendi rolünü değiştiremezsin" : undefined}
                onChange={(e) => changeRole(p.id, e.target.value as Role)}>
                {ROLES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}

      <form className="card-form" onSubmit={add} noValidate>
        <h2>Yazar ekle</h2>
        <p className="muted">Hesap hemen açılır. Şifreyi yazara sen ilet; Profilim sayfasından değiştirebilir.</p>
        <div className="grid-2">
          <label className="field"><span>Ad</span><input name="name" maxLength={80} required /></label>
          <label className="field"><span>E-posta</span><input name="email" type="email" required /></label>
        </div>
        <label className="field">
          <span>Geçici şifre</span>
          <div className="input-row">
            <input value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="off" />
            <button type="button" className="btn" onClick={generate}>Şifre üret</button>
          </div>
        </label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button className="btn btn-primary" disabled={adding}>{adding ? "Ekleniyor…" : "Yazar ekle"}</button>
      </form>
    </>
  );
}
