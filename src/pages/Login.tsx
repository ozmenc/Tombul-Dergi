import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useTitle } from "../lib/useTitle";
import { Spinner } from "../components/States";

export default function Login() {
  useTitle("Yazar girişi");
  const auth = useAuth();
  const [params] = useSearchParams();
  const next = params.get("next")?.startsWith("/panel") ? params.get("next")! : "/panel";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (auth.status === "signed-in") return <Navigate to={next} replace />;
  if (auth.status === "loading") return <Spinner />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")).trim(), password: String(f.get("password")) });
    setBusy(false);
    if (error) setError(error.status === 400 ? "E-posta ya da şifre yanlış." : "Giriş yapılamadı. Bağlantını kontrol edip tekrar dene.");
  }

  return (
    <section className="auth-card">
      <h1>Yazar girişi</h1>
      <p>Hesabını admin açar. E-postan ve şifrenle gir.</p>
      <form onSubmit={submit} noValidate={false}>
        <label className="field"><span>E-posta</span><input name="email" type="email" autoComplete="username" required /></label>
        <label className="field"><span>Şifre</span><input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}</button>
      </form>
    </section>
  );
}
