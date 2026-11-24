import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { getProfile } from "./api";
import type { Profile } from "./types";

type Auth =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; retry: () => void }
  | { status: "signed-in"; session: Session; profile: Profile; refresh: () => Promise<void> };

const Ctx = createContext<Auth>({ status: "loading" });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth>({ status: "loading" });
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const userId = session?.user.id;

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async (silent = false) => {
    if (session === undefined) return;
    if (!session) return setAuth({ status: "signed-out" });
    if (!silent) setAuth({ status: "loading" });
    try {
      const profile = await getProfile(session.user.id);
      if (!profile) { await supabase.auth.signOut(); return; } // hesabı silinmiş
      setAuth({ status: "signed-in", session, profile, refresh: () => load(true) });
    } catch {
      setAuth({ status: "error", retry: () => void load() });
    }
    // token yenilemesinde profili yeniden çekme: sadece kullanıcı değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, session === null, session === undefined]);

  useEffect(() => { void load(); }, [load]);

  return <Ctx.Provider value={auth}>{children}</Ctx.Provider>;
}

export const signOut = () => supabase.auth.signOut();
