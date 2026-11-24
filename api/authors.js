// Admin yeni yazar hesabı açar. Servis anahtarı gerektiği için tarayıcıda değil burada çalışır.
const SB_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = (path, init = {}) =>
  fetch(SB_URL + path, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers },
  });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });

  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  const who = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!who.ok) return res.status(401).json({ error: "Oturum geçersiz, tekrar giriş yap." });
  const { id } = await who.json();
  const [me] = await (await sb(`/rest/v1/profiles?id=eq.${id}&select=role`)).json();
  if (me?.role !== "admin") return res.status(403).json({ error: "Yazar eklemek için admin olmalısın." });

  const { email, password, name } = req.body || {};
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Geçerli bir e-posta yaz." });
  if (typeof password !== "string" || password.length < 8)
    return res.status(400).json({ error: "Şifre en az 8 karakter olmalı." });
  if (typeof name !== "string" || !name.trim() || name.length > 80)
    return res.status(400).json({ error: "Yazarın adını yaz (en fazla 80 karakter)." });

  const created = await sb("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: name.trim() } }),
  });
  const user = await created.json();
  if (!created.ok) {
    const taken = /already|exists|registered/i.test(user.msg || user.message || "");
    return res.status(taken ? 409 : 502).json({ error: taken ? "Bu e-postayla bir hesap zaten var." : "Hesap açılamadı." });
  }

  // Tetikleyici profili 'pending' açar; burada yazar yapıyoruz.
  const promoted = await sb(`/rest/v1/profiles?id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({ role: "author", name: name.trim() }),
  });
  if (!promoted.ok) return res.status(502).json({ error: "Hesap açıldı ama yazar yapılamadı. Yazarlar listesinden rolünü değiştir." });

  return res.status(201).json({ id: user.id });
}
