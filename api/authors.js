// Admin yeni yazar hesabı açar.
import { caller, createAccount, sb, validateAccount } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });
  const me = await caller(req);
  if (!me) return res.status(401).json({ error: "Oturum geçersiz, tekrar giriş yap." });
  if (me.role !== "admin") return res.status(403).json({ error: "Yazar eklemek için admin olmalısın." });

  const { email, password, name } = req.body || {};
  const invalid = validateAccount({ email, password, name });
  if (invalid) return res.status(400).json({ error: invalid });
  const out = await createAccount({ email: email.trim(), password, name: name.trim(), wantsAuthor: false });
  if (!out.ok) return res.status(out.status).json({ error: out.error });

  const promoted = await sb(`/rest/v1/profiles?id=eq.${out.id}`, { method: "PATCH", body: JSON.stringify({ role: "author" }) });
  if (!promoted.ok) return res.status(502).json({ error: "Hesap açıldı ama yazar yapılamadı. Üyeler listesinden rolünü değiştir." });
  return res.status(201).json({ id: out.id });
}
