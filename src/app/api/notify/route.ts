import { judgeRoute } from "@/lib/api";
import { notifyUpcoming } from "@/lib/push";
import { getAdminClient, loadAll } from "@/lib/supabase/server";

export async function POST(req: Request) {
  return judgeRoute(async () => {
    const { matchId } = (await req.json().catch(() => ({}))) as { matchId?: string };
    const db = getAdminClient();
    const { teams, matches } = await loadAll(db);
    const sent = await notifyUpcoming(db, teams, matches, matchId);
    return { sent };
  });
}
