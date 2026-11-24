import { useEffect, useState } from "react";
import { useAsync } from "./useAsync";

export const PAGE_SIZE = 20;

/**
 * "Daha fazla göster" ile büyüyen liste. Filtre (deps) değişince başa döner.
 * Daha fazlası istenince ekrandaki liste korunur, sessizce genişletilir.
 */
export function usePaged<T>(load: (limit: number) => Promise<T[]>, deps: unknown[]) {
  const key = JSON.stringify(deps);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loadedKey, setLoadedKey] = useState(key);
  let current = limit;
  if (key !== loadedKey) { setLoadedKey(key); setLimit(PAGE_SIZE); current = PAGE_SIZE; } // filtre değişti: ilk sayfa

  const [state, retry, , refresh] = useAsync(() => load(current), [key]);
  const [moreBusy, setMoreBusy] = useState(false);
  useEffect(() => setMoreBusy(false), [state]);

  const more = () => { setMoreBusy(true); setLimit((l) => l + PAGE_SIZE); refresh(); };
  const hasMore = state.status === "success" && state.data.length >= current;
  return { state, retry, more, hasMore, moreBusy };
}
