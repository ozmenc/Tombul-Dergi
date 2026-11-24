/** Editör metin işlemleri: metin + seçimden, yapılacak değişikliği (Edit) hesaplar. Saf fonksiyonlar; uygulama Editor'da. */
export type Edit = { from: number; to: number; text: string; sel: [number, number] };

const lineStart = (v: string, i: number) => (i === 0 ? 0 : v.lastIndexOf("\n", i - 1) + 1);
const URL_RE = /^https?:\/\/\S+$/;

/** **kalın** / *eğik*: seçimi işaretle sarar; zaten sarılıysa işareti kaldırır. */
export function wrap(v: string, s: number, e: number, mark: "**" | "*", placeholder: string): Edit {
  const sel = v.slice(s, e);
  // İki yandaki yıldız sayısı: 1 eğik, 2 kalın, 3 ikisi birden.
  let l = 0, r = 0;
  while (v[s - 1 - l] === "*") l++;
  while (v[e + r] === "*") r++;
  const stars = Math.min(l, r, 3);
  const on = mark === "**" ? stars >= 2 : stars % 2 === 1;
  if (sel && on)
    return { from: s - mark.length, to: e + mark.length, text: sel, sel: [s - mark.length, e - mark.length] };
  const inner = sel || placeholder;
  return { from: s, to: e, text: mark + inner + mark, sel: [s + mark.length, s + mark.length + inner.length] };
}

export type Block = "h" | "quote" | "ul" | "ol";
const ANY_BLOCK = /^(#{1,6} |> |[-*] |\d+\. )/;
const BLOCKS: Record<Block, [RegExp, (n: number) => string]> = {
  h: [/^## /, () => "## "],
  quote: [/^> /, () => "> "],
  ul: [/^[-*] /, () => "- "],
  ol: [/^\d+\. /, (n) => `${n}. `],
};

/** Seçili satırlara ara başlık / alıntı / liste uygular; hepsinde zaten varsa kaldırır. Boş satırlara dokunmaz. */
export function toggleBlock(v: string, s: number, e: number, kind: Block): Edit {
  const from = lineStart(v, s);
  const nl = v.indexOf("\n", e);
  const to = nl < 0 ? v.length : nl;
  const lines = v.slice(from, to).split("\n");
  const [re, make] = BLOCKS[kind];
  const filled = lines.filter((l) => l.trim());
  const off = filled.length > 0 && filled.every((l) => re.test(l));
  let n = 0;
  const text = lines.map((l) => (!l.trim() ? l : off ? l.replace(re, "") : make(++n) + l.replace(ANY_BLOCK, ""))).join("\n");
  return { from, to, text, sel: s === e ? [from + text.length, from + text.length] : [from, from + text.length] };
}

/** Bağlantı: seçim bir adresse [|](adres), değilse [seçim](|https://|). */
export function link(v: string, s: number, e: number): Edit {
  const sel = v.slice(s, e);
  if (URL_RE.test(sel)) return { from: s, to: e, text: `[](${sel})`, sel: [s + 1, s + 1] };
  const label = sel || "bağlantı metni";
  const text = `[${label}](https://)`;
  return { from: s, to: e, text, sel: sel ? [s + label.length + 3, s + label.length + 11] : [s + 1, s + 1 + label.length] };
}

/** Metin seçiliyken bir adres yapıştırılırsa seçimi bağlantıya çevirir. */
export function pasteLink(v: string, s: number, e: number, pasted: string): Edit | null {
  const url = pasted.trim(), sel = v.slice(s, e);
  if (s === e || !URL_RE.test(url) || URL_RE.test(sel) || sel.includes("\n")) return null;
  const text = `[${sel}](${url})`;
  return { from: s, to: e, text, sel: [s + text.length, s + text.length] };
}

/** Metni ayrı bir paragraf olarak ekler (önüne/arkasına gerektiği kadar boş satır koyar). */
export function insertBlock(v: string, s: number, e: number, body: string): Edit {
  const before = v.slice(0, s), after = v.slice(e);
  const pre = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const post = after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const text = pre + body + post;
  return { from: s, to: e, text, sel: [s + text.length, s + text.length] };
}

/** Enter: liste ya da alıntı satırını sürdürür; boş maddede Enter listeden çıkar. */
export function continueList(v: string, s: number, e: number): Edit | null {
  if (s !== e) return null;
  const from = lineStart(v, s);
  const m = /^(\s*)(> |[-*] |(\d+)\. )(.*)$/.exec(v.slice(from, s));
  if (!m) return null;
  if (!m[4].trim()) return { from, to: s, text: "", sel: [from, from] };
  const text = "\n" + m[1] + (m[3] ? `${Number(m[3]) + 1}. ` : m[2]);
  return { from: s, to: s, text, sel: [s + text.length, s + text.length] };
}

/** Uygulanmış hâli (testler için). */
export const applyEdit = (v: string, ed: Edit) => v.slice(0, ed.from) + ed.text + v.slice(ed.to);
