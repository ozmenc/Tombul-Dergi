import { marked } from "marked";
import DOMPurify from "dompurify";

export const IMAGE_SIZES = { küçük: "s", orta: "m", geniş: "" } as const;
export type ImageSize = keyof typeof IMAGE_SIZES;

marked.setOptions({ gfm: true, breaks: true });

// Bağlantılar yeni sekmede açılsın; yazar içeriği her zaman temizlenir.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") { node.setAttribute("target", "_blank"); node.setAttribute("rel", "noopener noreferrer"); }
  if (node.tagName === "IMG") {
    node.setAttribute("loading", "lazy");
    // ![](url "küçük") / "orta": resim boyutu başlık kelimesiyle seçilir; yoksa tam genişlik.
    const size = IMAGE_SIZES[node.getAttribute("title") as ImageSize];
    if (size) { node.setAttribute("class", `img-${size}`); node.removeAttribute("title"); }
  }
});

export const renderMarkdown = (md: string) => DOMPurify.sanitize(marked.parse(md, { async: false }));
