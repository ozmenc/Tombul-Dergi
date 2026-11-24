// Tokuşturma: herkes bir yazıya istediği kadar tokuşturur; sınır ve kişi kaydı yok (supabase/013_cheers.sql).
// Tarayıcı hızlı basışları biriktirip tek istekte yollar (en fazla 50).
import { sb } from "./_supabase.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });
  const { postId, count } = req.body || {};
  if (typeof postId !== "string" || !UUID_RE.test(postId) || !Number.isInteger(count) || count < 1 || count > 50)
    return res.status(400).json({ error: "Geçersiz tokuşturma." });

  const [post] = await (await sb(`/rest/v1/posts?id=eq.${postId}&status=eq.published&select=id`)).json();
  if (!post) return res.status(404).json({ error: "Yazı bulunamadı." });

  const total = await (await sb("/rest/v1/rpc/add_cheers", { method: "POST", body: JSON.stringify({ p_post: postId, p_n: count }) })).json();
  return res.status(200).json({ total: Number(total) });
}
