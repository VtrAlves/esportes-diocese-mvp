"use client";
import { useEffect, useState } from "react";

let offsetPromise: Promise<number> | null = null;

/** Diferença entre o relógio do servidor e o do aparelho, para cronômetros sincronizados. */
function getOffset(): Promise<number> {
  if (!offsetPromise) {
    offsetPromise = (async () => {
      try {
        const t0 = Date.now();
        const res = await fetch("/api/time", { cache: "no-store" });
        const t1 = Date.now();
        const { now } = (await res.json()) as { now: number };
        return now - (t0 + t1) / 2;
      } catch {
        offsetPromise = null;
        return 0;
      }
    })();
  }
  return offsetPromise;
}

/** "Agora" no relógio do servidor, atualizado periodicamente enquanto `active`. */
export function useServerNow(active: boolean, intervalMs = 250): number {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    getOffset().then(setOffset);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return now + offset;
}
