"use client";
import type { MatchAction } from "./actions";
import type { GroupCode, Match, TiebreakCriterion } from "./types";

let chain: Promise<unknown> = Promise.resolve();

/** Serializa as chamadas do juiz para não perder pontos em toques rápidos. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function call<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/juiz/login";
    throw new Error("Sessão expirada");
  }
  if (!res.ok) throw new Error(json.error ?? "Falha na requisição");
  return json as T;
}

export const judgeApi = {
  action: (id: string, action: MatchAction) =>
    enqueue(() => call<{ match: Match }>(`/api/matches/${id}/action`, "POST", action)),
  update: (id: string, patch: Partial<Match> & { remaining_seconds?: number; outcome?: "home" | "away" | "draw" }) =>
    enqueue(() => call<{ match: Match }>(`/api/matches/${id}`, "PATCH", patch)),
  reorder: (ids: string[]) => enqueue(() => call(`/api/matches/reorder`, "POST", { ids })),
  renameTeam: (id: string, name: string) => enqueue(() => call(`/api/teams/${id}`, "PATCH", { name })),
  resetTournament: (restoreDefaults: boolean) => enqueue(() => call(`/api/tournament/reset`, "POST", { restoreDefaults })),
  setTiebreak: (group: GroupCode, order: string[], criterion: TiebreakCriterion) =>
    enqueue(() => call(`/api/groups/${group}/tiebreak`, "POST", { order, criterion })),
  clearTiebreak: (group: GroupCode) => enqueue(() => call(`/api/groups/${group}/tiebreak`, "DELETE")),
  logout: () => call(`/api/juiz/logout`, "POST"),
};
