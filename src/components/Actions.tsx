import { Icon } from "./Icon";
import { useToast } from "./Toast";

/** Yazı bağlantısını paylaşır; paylaşım menüsü yoksa panoya kopyalar. */
export function ShareButton({ slug, title }: { slug: string; title: string }) {
  const toast = useToast();
  async function click() {
    const url = `${location.origin}/yazi/${slug}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast("success", "Bağlantı kopyalandı."); }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("error", "Paylaşılamadı. Bağlantıyı adres çubuğundan kopyalayabilirsin.");
    }
  }
  return <button type="button" className="act" onClick={click}><Icon name="share" /> Paylaş</button>;
}
