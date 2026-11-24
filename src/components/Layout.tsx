import { Link, NavLink, Outlet, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import { useAuth } from "../lib/auth";
import { NotFound } from "./States";

export function Header() {
  const auth = useAuth();
  return (
    <header className="site-header">
      <Link to="/" className="logo"><span className="logo-dot" aria-hidden="true" />Tombul Dergi</Link>
      <nav aria-label="Ana gezinme" className="nav">
        <NavLink to="/" end>Yazılar</NavLink>
        <NavLink to="/yazarlar">Yazarlar</NavLink>
        {auth.status === "signed-in"
          ? <NavLink to="/panel" className="nav-cta">Panel</NavLink>
          : <NavLink to="/giris" className="nav-cta">Yazar girişi</NavLink>}
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
        <span>Tombul Dergi, {new Date().getFullYear()}</span>
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
      <section className="state state-error page" role="alert">
        <h1>Bir şeyler ters gitti</h1>
        <p>Sayfa açılırken beklenmeyen bir hata oldu. Sayfayı yenilemek çoğu zaman düzeltir.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>Sayfayı yenile</button>
      </section>
    );
  return (<><Header /><main id="icerik">{body}</main></>);
}
