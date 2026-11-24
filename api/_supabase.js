// Vercel fonksiyonları için ortak Supabase yardımcıları (alt çizgiyle başlayan dosya fonksiyon olarak yayınlanmaz).
const SB_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Servis anahtarıyla Supabase REST/Auth çağrısı. */
export const sb = (path, init = {}) =>
  fetch(SB_URL + path, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers },
  });

/** İstekteki oturumun sahibini ve rolünü döner; oturum yoksa null. */
export async function caller(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) return null;
  const who = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!who.ok) return null;
  const { id } = await who.json();
  const [me] = await (await sb(`/rest/v1/profiles?id=eq.${id}&select=role`)).json();
  return me ? { id, role: me.role } : null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Doğrulanmış (e-posta onayı gerekmeyen) hesap açar; çakışmada 409. */
export async function createAccount({ email, password, name, wantsAuthor }) {
  const res = await sb("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name, wants_author: wantsAuthor ? "true" : "false" } }),
  });
  const user = await res.json();
  if (res.ok) return { ok: true, id: user.id };
  const taken = /already|exists|registered/i.test(user.msg || user.message || "");
  return { ok: false, status: taken ? 409 : 502, error: taken ? "Bu e-postayla bir hesap zaten var." : "Hesap açılamadı. Birazdan tekrar dene." };
}

/** Ortak alan kontrolleri; hata metni ya da null. */
export function validateAccount({ email, password, name }) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) return "Adını yaz (en fazla 80 karakter).";
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) return "Geçerli bir e-posta yaz.";
  if (typeof password !== "string" || password.length < 8 || password.length > 72) return "Şifre 8 ile 72 karakter arasında olmalı.";
  return null;
}
