import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: T };

/**
 * Bir sorguyu çalıştırır; yükleniyor / hata / başarı durumunu verir.
 * retry: baştan yükler (iskelet görünür). refresh: ekrandakini koruyarak sessizce tazeler.
 * Yeni bir çalıştırma başlayınca öncekinin geç gelen yanıtı yok sayılır.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const silent = useRef(false);
  useEffect(() => {
    let alive = true;
    if (!silent.current) setState({ status: "loading" });
    silent.current = false;
    fn().then(
      (data) => alive && setState({ status: "success", data }),
      (error) => alive && setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) })
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const refresh = useCallback(() => { silent.current = true; setAttempt((n) => n + 1); }, []);
  return [state, retry, setState, refresh] as const;
}
