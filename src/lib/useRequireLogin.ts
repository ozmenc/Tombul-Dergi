import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { useMe } from "./auth";
import { useToast } from "../components/Toast";

/** Giriş gerektiren bir işlemden önce çağrılır; giriş yoksa giriş sayfasına yönlendirir ve false döner. */
export function useRequireLogin() {
  const me = useMe();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  return useCallback(
    (what: string) => {
      if (me) return me;
      toast("info", `${what} için giriş yap ya da kayıt ol.`);
      navigate(`/giris?next=${encodeURIComponent(pathname + search)}`);
      return null;
    },
    [me, toast, navigate, pathname, search]
  );
}
