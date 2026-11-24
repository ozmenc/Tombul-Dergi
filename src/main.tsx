import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, isRouteErrorResponse, Link, RouterProvider, useRouteError } from "react-router";
import "./styles/index.css";
import { AuthProvider } from "./lib/auth";
import { SocialProvider } from "./lib/social";
import { ThemeProvider } from "./lib/theme";
import { ToastProvider } from "./components/Toast";
import { Shell } from "./components/Shell";
import { NotFound, Spinner } from "./components/States";
import { Bottle } from "./components/Bottle";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import PostPage from "./pages/PostPage";
import Authors from "./pages/Authors";
import AuthorPage from "./pages/AuthorPage";
import Saved from "./pages/Saved";
import Account from "./pages/Account";
import { ForgotPassword, Login, ResetPassword, Signup } from "./pages/AuthPages";

// Panel sadece yazarlara lazım: ayrı parçalarda yüklenir.
const lazy = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

/** Beklenmeyen çökme. */
function Crash() {
  const err = useRouteError();
  if (isRouteErrorResponse(err) && err.status === 404) return <div className="shell-lite"><NotFound /></div>;
  return (
    <div className="shell-lite">
      <section className="state state-card" role="alert">
        <Bottle mood="lost" size={180} />
        <h1>Bir şeyler ters gitti</h1>
        <p>Sayfa açılırken beklenmeyen bir hata oldu. Yenilemek çoğu zaman düzeltir.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => location.reload()}>Sayfayı yenile</button>
          <Link className="btn" to="/">Akışa dön</Link>
        </div>
      </section>
    </div>
  );
}

const router = createBrowserRouter([
  { path: "/giris", element: <Login />, errorElement: <Crash /> },
  { path: "/kayit", element: <Signup />, errorElement: <Crash /> },
  { path: "/sifremi-unuttum", element: <ForgotPassword />, errorElement: <Crash /> },
  { path: "/sifre-yenile", element: <ResetPassword />, errorElement: <Crash /> },
  {
    element: <Shell />,
    errorElement: <Crash />,
    children: [
      { path: "/", element: <Feed /> },
      { path: "/kesfet", element: <Explore /> },
      { path: "/yazi/:slug", element: <PostPage /> },
      { path: "/yazarlar", element: <Authors /> },
      { path: "/yazar/:id", element: <AuthorPage /> },
      { path: "/kaydedilenler", element: <Saved /> },
      { path: "/hesap", element: <Account /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    element: <Shell wide />,
    errorElement: <Crash />,
    children: [
      {
        path: "/panel",
        lazy: lazy(() => import("./pages/panel/PanelLayout")),
        hydrateFallbackElement: <Spinner />,
        children: [
          { index: true, lazy: lazy(() => import("./pages/panel/Overview")) },
          { path: "yazilar", lazy: lazy(() => import("./pages/panel/Posts")) },
          { path: "yeni", lazy: lazy(() => import("./pages/panel/Editor")) },
          { path: "yazi/:id", lazy: lazy(() => import("./pages/panel/Editor")) },
          { path: "kategoriler", lazy: lazy(() => import("./pages/panel/Categories")) },
          { path: "uyeler", lazy: lazy(() => import("./pages/panel/Members")) },
          { path: "yorumlar", lazy: lazy(() => import("./pages/panel/Moderation")) },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SocialProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </SocialProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
