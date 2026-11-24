// Tokuşturma: herkes bir yazıya istediği kadar tokuşturur. Tarayıcı hızlı tıklamaları biriktirip tek istekle yollar.
// Kötüye kullanıma karşı aynı IP'den saatte en fazla CHEERS_PER_HOUR (supabase/013_cheers.sql).
import { clientIpHash, pruneOld, sb } from "./_supabase.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHEERS_PER_HOUR = 600;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });
  const { postId, count } = req.body || {};
  if (typeof postId !== "string" || !UUID_RE.test(postId) || !Number.isInteger(count) || count < 1 || count > 50)
    return res.status(400).json({ error: "Geçersiz tokuşturma." });

  const [post] = await (await sb(`/rest/v1/posts?id=eq.${postId}&status=eq.published&select=id`)).json();
  if (!post) return res.status(404).json({ error: "Yazı bulunamadı." });

  const ipHash = clientIpHash(req);
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const recent = await (await sb(`/rest/v1/cheer_hits?ip_hash=eq.${ipHash}&created_at=gte.${hourAgo}&select=n`)).json();
  if (recent.reduce((sum, r) => sum + r.n, 0) + count > CHEERS_PER_HOUR)
    return res.status(429).json({ error: "Bu kadar tokuşturma yeter, biraz dinlen. Bir saat sonra devam." });

  await sb("/rest/v1/cheer_hits", { method: "POST", body: JSON.stringify({ ip_hash: ipHash, n: count }) });
  const total = await (await sb("/rest/v1/rpc/add_cheers", { method: "POST", body: JSON.stringify({ p_post: postId, p_n: count }) })).json();
  await pruneOld("cheer_hits");
  return res.status(200).json({ total: Number(total) });
}
