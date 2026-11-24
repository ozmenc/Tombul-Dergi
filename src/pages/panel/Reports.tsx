import { useState } from "react";
import { Link } from "react-router";
import { AdminOnly, PanelHead } from "./PanelLayout";
import { listReports, setReportResolved } from "../../lib/api/reports";
import { useAsync } from "../../lib/useAsync";
import { useTitle } from "../../lib/useTitle";
import { fmtRelative } from "../../lib/format";
import { Icon } from "../../components/Icon";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/States";
import { useToast } from "../../components/Toast";

export default function ReportsPage() {
  useTitle("Bildirimler");
  return <AdminOnly><Reports /></AdminOnly>;
}

/** Okurların yazılar için "Bildir" ile gönderdiği bildirimler (supabase/007_reports.sql). */
function Reports() {
  const toast = useToast();
  const [closed, setClosed] = useState(false);
  const [state, retry, setState] = useAsync(() => listReports(closed), [closed]);

  async function toggle(id: string) {
    try {
      await setReportResolved(id, !closed);
      setState((s) => (s.status === "success" ? { status: "success", data: s.data.filter((r) => r.id !== id) } : s));
      toast("success", closed ? "Bildirim yeniden açıldı." : "Bildirim kapatıldı.");
    } catch { toast("error", "Güncellenemedi. Tekrar dene."); }
  }

  return (
    <section className="card panel-section">
      <PanelHead title="Bildirimler">
        <div className="segmented" role="group" aria-label="Bildirim listesi">
          <button type="button" aria-pressed={!closed} onClick={() => setClosed(false)}>Açık</button>
          <button type="button" aria-pressed={closed} onClick={() => setClosed(true)}>Kapatılanlar</button>
        </div>
      </PanelHead>
      <p className="muted" style={{ marginBottom: 12 }}>Hukuka aykırı bulduğun yazıyı gecikmeden yayından kaldır ya da sil, sonra bildirimi kapat.</p>
      {state.status === "loading" && <ListSkeleton rows={2} />}
      {state.status === "error" && <ErrorState title="Bildirimler yüklenemedi" error={state.error} onRetry={retry} />}
      {state.status === "success" && (state.data.length === 0
        ? <EmptyState card={false} title={closed ? "Kapatılan bildirim yok" : "Açık bildirim yok"}>Okurlar bir yazıyı bildirdiğinde burada görünür.</EmptyState>
        : (
          <ul className="rows">
            {state.data.map((r) => (
                <li key={r.id} className="row mod-row">
                  <span className="row-main">
                    <strong>{r.post ? <Link to={`/yazi/${r.post.slug}`}>{r.post.title}</Link> : "Silinmiş yazı"}</strong>
                    <span className="mod-body"><Icon name="flag" /> {r.reason}</span>
                    <small>{fmtRelative(r.created_at)} · {r.reporter?.name ?? "üye olmayan biri"}{r.contact && ` · iletişim: ${r.contact}`}</small>
                  </span>
                  <button type="button" className="btn btn-sm" onClick={() => toggle(r.id)}><Icon name={closed ? "flag" : "check"} /> {closed ? "Yeniden aç" : "Kapat"}</button>
                </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
