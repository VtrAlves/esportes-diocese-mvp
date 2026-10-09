import { decidedWinnerSide } from "./rules";
import { elapsedMs } from "./timer";
import type { Match } from "./types";

export type MatchAction =
  | { type: "point"; side: "home" | "away"; delta: 1 | -1 }
  | { type: "start" }
  | { type: "pause" }
  | { type: "timeup" }
  /** `outcome` só é usado com placar empatado: vencedor escolhido pelo juiz ou empate (só na fase de grupos). */
  | { type: "finish"; outcome?: TieOutcome }
  | { type: "walkover"; side: "home" | "away" }
  | { type: "reopen" }
  | { type: "reset" };

export type MatchPatch = Partial<
  Pick<
    Match,
    | "status"
    | "home_score"
    | "away_score"
    | "elapsed_seconds"
    | "timer_started_at"
    | "golden_point"
    | "walkover"
    | "winner_id"
    | "finished_at"
  >
>;

export type TieOutcome = "home" | "away" | "draw";

export class ActionError extends Error {}

/** Vencedor de uma partida encerrada (null = empate). Valida as regras de empate. */
export function resolveWinner(m: Pick<Match, "phase" | "home_score" | "away_score" | "home_team_id" | "away_team_id">, outcome?: TieOutcome): string | null {
  if (m.home_score > m.away_score) return m.home_team_id;
  if (m.away_score > m.home_score) return m.away_team_id;
  if (!outcome) throw new ActionError("Placar empatado: escolha o vencedor ou encerre como empate.");
  if (outcome === "draw") {
    if (m.phase !== "group") throw new ActionError("No mata-mata não há empate: defina o vencedor.");
    return null;
  }
  return outcome === "home" ? m.home_team_id : m.away_team_id;
}

function stopTimer(m: Match, now: number): MatchPatch {
  return {
    elapsed_seconds: Math.min(m.duration_seconds, Math.round(elapsedMs(m, now) / 1000)),
    timer_started_at: null,
  };
}

/** Aplica uma ação do juiz e devolve as colunas a atualizar. Função pura. */
export function applyAction(m: Match, action: MatchAction, now: number): MatchPatch {
  const nowIso = new Date(now).toISOString();
  switch (action.type) {
    case "point": {
      if (m.status === "finished") throw new ActionError("Partida já finalizada. Reabra para corrigir.");
      const key = action.side === "home" ? "home_score" : "away_score";
      const next = Math.max(0, m[key] + action.delta);
      const patch: MatchPatch = { [key]: next };
      const after = { ...m, ...patch };
      // Partida decidida: para o cronômetro e aguarda confirmação do juiz.
      if (decidedWinnerSide(after, false) && m.status === "live") {
        Object.assign(patch, stopTimer(m, now), { status: "paused" });
      }
      return patch;
    }
    case "start": {
      if (m.status === "finished") throw new ActionError("Partida já finalizada.");
      if (!m.home_team_id || !m.away_team_id) throw new ActionError("Defina os dois times antes de iniciar.");
      if (m.status === "live") return {};
      if (m.elapsed_seconds >= m.duration_seconds) return { status: "paused" };
      return { status: "live", timer_started_at: nowIso };
    }
    case "pause": {
      if (m.status !== "live") return {};
      return { status: "paused", ...stopTimer(m, now) };
    }
    case "timeup": {
      if (m.status === "finished") return {};
      return {
        status: "paused",
        elapsed_seconds: m.duration_seconds,
        timer_started_at: null,
        golden_point: m.home_score === m.away_score,
      };
    }
    case "finish": {
      if (m.status === "finished") return {};
      return {
        status: "finished",
        winner_id: resolveWinner(m, action.outcome),
        finished_at: nowIso,
        golden_point: false,
        ...(m.status === "live" ? stopTimer(m, now) : {}),
      };
    }
    case "walkover": {
      if (!m.home_team_id || !m.away_team_id) throw new ActionError("Defina os dois times antes de dar W.O.");
      const home = action.side === "home";
      return {
        status: "finished",
        home_score: home ? m.target_points : 0,
        away_score: home ? 0 : m.target_points,
        winner_id: home ? m.home_team_id : m.away_team_id,
        finished_at: nowIso,
        walkover: true,
        golden_point: false,
        ...(m.status === "live" ? stopTimer(m, now) : {}),
      };
    }
    case "reopen": {
      if (m.status !== "finished") return {};
      // Reabrir um W.O. volta o jogo ao zero (o placar do W.O. não foi disputado).
      if (m.walkover) return applyAction(m, { type: "reset" }, now);
      return { status: "paused", winner_id: null, finished_at: null };
    }
    case "reset": {
      return {
        status: "scheduled",
        home_score: 0,
        away_score: 0,
        elapsed_seconds: 0,
        timer_started_at: null,
        golden_point: false,
        walkover: false,
        winner_id: null,
        finished_at: null,
      };
    }
  }
}
