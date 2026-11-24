import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { sendReport } from "../lib/api/reports";
import { useMe } from "../lib/auth";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

/** Yazının altındaki kısa sorumluluk notu. */
export function ContentNotice() {
  return (
    <p className="content-notice">
      Bu yazının içeriğinden ve görüşlerinden yalnızca yazarı sorumludur; Tombul Dergi'nin görüşünü yansıtmaz.{" "}
      <Link to="/kosullar">Kullanım koşulları</Link>
    </p>
  );
}

/** Hukuka aykırı içerik bildirimi: bildirim yalnızca yönetime gider. */
export function ReportButton({ postId }: { postId: string }) {
  const me = useMe();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const id = `r-${postId}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (reason.trim().length < 10) return toast("error", "Neyin sorunlu olduğunu birkaç kelimeyle yaz (en az 10 karakter).");
    setBusy(true);
    try { await sendReport(postId, reason, contact); setOpen(false); setReason(""); setContact(""); toast("success", "Bildirimin yönetime iletildi. Teşekkürler."); }
    catch { toast("error", "Bildirim gönderilemedi. Tekrar dene."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" className="act" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
        title="Hukuka aykırı ya da kurallara uymayan yazıyı bildir">
        <Icon name="flag" /> Bildir
      </button>
      {open && (
        <form id={id} className="report-form" onSubmit={submit}>
          <label className="field"><span>Sorun ne?</span>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} autoFocus
              placeholder="Örn. hakaret, kişisel bilgi, telif ihlali…" />
          </label>
          {!me && (
            <label className="field"><span>Sana nasıl ulaşalım? (isteğe bağlı)</span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} placeholder="E-posta" autoComplete="email" />
            </label>
          )}
          <div className="inline-form">
            <button className="btn btn-sm btn-primary" disabled={busy}>{busy ? "Gönderiliyor…" : "Bildir"}</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>Vazgeç</button>
          </div>
        </form>
      )}
    </>
  );
}
