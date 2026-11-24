import { useEffect, useRef } from "react";
import type { BlobSpec } from "../three/blobs";

/** three.js ayrı bir parçada yüklenir; sayfa onu beklemeden açılır. */
export function BlobCanvas({ family, className }: { family: "family" | "lost"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let dispose: (() => void) | undefined, cancelled = false;
    import("../three/blobs")
      .then((m) => {
        const specs: BlobSpec[] = family === "family" ? m.FAMILY : m.LOST;
        if (!cancelled && ref.current) dispose = m.mountBlobs(ref.current, specs);
      })
      .catch(() => { if (ref.current) ref.current.style.display = "none"; });
    return () => { cancelled = true; dispose?.(); };
  }, [family]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
