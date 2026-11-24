// Vercel fonksiyonları için ortak Supabase yardımcıları (alt çizgiyle başlayan dosya fonksiyon olarak yayınlanmaz).
import { createHmac } from "node:crypto";
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

/** İstemcinin IP adresinin özeti: IP düz saklanmaz, servis anahtarıyla HMAC-SHA256. */
export function clientIpHash(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim() || "bilinmiyor";
  return createHmac("sha256", KEY).update(ip).digest("hex");
}

/** Bir günden eski sınır kayıtlarını siler (signup_attempts, cheer_hits). */
export const pruneOld = (table) => sb(`/rest/v1/${table}?created_at=lt.${new Date(Date.now() - 86400e3).toISOString()}`, { method: "DELETE" });

const SIGNUPS_PER_HOUR = 5;

/**
 * Aynı IP'den saatte en fazla SIGNUPS_PER_HOUR kayıt denemesi (supabase/012_signup_limit.sql).
 * Bir günden eski denemeler silinir. Sınır aşıldıysa false.
 */
export async function allowSignup(req) {
  const ipHash = clientIpHash(req);
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const recent = await sb(`/rest/v1/signup_attempts?ip_hash=eq.${ipHash}&created_at=gte.${hourAgo}&select=ip_hash`, { headers: { Prefer: "count=exact", Range: "0-0" } });
  const total = Number((recent.headers.get("content-range") || "*/0").split("/")[1]);
  if (total >= SIGNUPS_PER_HOUR) return false;
  await sb("/rest/v1/signup_attempts", { method: "POST", body: JSON.stringify({ ip_hash: ipHash }) });
  await pruneOld("signup_attempts");
  return true;
}

/** Doğrulanmış (e-posta onayı gerekmeyen) hesap açar; çakışmada 409. */
// Kullanım koşulları sürümü (src/pages/Terms.tsx "Son güncelleme"); kabul tarihiyle hesaba yazılır.
const TERMS_VERSION = "2026-11-24";

export async function createAccount({ email, password, name, acceptedTerms = false }) {
  const terms = acceptedTerms ? { terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() } : {};
  const res = await sb("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name, ...terms } }),
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
