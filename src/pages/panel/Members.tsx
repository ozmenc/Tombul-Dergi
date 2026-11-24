import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { AdminOnly, PanelHead, usePanel } from "./PanelLayout";
import { createAuthor, listMemberEmails, listMembers, resetPassword, setApproved, setRole } from "../../lib/api/people";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { EMAIL_RE, fmtRelative } from "../../lib/format";
import { canWrite, ROLE_LABEL, type Profile, type Role } from "../../lib/types";
import { Avatar } from "../../components/Avatar";
import { Icon } from "../../components/Icon";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/States";
import { useToast } from "../../components/Toast";

export default function Members() {
  useTitle("Üyeler");
  return <AdminOnly><MemberManager /></AdminOnly>;
}

const TABS = [["onay", "Onay bekleyenler"], ["basvuru", "Yazarlık başvuruları"], ["hepsi", "Tüm üyeler"]] as const;
type Tab = (typeof TABS)[number][0];

const EMPTY: Record<Tab, [string, string]> = {
  onay: ["Onay bekleyen hesap yok", "Yeni kayıtlar burada görünür; onaylayınca yorum yazabilirler."],
  basvuru: ["Bekleyen başvuru yok", "Yeni yazarlık başvuruları burada görünür."],
  hepsi: ["Eşleşen üye yok", "Başka bir isim dene."],
};

function MemberManager() {
  const { me } = usePanel();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find(([k]) => k === params.get("sekme"))?.[0] ?? "hepsi";
  const [q, setQ] = useState("");
  const [state, retry, setState] = useAsync(async () => {
    const [members, emails] = await Promise.all([listMembers(), listMemberEmails()]);
    return members.map((m) => ({ ...m, email: emails.get(m.id) ?? "" }));
  }, []);
  const [busyId, setBusyId] = useState("");

  const list = state.status === "success" ? state.data : [];
  const byTab = useMemo(() => ({
    onay: list.filter((m) => !m.approved),
    basvuru: list.filter((m) => m.role === "pending"),
    hepsi: list,
  }), [list]);
  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr-TR");
    return byTab[tab].filter((m) => !term || m.name.toLocaleLowerCase("tr-TR").includes(term) || m.email.toLowerCase().includes(term));
  }, [byTab, tab, q]);

  /** İyimser güncelleme; hata olursa eski listeye döner. */
  async function update(m: Profile, patch: Partial<Profile>, save: () => Promise<void>, done: string) {
    if (state.status !== "success") return;
    const before = state.data;
    setBusyId(m.id);
    setState({ status: "success", data: before.map((x) => (x.id === m.id ? { ...x, ...patch } : x)) });
    try { await save(); toast("success", done); }
    catch (err) { setState({ status: "success", data: before }); toast("error", "Güncellenemedi: " + (err as Error).message); }
    finally { setBusyId(""); }
  }
  // Yazar ve admin her zaman onaylıdır (veritabanı da böyle yapar).
  const change = (m: Profile, role: Role, done: string) =>
    update(m, canWrite(role) ? { role, approved: true } : { role }, () => setRole(m.id, role), done);
  const approve = (m: Profile, approved: boolean) =>
    update(m, { approved }, () => setApproved(m.id, approved), approved ? `${m.name || "Üye"} artık yorum yazabilir.` : "Onay kaldırıldı; yorum yazamaz.");

  return (
    <>
      <section className="card panel-section">
        <PanelHead title="Üyeler" />
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Üye listesi">
            {TABS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={tab === k} onClick={() => setParams(k === "hepsi" ? {} : { sekme: k }, { replace: true })}>
                {label} <span>{byTab[k].length}</span>
              </button>
            ))}
          </div>
          <label className="search-mini"><Icon name="search" /><span className="sr-only">İsim ya da e-postada ara</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsim ya da e-posta" /></label>
        </div>
        {state.status === "loading" && <ListSkeleton rows={4} />}
        {state.status === "error" && <ErrorState title="Üyeler yüklenemedi" error={state.error} onRetry={retry} />}
        {state.status === "success" && (shown.length === 0
          ? <EmptyState card={false} title={EMPTY[tab][0]}>{EMPTY[tab][1]}</EmptyState>
          : (
            <ul className="rows">
              {shown.map((m) => (
                <li key={m.id} className="row">
                  <Avatar person={m} size={40} />
                  <span className="row-main"><strong>{m.name || "İsimsiz"}{m.id === me.id && " (sen)"} {!m.approved && <span className="badge badge-amber">onay bekliyor</span>}</strong><small>{m.email && <a href={`mailto:${m.email}`}>{m.email}</a>}{m.email && " · "}{fmtRelative(m.created_at)} katıldı</small></span>
                  {m.role === "pending" ? (
                    <>
                      <button type="button" className="btn btn-sm btn-primary" disabled={busyId === m.id} onClick={() => change(m, "author", `${m.name} artık yazar.`)}><Icon name="pen" /> Yazar yap</button>
                      <button type="button" className="btn btn-sm btn-ghost" disabled={busyId === m.id} onClick={() => change(m, "reader", "Yazarlık başvurusu reddedildi; okur olarak devam ediyor.")}>Başvuruyu reddet</button>
                    </>
                  ) : (
                    <>
                      <label className="sr-only" htmlFor={`role-${m.id}`}>{m.name} rolü</label>
                      <select id={`role-${m.id}`} className="input role-select" value={m.role} disabled={m.id === me.id || busyId === m.id}
                        title={m.id === me.id ? "Kendi rolünü değiştiremezsin" : undefined}
                        onChange={(e) => change(m, e.target.value as Role, "Rol güncellendi.")}>
                        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    </>
                  )}
                  {!canWrite(m.role) && (m.approved
                    ? <button type="button" className="btn btn-sm btn-ghost" disabled={busyId === m.id} onClick={() => approve(m, false)}>Onayı kaldır</button>
                    : <button type="button" className="btn btn-sm btn-primary" disabled={busyId === m.id} onClick={() => approve(m, true)}><Icon name="check" /> Hesabı onayla</button>)}
                  {m.id !== me.id && <PasswordReset member={m} />}
                </li>
              ))}
            </ul>
          ))}
      </section>
      <AddAuthor onAdded={retry} />
    </>
  );
}

/** Üyeye yeni geçici şifre üretir ve bir kez gösterir (e-postayla sıfırlama yok). */
function PasswordReset({ member }: { member: Profile }) {
  const toast = useToast();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");

  async function reset() {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    setBusy(true);
    try { setPassword(await resetPassword(member.id)); setArmed(false); }
    catch (err) { toast("error", (err as Error).message); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(password); toast("success", "Şifre kopyalandı."); }
    catch { toast("error", "Kopyalanamadı; şifreyi elle seç."); }
  }

  if (password)
    return (
      <span className="new-password" role="status">
        <span>Yeni şifre: <code>{password}</code></span>
        <button type="button" className="btn btn-sm" onClick={copy}><Icon name="link" /> Kopyala</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPassword("")} aria-label="Gizle"><Icon name="close" /></button>
      </span>
    );
  return (
    <button type="button" className={`btn btn-sm ${armed ? "btn-danger" : "btn-ghost"}`} onClick={reset} disabled={busy}>
      {busy ? "Sıfırlanıyor…" : armed ? "Eminim, sıfırla" : "Şifre sıfırla"}
    </button>
  );
}

function AddAuthor({ onAdded }: { onAdded: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    setF((x) => ({ ...x, password: Array.from(crypto.getRandomValues(new Uint32Array(14)), (n) => chars[n % chars.length]).join("") }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError("Yazarın adını yaz.");
    if (!EMAIL_RE.test(f.email.trim())) return setError("Geçerli bir e-posta yaz.");
    if (f.password.length < 8) return setError("Şifre en az 8 karakter olmalı.");
    setError("");
    setBusy(true);
    try {
      await createAuthor({ name: f.name.trim(), email: f.email.trim(), password: f.password });
      toast("success", `${f.name.trim()} yazar olarak eklendi. E-postayı ve şifreyi kendisine ilet.`);
      setF({ name: "", email: "", password: "" });
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card panel-section" onSubmit={submit} noValidate>
      <PanelHead title="Yazar ekle" />
      <p className="muted" style={{ marginBottom: 16 }}>Hesap hemen açılır. Geçici şifreyi yazara sen ilet; Hesabım sayfasından değiştirebilir. Kullanım koşullarını da ilet: yazar, yazı yayınlayarak içerikten yalnızca kendisinin sorumlu olduğunu kabul eder.</p>
      <div className="grid-2">
        <label className="field"><span>Ad</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} /></label>
        <label className="field"><span>E-posta</span><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      </div>
      <label className="field">
        <span>Geçici şifre</span>
        <div className="inline-form">
          <input className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="off" />
          <button type="button" className="btn" onClick={generate}>Şifre üret</button>
        </div>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Ekleniyor…" : "Yazarı ekle"}</button>
    </form>
  );
}
