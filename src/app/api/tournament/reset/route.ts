import { judgeRoute } from "@/lib/api";
import { DEFAULT_ORDER, defaultRules } from "@/lib/rules";
import { getAdminClient, loadAll } from "@/lib/supabase/server";

const KNOCKOUT = ["qf", "sf", "third", "final"];

/** Zera placares, resultados e a chave. Opcionalmente restaura ordem e regras padrão. */
export async function POST(req: Request) {
  return judgeRoute(async () => {
    const { restoreDefaults } = (await req.json().catch(() => ({}))) as { restoreDefaults?: boolean };
    const db = getAdminClient();

    const cleared = await db
      .from("matches")
      .update({
        status: "scheduled",
        home_score: 0,
        away_score: 0,
        elapsed_seconds: 0,
        timer_started_at: null,
        golden_point: false,
        winner_id: null,
        finished_at: null,
      })
      .not("id", "is", null);
    if (cleared.error) throw cleared.error;

    const bracket = await db
      .from("matches")
      .update({ home_team_id: null, away_team_id: null, teams_locked: false })
      .in("phase", KNOCKOUT);
    if (bracket.error) throw bracket.error;

    if (restoreDefaults) {
      const { matches } = await loadAll(db);
      const results = await Promise.all(
        matches.map((m) => {
          const idx = DEFAULT_ORDER.indexOf(m.slot);
          return db
            .from("matches")
            .update({ ...defaultRules(m.phase, m.group_code), order_index: idx === -1 ? 100 + m.order_index : idx + 1 })
            .eq("id", m.id);
        }),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    }
  });
}
