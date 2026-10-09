import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Match, Team } from "../types";

/** Cliente com service role — usar apenas em rotas de servidor. */
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function loadAll(db: SupabaseClient): Promise<{ teams: Team[]; matches: Match[] }> {
  const [t, m] = await Promise.all([
    db.from("teams").select("*").order("name"),
    db.from("matches").select("*").order("order_index"),
  ]);
  if (t.error) throw t.error;
  if (m.error) throw m.error;
  return { teams: t.data as Team[], matches: m.data as Match[] };
}
