import { Link, NavLink, Outlet, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { NotFound } from "./States";
import { Mascot } from "./Mascot";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? "Aydınlık temaya geç" : "Karanlık temaya geç"} title={dark ? "Aydınlık tema" : "Karanlık tema"}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {dark
          ? <path d="M12 2l1.8 5.2L19 5l-2.2 5.2L22 12l-5.2 1.8L19 19l-5.2-2.2L12 22l-1.8-5.2L5 19l2.2-5.2L2 12l5.2-1.8L5 5l5.2 2.2z" />
          : <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />}
      </svg>
    </button>
  );
}

export function Header() {
  const auth = useAuth();
  return (
    <header className="site-header">
      <Link to="/" className="logo"><span className="logo-word">Tombul</span> <span className="logo-script">Dergi</span></Link>
      <nav aria-label="Ana gezinme" className="nav">
        <NavLink to="/" end>Yazılar</NavLink>
        <NavLink to="/yazarlar">Yazarlar</NavLink>
        {auth.status === "signed-in"
          ? <NavLink to="/panel" className="nav-cta">Panel</NavLink>
          : <NavLink to="/giris" className="nav-cta">Yazar girişi</NavLink>}
        <ThemeToggle />
      </nav>
    </header>
  );
}

export function Layout() {
  return (
    <>
      <a href="#icerik" className="skip">İçeriğe geç</a>
      <Header />
      <main id="icerik"><Outlet /></main>
      <footer className="site-footer">
        <Mascot kind="atom" size={56} />
        <p>Tombul Dergi, üniversitelilerin her şey hakkında yazdığı dergi. {new Date().getFullYear()}</p>
        <Link to="/yazarlar">Yazarlar</Link>
      </footer>
      <ScrollRestoration />
    </>
  );
}

/** Beklenmeyen bir çökme ya da bilinmeyen adres. */
export function RouteError() {
  const err = useRouteError();
  const body = isRouteErrorResponse(err) && err.status === 404
    ? <NotFound />
    : (
      <section className="state page" role="alert">
        <Mascot kind="flask" mood="error" size={150} />
        <h1>Bir şeyler ters gitti</h1>
        <p>Sayfa açılırken beklenmeyen bir hata oldu. Sayfayı yenilemek çoğu zaman düzeltir.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>Sayfayı yenile</button>
      </section>
    );
  return (<><Header /><main id="icerik">{body}</main></>);
}
