import { ActionError } from "@/lib/actions";
import { judgeRoute } from "@/lib/api";
import { GROUPS } from "@/lib/rules";
import { groupResultsKey, isGroupComplete } from "@/lib/standings";
import { getAdminClient, loadAll } from "@/lib/supabase/server";
import { syncBracket } from "@/lib/sync";
import type { GroupCode, TiebreakCriterion } from "@/lib/types";

const CRITERIA: TiebreakCriterion[] = ["saldo", "pro", "h2h", "sorteio"];

function parseGroup(code: string): GroupCode {
  const g = code.toUpperCase() as GroupCode;
  if (!GROUPS.includes(g)) throw new ActionError("Grupo inválido");
  return g;
}

/** Define a ordem final do grupo (critério escolhido pelo juiz ou sorteio). */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return judgeRoute(async () => {
    const group = parseGroup((await ctx.params).code);
    const { order, criterion } = (await req.json()) as { order?: string[]; criterion?: TiebreakCriterion };
    if (!criterion || !CRITERIA.includes(criterion)) throw new ActionError("Critério inválido");

    const db = getAdminClient();
    const { teams, matches } = await loadAll(db);
    if (!isGroupComplete(matches, group)) throw new ActionError("O grupo ainda tem jogos pendentes.");
    const groupIds = teams.filter((t) => t.group_code === group).map((t) => t.id);
    const valid = Array.isArray(order) && order.length === groupIds.length && groupIds.every((id) => order.includes(id));
    if (!valid) throw new ActionError("Ordem inválida para o grupo.");

    const { error } = await db.from("group_tiebreaks").upsert(
      { group_code: group, manual_order: order, criterion, results_key: groupResultsKey(matches, group), updated_at: new Date().toISOString() },
      { onConflict: "group_code" },
    );
    if (error) {
      if (/group_tiebreaks/.test(error.message)) throw new ActionError("Rode a migração 0003_group_tiebreaks.sql no Supabase.");
      throw error;
    }
    await syncBracket(db);
  });
}

/** Volta o grupo para os critérios automáticos. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return judgeRoute(async () => {
    const group = parseGroup((await ctx.params).code);
    const db = getAdminClient();
    const { error } = await db.from("group_tiebreaks").delete().eq("group_code", group);
    if (error) throw error;
    await syncBracket(db);
  });
}
