import type { Match } from "./types";

export function sortByOrder(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.order_index - b.order_index);
}

/** Partida em andamento: a primeira ao vivo, senão a primeira pausada. */
export function currentMatch(matches: Match[]): Match | null {
  const sorted = sortByOrder(matches);
  return sorted.find((m) => m.status === "live") ?? sorted.find((m) => m.status === "paused") ?? null;
}

export function upcomingMatches(matches: Match[]): Match[] {
  return sortByOrder(matches).filter((m) => m.status === "scheduled");
}

export function involves(m: Match, teamId: string): boolean {
  return m.home_team_id === teamId || m.away_team_id === teamId;
}

export type TeamQueueInfo =
  | { kind: "playing"; match: Match }
  | { kind: "waiting"; match: Match; gamesBefore: number }
  | { kind: "none" };

/**
 * Quantas partidas faltam antes do próximo jogo do time.
 * Conta todas as partidas não finalizadas que vêm antes na fila (inclui a que está em quadra).
 */
export function teamQueueInfo(matches: Match[], teamId: string): TeamQueueInfo {
  const current = currentMatch(matches);
  if (current && involves(current, teamId)) return { kind: "playing", match: current };
  const pending = sortByOrder(matches).filter((m) => m.status !== "finished");
  const idx = pending.findIndex((m) => m.status === "scheduled" && involves(m, teamId));
  if (idx === -1) return { kind: "none" };
  return { kind: "waiting", match: pending[idx], gamesBefore: idx };
}
