import { ActionError, applyAction, type MatchAction } from "@/lib/actions";
import { judgeRoute } from "@/lib/api";
import { getAdminClient } from "@/lib/supabase/server";
import { syncBracket } from "@/lib/sync";
import type { Match } from "@/lib/types";

const ACTIONS = new Set(["point", "start", "pause", "timeup", "finish", "walkover", "reopen", "reset"]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return judgeRoute(async () => {
    const { id } = await ctx.params;
    const action = (await req.json()) as MatchAction;
    if (!ACTIONS.has(action?.type)) throw new ActionError("Ação inválida");
    if (action.type === "point" && (!["home", "away"].includes(action.side) || ![1, -1].includes(action.delta))) {
      throw new ActionError("Ponto inválido");
    }
    if (action.type === "walkover" && !["home", "away"].includes(action.side)) throw new ActionError("W.O. inválido");
    if (action.type === "finish" && action.outcome !== undefined && !["home", "away", "draw"].includes(action.outcome)) {
      throw new ActionError("Resultado inválido");
    }

    const db = getAdminClient();
    const { data: current, error } = await db.from("matches").select("*").eq("id", id).single();
    if (error || !current) throw new ActionError("Partida não encontrada");

    const patch = applyAction(current as Match, action, Date.now());
    let match = current as Match;
    if (Object.keys(patch).length > 0) {
      const res = await db.from("matches").update(patch).eq("id", id).select("*").single();
      if (res.error) throw res.error;
      match = res.data as Match;
    }

    const wasFinished = current.status === "finished";
    const changedResult = action.type === "finish" || action.type === "walkover" || ((action.type === "reopen" || action.type === "reset") && wasFinished);
    if (changedResult) await syncBracket(db);
    return { match };
  });
}
