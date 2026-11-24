import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { updateProfile } from "../lib/api/people";
import { IMAGE_TYPES, uploadImage } from "../lib/api/storage";
import { supabase } from "../lib/supabase";
import { signOut, useAuth } from "../lib/auth";
import { fmtDate } from "../lib/format";
import { useTitle } from "../lib/useTitle";
import { canWrite, ROLE_LABEL, type Profile } from "../lib/types";
import { Avatar } from "../components/Avatar";
import { Bottle } from "../components/Bottle";
import { Icon } from "../components/Icon";
import { ErrorState, Spinner } from "../components/States";
import { useToast } from "../components/Toast";

export default function Account() {
  useTitle("Hesabım");
  const auth = useAuth();
  const { pathname } = useLocation();
  if (auth.status === "loading") return <Spinner />;
  if (auth.status === "error") return <ErrorState title="Hesabın yüklenemedi" onRetry={auth.retry} />;
  if (auth.status === "signed-out") return <Navigate to={`/giris?next=${encodeURIComponent(pathname)}`} replace />;
  return <AccountForms me={auth.profile} refresh={auth.refresh} />;
}

function AccountForms({ me, refresh }: { me: Profile; refresh: () => Promise<void> }) {
  const toast = useToast();
  const { hash } = useLocation();
  const [profile, setProfile] = useState({ name: me.name, bio: me.bio, avatar_url: me.avatar_url });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hash]);

  async function onAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, me.id);
      setProfile((p) => ({ ...p, avatar_url: url }));
      toast("success", "Fotoğraf yüklendi. Kaydetmeyi unutma.");
    }
    catch (err) { toast("error", (err as Error).message); }
    finally { setUploading(false); }
  }

  // Admin dışındakiler adını 30 günde bir değiştirebilir (supabase/005_members.sql).
  const unlock = me.name_changed_at ? new Date(Date.parse(me.name_changed_at) + 30 * 864e5) : null;
  const nameLockedUntil = me.role !== "admin" && unlock && unlock.getTime() > Date.now() ? unlock.toISOString() : null;

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile.name.trim()) return setError("Adını yaz.");
    setError("");
    setSaving(true);
    try { await updateProfile(me.id, { name: profile.name.trim(), bio: profile.bio.trim(), avatar_url: profile.avatar_url }); await refresh(); toast("success", "Profilin kaydedildi."); }
    catch (err) { setError("Kaydedilemedi: " + (err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <header className="profile-head card">
        <Avatar person={{ id: me.id, name: profile.name || me.name, avatar_url: profile.avatar_url }} size={96} ring />
        <div className="profile-text">
          <span className={`badge ${canWrite(me.role) ? "badge-blue" : "badge-amber"}`}>{ROLE_LABEL[me.role]}</span>
          <h1>{me.name || "Hesabım"}</h1>
          <p className="muted">{canWrite(me.role) ? "Adın, fotoğrafın ve kısa tanıtımın yorumlarında ve yazılarında görünür." : "Hesabın yönetim onayı bekliyor. Onaylanınca yorum yazabilirsin."}</p>
        </div>
        <button type="button" className="btn" onClick={() => signOut()}><Icon name="logout" /> Çıkış yap</button>
      </header>

      <form className="card form-card" onSubmit={saveProfile} noValidate>
        <h2>Profil</h2>
        <div className="field">
          <span>Fotoğraf</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {canWrite(me.role) ? (
              <label className="btn">
                {uploading ? "Yükleniyor…" : "Fotoğraf seç"}
                <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={uploading} onChange={onAvatar} />
              </label>
            ) : <span className="help">Hesabın onaylanınca fotoğraf yükleyebilirsin.</span>}
            {profile.avatar_url && <button type="button" className="linkish" onClick={() => setProfile((p) => ({ ...p, avatar_url: "" }))}>Fotoğrafı kaldır</button>}
          </div>
        </div>
        <label className="field"><span>Ad</span><input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} maxLength={80} required disabled={!!nameLockedUntil} />
          <small className="help">{nameLockedUntil ? `Adını ${fmtDate(nameLockedUntil)} tarihinden sonra yeniden değiştirebilirsin.` : me.role === "admin" ? "Adını istediğin zaman değiştirebilirsin." : "Adını 30 günde bir değiştirebilirsin."}</small>
        </label>
        <label className="field"><span>Hakkında</span><textarea rows={3} value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} maxLength={600} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={saving || uploading}>{saving ? "Kaydediliyor…" : "Profili kaydet"}</button>
      </form>

      <MemberStatus me={me} />
      <PasswordForm />
      <p className="content-notice">Paylaştığın yazı ve yorumlardan hukuken yalnızca sen sorumlusun. <Link to="/kosullar">Kullanım koşulları</Link></p>
    </>
  );
}

/** Hesap durumu: onay bekliyor ya da onaylı üye. */
function MemberStatus({ me }: { me: Profile }) {
  const approved = canWrite(me.role);
  return (
    <section id="durum" className="card form-card authorship">
      <Bottle mood={approved ? "happy" : "filling"} size={64} />
      <div style={{ flex: 1 }}>
        <h2>Üyelik</h2>
        <p className="muted">{approved
          ? "Hesabın onaylı. Yazı paylaşabilir, yorum yazabilir, beğenebilir ve takip edebilirsin."
          : "Hesabın yönetim onayı bekliyor. Onaylanınca yazı paylaşabilir, yorum yazabilir ve beğenebilirsin; o zamana kadar yazıları okuyabilirsin."}</p>
      </div>
      {approved && <Link className="btn btn-primary" to="/panel/yeni"><Icon name="pen" /> Yeni yazı</Link>}
    </section>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [pw, setPw] = useState({ a: "", b: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.a.length < 8) return setError("Şifre en az 8 karakter olmalı.");
    if (pw.a !== pw.b) return setError("İki şifre aynı değil.");
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw.a });
    setBusy(false);
    if (error) return setError("Şifre değiştirilemedi: " + error.message);
    setPw({ a: "", b: "" });
    toast("success", "Şifren değiştirildi.");
  }
  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <h2>Şifre değiştir</h2>
      <div className="grid-2">
        <label className="field"><span>Yeni şifre</span><input type="password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} autoComplete="new-password" minLength={8} /></label>
        <label className="field"><span>Yeni şifre (tekrar)</span><input type="password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} autoComplete="new-password" minLength={8} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Değiştiriliyor…" : "Şifreyi değiştir"}</button>
    </form>
  );
}
