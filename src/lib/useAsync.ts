import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: T };

/** Bir sorguyu çalıştırır; yükleniyor / hata / başarı durumunu ve "tekrar dene" fonksiyonunu verir. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fn().then(
      (data) => alive && setState({ status: "success", data }),
      (error) => alive && setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) })
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return [state, retry, setState] as const;
}
