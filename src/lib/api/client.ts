import { supabase } from "../supabase";

export { supabase };

type PgError = { message: string; code?: string };

/** Supabase yanıtını açar: hata varsa (kodu korunarak) fırlatır. Üretilmiş DB tipleri olmadığından sonucu burada tipliyoruz. */
export function must<T = unknown>(r: { data: unknown; error: PgError | null }): T {
  if (r.error) throw Object.assign(new Error(r.error.message), { code: r.error.code });
  return r.data as T;
}

export const errorCode = (e: unknown) => (e as { code?: string } | null)?.code;

/** Şu anki oturumun kullanıcı kimliği (yoksa null). */
export async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Vercel fonksiyonuna JSON POST; sunucunun hata metnini Error olarak fırlatır. */
export async function postJson(path: string, body: unknown, auth = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("Oturumun kapanmış. Tekrar giriş yap.");
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) }).catch(() => null);
  if (!res) throw new Error("Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.");
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "İşlem tamamlanamadı.");
  return out;
}
