import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { useMe } from "./auth";
import { canWrite } from "./types";
import { useToast } from "../components/Toast";

/**
 * Beğenme, kaydetme, takip gibi işlemlerden önce çağrılır: yalnızca admin onaylı üyeler yapabilir.
 * Giriş yoksa giriş sayfasına yönlendirir; hesap onay bekliyorsa bilgi verir. İkisinde de null döner.
 */
export function useRequireMember() {
  const me = useMe();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  return useCallback(
    (what: string) => {
      if (me && canWrite(me.role)) return me;
      if (me) { toast("info", `${what} için hesabının yönetim onayı bekleniyor.`); return null; }
      toast("info", `${what} için giriş yap ya da kayıt ol.`);
      navigate(`/giris?next=${encodeURIComponent(pathname + search)}`);
      return null;
    },
    [me, toast, navigate, pathname, search]
  );
}
