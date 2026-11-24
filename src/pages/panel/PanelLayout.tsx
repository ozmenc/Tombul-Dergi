import { Navigate, NavLink, Outlet, useLocation, useOutletContext } from "react-router";
import { signOut, useAuth } from "../../lib/auth";
import type { Profile } from "../../lib/types";
import { ErrorState, Spinner } from "../../components/States";
import { Mascot } from "../../components/Mascot";

type PanelCtx = { me: Profile; refresh: () => Promise<void> };
export const usePanel = () => useOutletContext<PanelCtx>();

export default function PanelLayout() {
  const auth = useAuth();
  const { pathname } = useLocation();

  if (auth.status === "loading") return <Spinner />;
  if (auth.status === "error") return <div className="page"><ErrorState title="Hesabın yüklenemedi" onRetry={auth.retry} /></div>;
  if (auth.status === "signed-out") return <Navigate to={`/giris?next=${encodeURIComponent(pathname)}`} replace />;

  const me = auth.profile;
  if (me.role === "pending") {
    return (
      <section className="state page">
        <Mascot kind="planet" size={140} />
        <h1>Hesabın onay bekliyor</h1>
        <p>Bir admin seni yazar yaptığında buradan yazmaya başlayabilirsin.</p>
        <button className="btn" onClick={() => signOut()}>Çıkış yap</button>
      </section>
    );
  }

  return (
    <div className="panel">
      <aside className="panel-nav" aria-label="Panel">
        <p className="panel-me"><strong>{me.name || "İsimsiz"}</strong><span>{me.role === "admin" ? "Admin" : "Yazar"}</span></p>
        <NavLink to="/panel" end>Yazılar</NavLink>
        {me.role === "admin" && <NavLink to="/panel/yazarlar">Yazarlar</NavLink>}
        <NavLink to="/panel/profil">Profilim</NavLink>
        <button className="linkish" onClick={() => signOut()}>Çıkış yap</button>
      </aside>
      <div className="panel-main">
        <Outlet context={{ me, refresh: auth.refresh } satisfies PanelCtx} />
      </div>
    </div>
  );
}
