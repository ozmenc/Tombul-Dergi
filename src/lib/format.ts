export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  const x = new Date(d);
  return isNaN(+x) ? "" : x.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
};

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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Her yazara kimliğinden türetilen sabit bir tombul renk. */
export const PALETTE = ["#b8a1ff", "#ff9b71", "#ffd166", "#7fd8be"];
export const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toLocaleUpperCase("tr-TR")).join("") || "?";
