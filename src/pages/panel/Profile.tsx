import { useState, type FormEvent } from "react";
import { usePanel } from "./PanelLayout";
import { updateProfile } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { useTitle } from "../../lib/useTitle";
import { Avatar } from "../../components/Avatar";
import { useToast } from "../../components/Toast";

export default function Profile() {
  const { me, refresh } = usePanel();
  const toast = useToast();
  useTitle("Profilim");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const patch = { name: String(f.get("name")).trim(), bio: String(f.get("bio")).trim() };
    if (!patch.name) return setProfileError("Adını yaz.");
    setProfileError("");
    setSavingProfile(true);
    try {
      await updateProfile(me.id, patch);
      await refresh();
      toast("success", "Profil kaydedildi.");
    } catch (err) {
      setProfileError("Kaydedilemedi: " + (err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const pw = String(f.get("password")), again = String(f.get("again"));
    if (pw.length < 8) return setPwError("Şifre en az 8 karakter olmalı.");
    if (pw !== again) return setPwError("İki şifre aynı değil.");
    setPwError("");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) return setPwError("Şifre değiştirilemedi: " + error.message);
    form.reset();
    toast("success", "Şifren değiştirildi.");
  }

  return (
    <>
      <div className="panel-head"><h1>Profilim</h1></div>
      <form className="card-form" onSubmit={saveProfile} noValidate>
        <div className="profile-row">
          <Avatar id={me.id} name={me.name} size={64} />
          <p className="muted">Adın ve kısa tanıtımın Yazarlar sayfasında ve yazılarının altında görünür.</p>
        </div>
        <label className="field"><span>Ad</span><input name="name" defaultValue={me.name} maxLength={80} required /></label>
        <label className="field"><span>Hakkında</span><textarea name="bio" defaultValue={me.bio} maxLength={600} rows={4} /></label>
        {profileError && <p className="form-error" role="alert">{profileError}</p>}
        <button className="btn btn-primary" disabled={savingProfile}>{savingProfile ? "Kaydediliyor…" : "Profili kaydet"}</button>
      </form>

      <form className="card-form" onSubmit={savePassword} noValidate>
        <h2>Şifre değiştir</h2>
        <div className="grid-2">
          <label className="field"><span>Yeni şifre</span><input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label className="field"><span>Yeni şifre (tekrar)</span><input name="again" type="password" autoComplete="new-password" minLength={8} required /></label>
        </div>
        {pwError && <p className="form-error" role="alert">{pwError}</p>}
        <button className="btn btn-primary" disabled={savingPw}>{savingPw ? "Değiştiriliyor…" : "Şifreyi değiştir"}</button>
      </form>
    </>
  );
}
