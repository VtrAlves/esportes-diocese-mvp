import { NextResponse } from "next/server";
import { checkPassword, createSessionToken, JUIZ_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !(await checkPassword(password))) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(JUIZ_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
