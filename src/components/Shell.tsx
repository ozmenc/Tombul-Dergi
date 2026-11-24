import { useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from "react-router";
import { signOut, useAuth, useMe } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { useAsync } from "../lib/useAsync";
import { listPopularTags } from "../lib/api/posts";
import { canWrite, ROLE_LABEL, type Profile } from "../lib/types";
import { Avatar } from "./Avatar";
import { Bottle } from "./Bottle";
import { Icon } from "./Icon";

export function Brand({ size = 26 }: { size?: number }) {
  return (
    <Link to="/" className="brand" aria-label="Tombul Dergi, ana sayfa">
      <Bottle size={size} />
      <span aria-hidden="true">Tombul Dergi</span>
    </Link>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button type="button" className="btn icon-btn" onClick={toggle} aria-label={dark ? "Aydınlık temaya geç" : "Karanlık temaya geç"} title={dark ? "Aydınlık tema" : "Karanlık tema"}>
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}

/** "Yaz" düğmesinin gideceği yer: yazar → editör, okur → başvuru, ziyaretçi → kayıt. */
const writeTarget = (me: Profile | null) => (!me ? "/kayit" : canWrite(me.role) ? "/panel/yeni" : "/hesap#durum");

function Rail() {
  const auth = useAuth();
  const me = useMe();
  return (
    <aside className="rail" aria-label="Ana menü">
      <Brand />
      <nav aria-label="Ana gezinme" style={{ display: "contents" }}>
        <NavLink to="/" end className="rail-link"><Icon name="home" />Ana sayfa</NavLink>
        <NavLink to="/kesfet" className="rail-link"><Icon name="search" />Keşfet</NavLink>
        <NavLink to="/yazarlar" className="rail-link"><Icon name="users" />Yazarlar</NavLink>
        {me && canWrite(me.role) && <NavLink to="/panel" className="rail-link"><Icon name="grid" />Panel</NavLink>}
      </nav>
      <Link to={writeTarget(me)} className="btn btn-primary btn-lg rail-write"><Icon name="pen" />Yaz</Link>
      <div className="rail-foot">
        {me ? (
          <Link to="/hesap" className="me-chip">
            <Avatar person={me} size={40} />
            <span><strong>{me.name || "Hesabım"}</strong><small>{ROLE_LABEL[me.role]}</small></span>
          </Link>
        ) : auth.status === "loading" ? null : (
          <>
            <Link to="/giris" className="btn btn-block">Giriş yap</Link>
            <Link to="/kayit" className="btn btn-amber btn-block">Kayıt ol</Link>
          </>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <ThemeToggle />
          {me && <button type="button" className="btn icon-btn" onClick={() => signOut()} aria-label="Çıkış yap" title="Çıkış yap"><Icon name="logout" /></button>}
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <Brand size={22} />
      <Link to="/kesfet" className="btn icon-btn" aria-label="Ara"><Icon name="search" /></Link>
      <ThemeToggle />
    </header>
  );
}

function TabBar() {
  const me = useMe();
  return (
    <nav className="tabbar" aria-label="Alt gezinme">
      <NavLink to="/" end><Icon name="home" />Ana sayfa</NavLink>
      <NavLink to="/kesfet"><Icon name="search" />Keşfet</NavLink>
      <NavLink to={writeTarget(me)} className="tab-write" aria-label="Yaz"><Icon name="plus" /></NavLink>
      <NavLink to="/yazarlar"><Icon name="users" />Yazarlar</NavLink>
      {me ? <NavLink to={canWrite(me.role) ? "/panel" : "/hesap"}><Icon name={canWrite(me.role) ? "grid" : "user"} />{canWrite(me.role) ? "Panel" : "Hesap"}</NavLink>
        : <NavLink to="/giris"><Icon name="user" />Giriş</NavLink>}
    </nav>
  );
}

function Aside() {
  const me = useMe();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [tags] = useAsync(() => listPopularTags(10), []);
  const search = (e: FormEvent) => { e.preventDefault(); if (q.trim()) navigate(`/kesfet?q=${encodeURIComponent(q.trim())}`); };
  return (
    <aside className="aside" aria-label="Keşif">
      <form role="search" onSubmit={search}>
        <label className="sr-only" htmlFor="aside-q">Yazı ya da yazar ara</label>
        <div style={{ position: "relative" }}>
          <input id="aside-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Yazı ya da yazar ara" style={{ paddingLeft: 44 }} />
          <span style={{ position: "absolute", left: 16, top: 14, color: "var(--muted)" }}><Icon name="search" /></span>
        </div>
      </form>
      {tags.status === "success" && tags.data.length > 0 && (
        <section className="aside-box" aria-labelledby="gundem">
          <h2 id="gundem">Gündemdeki etiketler</h2>
          <div className="tag-list">{tags.data.map((t) => <Link key={t.tag} className="chip" to={`/kesfet?etiket=${encodeURIComponent(t.tag)}`}>#{t.tag}</Link>)}</div>
        </section>
      )}
      {!me && (
        <section className="aside-box aside-cta">
          <h2>Sen de yaz.</h2>
          <p>Yazar olarak kayıt ol; yönetim hesabını onaylayınca yazıların dergide yayınlanır.</p>
          <Link to="/kayit" className="btn btn-amber">Kayıt ol</Link>
        </section>
      )}
      {me?.role === "pending" && (
        <section className="aside-box aside-cta">
          <h2>Onay bekleniyor</h2>
          <p>Hesabın yönetim onayında. Onaylanınca yazı paylaşabilirsin.</p>
        </section>
      )}
      <p className="content-notice">Yazılardan yalnızca yazarları sorumludur. <Link to="/kosullar">Kullanım koşulları</Link></p>
    </aside>
  );
}

/** Uygulama iskeleti. `wide`: sağ sütun yok (panel ekranları). */
export function Shell({ wide = false }: { wide?: boolean }) {
  return (
    <>
      <a href="#icerik" className="skip">İçeriğe geç</a>
      <TopBar />
      <div className={`shell ${wide ? "wide" : ""}`}>
        <Rail />
        <main id="icerik"><Outlet /></main>
        {!wide && <Aside />}
      </div>
      <TabBar />
      <ScrollRestoration />
    </>
  );
}
