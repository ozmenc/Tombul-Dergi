import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./styles.css";
import { AuthProvider } from "./lib/auth";
import { ToastProvider } from "./components/Toast";
import { Layout, RouteError } from "./components/Layout";
import { NotFound, Spinner } from "./components/States";
import Home from "./pages/Home";
import PostPage from "./pages/PostPage";
import Authors from "./pages/Authors";
import AuthorPage from "./pages/AuthorPage";
import Login from "./pages/Login";

// Panel sadece giriş yapanlara lazım: ayrı parçada yüklenir.
const panel = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/yazi/:slug", element: <PostPage /> },
      { path: "/yazarlar", element: <Authors /> },
      { path: "/yazar/:id", element: <AuthorPage /> },
      { path: "/giris", element: <Login /> },
      {
        path: "/panel",
        lazy: panel(() => import("./pages/panel/PanelLayout")),
        hydrateFallbackElement: <Spinner />,
        children: [
          { index: true, lazy: panel(() => import("./pages/panel/PanelPosts")) },
          { path: "yeni", lazy: panel(() => import("./pages/panel/Editor")) },
          { path: "yazi/:id", lazy: panel(() => import("./pages/panel/Editor")) },
          { path: "yazarlar", lazy: panel(() => import("./pages/panel/Writers")) },
          { path: "profil", lazy: panel(() => import("./pages/panel/Profile")) },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>
);
