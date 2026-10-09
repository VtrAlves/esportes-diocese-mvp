import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Chave pública VAPID lida em tempo de execução (não depende de rebuild). */
export function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null;
  return NextResponse.json({ key }, { headers: { "Cache-Control": "no-store" } });
}
