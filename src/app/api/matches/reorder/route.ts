import { ActionError } from "@/lib/actions";
import { judgeRoute } from "@/lib/api";
import { getAdminClient } from "@/lib/supabase/server";

/** Recebe a lista completa de ids na nova ordem. */
export async function POST(req: Request) {
  return judgeRoute(async () => {
    const { ids } = (await req.json()) as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) throw new ActionError("Lista de partidas inválida");
    const db = getAdminClient();
    const results = await Promise.all(
      ids.map((id, i) => db.from("matches").update({ order_index: i + 1 }).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  });
}
