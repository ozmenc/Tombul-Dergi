import type { ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useOutletContext } from "react-router";
import { useAuth } from "../../lib/auth";
import { canWrite, type Profile } from "../../lib/types";
import { ErrorState, Forbidden, Spinner } from "../../components/States";
import { Icon } from "../../components/Icon";

type PanelCtx = { me: Profile };
export const usePanel = () => useOutletContext<PanelCtx>();

export default function PanelLayout() {
  const auth = useAuth();
  const { pathname } = useLocation();

  if (auth.status === "loading") return <Spinner />;
  if (auth.status === "error") return <ErrorState title="Hesabın yüklenemedi" onRetry={auth.retry} />;
  if (auth.status === "signed-out") return <Navigate to={`/giris?next=${encodeURIComponent(pathname)}`} replace />;

  const me = auth.profile;
  if (!canWrite(me.role))
    return (
      <Forbidden>
        Hesabın yönetim onayı bekliyor. Onaylanınca yazı paylaşabilirsin.
        <br /><Link to="/hesap#durum">Hesap durumuna bak</Link>
      </Forbidden>
    );

  return (
    <>
      <div className="panel-top">
        <nav className="segmented" aria-label="Panel">
          <NavLink to="/panel" end>Genel bakış</NavLink>
          <NavLink to="/panel/yazilar">Yazılar</NavLink>
          {me.role === "admin" && <NavLink to="/panel/kategoriler">Kategoriler</NavLink>}
          {me.role === "admin" && <NavLink to="/panel/uyeler">Üyeler</NavLink>}
          {me.role === "admin" && <NavLink to="/panel/bildirimler">Bildirimler</NavLink>}
        </nav>
        <Link to="/panel/yeni" className="btn btn-primary"><Icon name="plus" /> Yeni yazı</Link>
      </div>
      <Outlet context={{ me } satisfies PanelCtx} />
    </>
  );
}

/** Sadece adminlerin göreceği panel sayfaları için. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { me } = usePanel();
  return me.role === "admin" ? <>{children}</> : <Forbidden>Bu bölüm sadece adminler için.</Forbidden>;
}

export function PanelHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel-head">
      <h1>{title}</h1>
      {children}
    </div>
  );
}
