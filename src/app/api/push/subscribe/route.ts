import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/server";

interface Body {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  teamId?: string;
}

export async function POST(req: Request) {
  const { subscription, teamId } = (await req.json().catch(() => ({}))) as Body;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint?.startsWith("https://") || !p256dh || !auth || !teamId) {
    return NextResponse.json({ error: "Inscrição inválida" }, { status: 400 });
  }
  const db = getAdminClient();
  const { error } = await db
    .from("push_subscriptions")
    .upsert({ endpoint, p256dh, auth, team_id: teamId }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
