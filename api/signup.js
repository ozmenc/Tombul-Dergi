// Herkese açık kayıt. E-posta doğrulaması yok (Supabase'in hazır e-posta servisi saatte birkaç e-posta ile sınırlı);
// yeni hesap okur olur, "yazar olmak istiyorum" dediyse başvuran olur ve admin onayını bekler.
import { createAccount, validateAccount } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });
  const { email, password, name, wantsAuthor, website, acceptedTerms } = req.body || {};
  if (website) return res.status(400).json({ error: "Kayıt alınamadı." }); // bot tuzağı: gizli alan dolu
  if (acceptedTerms !== true) return res.status(400).json({ error: "Kayıt için kullanım koşullarını kabul etmelisin." });
  const invalid = validateAccount({ email, password, name });
  if (invalid) return res.status(400).json({ error: invalid });
  const out = await createAccount({ email: email.trim(), password, name: name.trim(), wantsAuthor: wantsAuthor === true, acceptedTerms: true });
  if (!out.ok) return res.status(out.status).json({ error: out.error });
  return res.status(201).json({ id: out.id });
}
