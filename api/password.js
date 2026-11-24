// Admin bir üyeye yeni geçici şifre verir (e-postayla sıfırlama yok). Şifre sunucuda üretilir ve bir kez döner.
import { randomInt } from "node:crypto";
import { caller, sb } from "./_supabase.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });
  const me = await caller(req);
  if (!me) return res.status(401).json({ error: "Oturum geçersiz, tekrar giriş yap." });
  if (me.role !== "admin") return res.status(403).json({ error: "Şifre sıfırlamak için admin olmalısın." });

  const { userId } = req.body || {};
  if (typeof userId !== "string" || !UUID_RE.test(userId)) return res.status(400).json({ error: "Geçersiz üye." });
  if (userId === me.id) return res.status(400).json({ error: "Kendi şifreni Hesabım sayfasından değiştir." });

  const password = Array.from({ length: 14 }, () => CHARS[randomInt(CHARS.length)]).join("");
  const r = await sb(`/auth/v1/admin/users/${userId}`, { method: "PUT", body: JSON.stringify({ password }) });
  if (r.status === 404) return res.status(404).json({ error: "Üye bulunamadı." });
  if (!r.ok) return res.status(502).json({ error: "Şifre değiştirilemedi. Birazdan tekrar dene." });
  return res.status(200).json({ password });
}
