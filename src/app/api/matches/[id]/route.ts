import { ActionError } from "@/lib/actions";
import { judgeRoute } from "@/lib/api";
import { getAdminClient } from "@/lib/supabase/server";
import { syncBracket } from "@/lib/sync";
import type { Match } from "@/lib/types";

type Editable = Partial<
  Pick<Match, "target_points" | "duration_seconds" | "home_team_id" | "away_team_id" | "home_score" | "away_score" | "teams_locked">
> & { remaining_seconds?: number };

const INT_FIELDS = ["target_points", "duration_seconds", "home_score", "away_score"] as const;

/** Edição livre de uma partida pelo juiz (pontos, tempo, times, placar). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return judgeRoute(async () => {
    const { id } = await ctx.params;
    const body = (await req.json()) as Editable;
    const db = getAdminClient();
    const { data: current, error } = await db.from("matches").select("*").eq("id", id).single();
    if (error || !current) throw new ActionError("Partida não encontrada");
    const m = current as Match;

    const patch: Record<string, unknown> = {};
    for (const f of INT_FIELDS) {
      if (body[f] === undefined) continue;
      const v = Number(body[f]);
      const min = f === "target_points" || f === "duration_seconds" ? 1 : 0;
      if (!Number.isInteger(v) || v < min) throw new ActionError(`Valor inválido para ${f}`);
      if (v !== m[f]) patch[f] = v;
    }
    for (const f of ["home_team_id", "away_team_id"] as const) {
      if (body[f] !== undefined) patch[f] = body[f] || null;
    }
    const teamsChanged = "home_team_id" in patch || "away_team_id" in patch;
    if (typeof body.teams_locked === "boolean") patch.teams_locked = body.teams_locked;
    else if (teamsChanged && m.phase !== "group") patch.teams_locked = true;

    // Ajuste do cronômetro: define o tempo restante (o cronômetro continua rodando se estiver ao vivo).
    if (body.remaining_seconds !== undefined) {
      const duration = (patch.duration_seconds as number | undefined) ?? m.duration_seconds;
      const remaining = Number(body.remaining_seconds);
      if (!Number.isInteger(remaining) || remaining < 0) throw new ActionError("Tempo restante inválido");
      if (remaining > duration) throw new ActionError("O tempo restante não pode ser maior que o tempo total.");
      patch.elapsed_seconds = duration - remaining;
      if (m.status === "live") {
        if (remaining === 0) {
          patch.status = "paused";
          patch.timer_started_at = null;
        } else {
          patch.timer_started_at = new Date().toISOString();
        }
      }
      const homeScore = (patch.home_score as number | undefined) ?? m.home_score;
      const awayScore = (patch.away_score as number | undefined) ?? m.away_score;
      patch.golden_point = remaining === 0 && m.status !== "scheduled" && homeScore === awayScore;
    }

    if (Object.keys(patch).length === 0) return { match: m };
    const next = { ...m, ...patch } as Match;
    if (next.home_team_id && next.home_team_id === next.away_team_id) throw new ActionError("Um time não pode enfrentar ele mesmo.");

    // Corrigindo resultado de partida finalizada: recalcula o vencedor.
    const resultChanged =
      m.status === "finished" && (teamsChanged || "home_score" in patch || "away_score" in patch);
    if (resultChanged) {
      if (next.home_score === next.away_score) throw new ActionError("Resultado empatado: não há vencedor.");
      patch.winner_id = next.home_score > next.away_score ? next.home_team_id : next.away_team_id;
    }

    const res = await db.from("matches").update(patch).eq("id", id).select("*").single();
    if (res.error) throw res.error;
    if (resultChanged || (teamsChanged && m.phase === "group") || patch.teams_locked === false) await syncBracket(db);
    return { match: res.data };
  });
}
