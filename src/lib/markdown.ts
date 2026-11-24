import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ gfm: true, breaks: true });

// Bağlantılar yeni sekmede açılsın; yazar içeriği her zaman temizlenir.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") { node.setAttribute("target", "_blank"); node.setAttribute("rel", "noopener noreferrer"); }
  if (node.tagName === "IMG") node.setAttribute("loading", "lazy");
});

export const renderMarkdown = (md: string) => DOMPurify.sanitize(marked.parse(md, { async: false }));
