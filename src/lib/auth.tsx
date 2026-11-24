import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import { getProfile } from "./api/people";
import type { Profile } from "./types";

export type Auth =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; retry: () => void }
  | { status: "signed-in"; profile: Profile; refresh: () => Promise<void> };

const Ctx = createContext<Auth>({ status: "loading" });
export const useAuth = () => useContext(Ctx);

/** Giriş yapmış kullanıcının profili ya da null. */
export const useMe = () => {
  const a = useAuth();
  return a.status === "signed-in" ? a.profile : null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth>({ status: "loading" });
  // undefined: henüz bilinmiyor, null: oturum yok. Token yenilemesi kimliği değiştirmez, profil yeniden çekilmez.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async (silent = false) => {
    if (userId === undefined) return;
    if (userId === null) return setAuth({ status: "signed-out" });
    if (!silent) setAuth({ status: "loading" });
    try {
      const profile = await getProfile(userId);
      if (!profile) { await supabase.auth.signOut(); return; } // hesap silinmiş
      setAuth({ status: "signed-in", profile, refresh: () => load(true) });
    } catch {
      setAuth({ status: "error", retry: () => void load() });
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  return <Ctx.Provider value={auth}>{children}</Ctx.Provider>;
}

export const signOut = () => supabase.auth.signOut();
