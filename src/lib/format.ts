export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  const x = new Date(d);
  return isNaN(+x) ? "" : x.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
};

/** "şimdi", "5 dk önce", "3 sa önce", "2 gün önce", sonra tarih. */
export function fmtRelative(d: string | null | undefined, now = Date.now()) {
  if (!d) return "";
  const t = new Date(d).getTime();
  if (isNaN(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "şimdi";
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} gün önce`;
  return new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

/** Markdown'ı kaba hatlarıyla düz metne çevirir (özet ve okuma süresi için). */
export const plainText = (md: string) =>
  md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const excerpt = (md: string, max = 180) => {
  const t = plainText(md);
  return t.length <= max ? t : t.slice(0, t.lastIndexOf(" ", max)).replace(/[,.;:]$/, "") + "…";
};

export const readingMinutes = (md: string) => Math.max(1, Math.ceil(plainText(md).split(" ").filter(Boolean).length / 200));

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
export const slugify = (s: string) =>
  s
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR[c])
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Etiket: küçük harf, Türkçe harfler korunur, boşluk yerine tire, en fazla 30 karakter. */
export const normalizeTag = (s: string) =>
  s
    .trim()
    .replace(/^#+/, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9çğıöşü]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

/** Virgülle ayrılmış girişten tekrarsız etiket listesi (en fazla 8). */
export const parseTags = (input: string) => [...new Set(input.split(",").map(normalizeTag).filter(Boolean))].slice(0, 8);

/** PostgREST `or` filtresini bozabilecek karakterleri atar. */
export const sanitizeSearch = (q: string) => q.replace(/[,()*%\\:"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/** Popülerlik: beğeni ve yorum artırır, beğenmeme azaltır. */
export const popularity = (s: { likes: number; dislikes: number; comments: number }) => s.likes * 2 + s.comments * 3 - s.dislikes;

/** Her kişiye kimliğinden türetilen sabit bir renk. */
export const PALETTE = ["#ffaa2c", "#ff9cc6", "#9be7c4", "#b7c6ff", "#ffd36e"];
export const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toLocaleUpperCase("tr-TR")).join("") || "?";
