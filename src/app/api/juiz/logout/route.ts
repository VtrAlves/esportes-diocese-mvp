import { NextResponse } from "next/server";
import { JUIZ_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(JUIZ_COOKIE);
  return res;
}
