import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { supabase } from "../lib/supabase";
import { signUp } from "../lib/api/people";
import { useAuth } from "../lib/auth";
import { useTitle } from "../lib/useTitle";
import { EMAIL_RE } from "../lib/format";
import { Bottle } from "../components/Bottle";
import { Brand, ThemeToggle } from "../components/Shell";
import { Spinner } from "../components/States";
import { useToast } from "../components/Toast";

/** Sadece uygulama içi bir adrese dönülür (açık yönlendirmeyi engeller). */
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/");

function AuthLayout({ shy, title, lede, children }: { shy: boolean; title: string; lede: string; children: ReactNode }) {
  return (
    <div className="auth">
      <header className="auth-top"><Brand size={24} /><ThemeToggle /></header>
      <div className="auth-grid">
        <section className="auth-art">
          <Bottle mood={shy ? "shy" : "idle"} size={170} playful={!shy} label="Tombul şişeyle tokuştur" />
          <p>{shy ? "Bakmıyorum, söz." : "Bana dokun, tokuşturalım."}</p>
        </section>
        <section className="auth-card card">
          <h1>{title}</h1>
          <p className="muted">{lede}</p>
          {children}
        </section>
      </div>
    </div>
  );
}

function PasswordField({ value, onChange, onFocus, onBlur, autoComplete, label = "Şifre" }: {
  value: string; onChange: (v: string) => void; onFocus: () => void; onBlur: () => void; autoComplete: string; label?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div style={{ position: "relative" }}>
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur}
          autoComplete={autoComplete} required minLength={8} maxLength={72} style={{ paddingRight: 92 }} />
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShow((s) => !s)} style={{ position: "absolute", right: 6, top: 6 }}
          aria-pressed={show}>{show ? "Gizle" : "Göster"}</button>
      </div>
    </label>
  );
}

export function Login() {
  useTitle("Giriş yap");
  const auth = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shy, setShy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (auth.status === "signed-in") return <Navigate to={next} replace />;
  if (auth.status === "loading") return <Spinner />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) return setError("Geçerli bir e-posta yaz.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.status === 400 ? "E-posta ya da şifre yanlış." : "Giriş yapılamadı. Bağlantını kontrol edip tekrar dene.");
  }

  return (
    <AuthLayout shy={shy} title="Tekrar hoş geldin" lede="Okumaya, beğenmeye ve yorum yapmaya kaldığın yerden devam et.">
      <form onSubmit={submit} noValidate>
        <label className="field"><span>E-posta</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        <PasswordField value={password} onChange={setPassword} onFocus={() => setShy(true)} onBlur={() => setShy(false)} autoComplete="current-password" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}</button>
      </form>
      <p className="auth-switch">Hesabın yok mu? <Link to={`/kayit${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>Kayıt ol</Link></p>
      <p className="help">Şifreni unuttuysan dergi yönetimine yaz; yeni bir geçici şifre verirler.</p>
    </AuthLayout>
  );
}

export function Signup() {
  useTitle("Kayıt ol");
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [form, setForm] = useState({ name: "", email: "", password: "", wantsAuthor: false, website: "" });
  const [shy, setShy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (auth.status === "signed-in" && !busy) return <Navigate to={next} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Adını yaz.");
    if (!EMAIL_RE.test(form.email.trim())) return setError("Geçerli bir e-posta yaz.");
    if (form.password.length < 8) return setError("Şifre en az 8 karakter olmalı.");
    setBusy(true);
    try {
      await signUp(form);
      toast("success", form.wantsAuthor ? "Hoş geldin! Yazarlık başvurun yönetime iletildi." : "Hoş geldin! Şerefe.");
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout shy={shy} title="Aramıza katıl" lede="Yorum yap, beğen, kaydet. İstersen yazar olmak için de başvur.">
      <form onSubmit={submit} noValidate>
        <label className="field"><span>Adın</span><input value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" maxLength={80} required /></label>
        <label className="field"><span>E-posta</span><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required /></label>
        <PasswordField value={form.password} onChange={(v) => set("password", v)} onFocus={() => setShy(true)} onBlur={() => setShy(false)} autoComplete="new-password" />
        <p className="help" style={{ marginTop: -10, marginBottom: 16 }}>En az 8 karakter.</p>
        {/* bot tuzağı: insanlar görmez, doldurmaz */}
        <input className="sr-only" tabIndex={-1} aria-hidden="true" autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} name="website" />
        <label className="check" style={{ marginBottom: 18 }}>
          <input type="checkbox" checked={form.wantsAuthor} onChange={(e) => set("wantsAuthor", e.target.checked)} />
          <span><strong>Yazar olmak istiyorum</strong><span>Yönetim onaylayınca yazı yazabilirsin. Beklerken okuyup yorum yapabilirsin.</span></span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? "Hesabın açılıyor…" : "Kayıt ol"}</button>
      </form>
      <p className="auth-switch">Zaten üye misin? <Link to={`/giris${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>Giriş yap</Link></p>
    </AuthLayout>
  );
}
