import type { Match } from "./types";

/** Tempo decorrido (ms) calculado a partir do timestamp do servidor. */
export function elapsedMs(m: Pick<Match, "status" | "elapsed_seconds" | "timer_started_at">, now: number): number {
  let ms = m.elapsed_seconds * 1000;
  if (m.status === "live" && m.timer_started_at) {
    ms += Math.max(0, now - Date.parse(m.timer_started_at));
  }
  return ms;
}

export function remainingMs(
  m: Pick<Match, "status" | "elapsed_seconds" | "timer_started_at" | "duration_seconds">,
  now: number,
): number {
  return Math.max(0, m.duration_seconds * 1000 - elapsedMs(m, now));
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
