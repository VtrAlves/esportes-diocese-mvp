import { ActionError } from "@/lib/actions";
import { judgeRoute } from "@/lib/api";
import { getAdminClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return judgeRoute(async () => {
    const { id } = await ctx.params;
    const { name } = (await req.json()) as { name?: string };
    const clean = name?.trim();
    if (!clean || clean.length > 60) throw new ActionError("Nome inválido");
    const db = getAdminClient();
    const res = await db.from("teams").update({ name: clean }).eq("id", id).select("*").single();
    if (res.error) throw res.error;
    return { team: res.data };
  });
}
