import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useMe } from "./auth";
import { listFollowingIds, listSavedIds, setFollowing, setSaved } from "./api/social";

type Social = {
  /** Kaydedilenler ve takipler yüklendi mi (giriş yoksa hemen true). */
  ready: boolean;
  saved: Set<string>;
  following: Set<string>;
  /** İyimser güncelleme; hata olursa geri alır ve hatayı fırlatır. */
  toggleSave: (postId: string) => Promise<boolean>;
  toggleFollow: (authorId: string) => Promise<boolean>;
};

const empty = new Set<string>();
const Ctx = createContext<Social>({ ready: false, saved: empty, following: empty, toggleSave: async () => false, toggleFollow: async () => false });
export const useSocial = () => useContext(Ctx);

/** Giriş yapan kullanıcının kaydettikleri ve takip ettikleri; tüm sayfalarda tek kaynak. */
export function SocialProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const uid = me?.id;
  const [saved, setSavedIds] = useState<Set<string>>(empty);
  const [following, setFollowingIds] = useState<Set<string>>(empty);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    setSavedIds(empty);
    setFollowingIds(empty);
    if (!uid) return;
    let alive = true;
    Promise.all([listSavedIds(uid), listFollowingIds(uid)])
      .then(([s, f]) => { if (alive) { setSavedIds(new Set(s)); setFollowingIds(new Set(f)); } })
      .catch(() => {}) // sayfalar yine çalışır; düğmeler boş başlar
      .finally(() => alive && setLoadedFor(uid));
    return () => { alive = false; };
  }, [uid]);
  const ready = !uid || loadedFor === uid;

  const toggle = useCallback(
    async (set: Set<string>, update: (s: Set<string>) => void, id: string, write: (on: boolean) => Promise<void>) => {
      const on = !set.has(id);
      const next = new Set(set);
      if (on) next.add(id); else next.delete(id);
      update(next);
      try { await write(on); return on; } catch (e) { update(set); throw e; }
    },
    []
  );

  const toggleSave = useCallback(
    (postId: string) => (uid ? toggle(saved, setSavedIds, postId, (on) => setSaved(postId, uid, on)) : Promise.reject(new Error("login"))),
    [uid, saved, toggle]
  );
  const toggleFollow = useCallback(
    (authorId: string) => (uid ? toggle(following, setFollowingIds, authorId, (on) => setFollowing(authorId, uid, on)) : Promise.reject(new Error("login"))),
    [uid, following, toggle]
  );

  return <Ctx.Provider value={{ ready, saved, following, toggleSave, toggleFollow }}>{children}</Ctx.Provider>;
}
