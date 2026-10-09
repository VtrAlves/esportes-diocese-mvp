import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "endpoint obrigatório" }, { status: 400 });
  await getAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
