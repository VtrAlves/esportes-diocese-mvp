import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBracketUpdates } from "./bracket";
import { loadAll } from "./supabase/server";

/** Recalcula o mata-mata e grava as vagas alteradas. Retorna os dados atualizados. */
export async function syncBracket(db: SupabaseClient) {
  const data = await loadAll(db);
  const updates = computeBracketUpdates(data.teams, data.matches, data.tiebreaks);
  for (const u of updates) {
    const { error } = await db
      .from("matches")
      .update({ home_team_id: u.home_team_id, away_team_id: u.away_team_id })
      .eq("id", u.id);
    if (error) throw error;
    const m = data.matches.find((x) => x.id === u.id);
    if (m) Object.assign(m, u);
  }
  return data;
}
