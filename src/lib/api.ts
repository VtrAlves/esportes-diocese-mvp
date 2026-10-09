import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ActionError } from "./actions";
import { JUIZ_COOKIE, verifySessionToken } from "./auth";

export async function isJudge(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(JUIZ_COOKIE)?.value);
}

/** Envolve um handler exigindo sessão de juiz e convertendo erros em JSON. */
export async function judgeRoute(fn: () => Promise<unknown>): Promise<NextResponse> {
  if (!(await isJudge())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    return NextResponse.json((await fn()) ?? { ok: true });
  } catch (e) {
    const status = e instanceof ActionError ? 400 : 500;
    const message = e instanceof Error ? e.message : "Erro inesperado";
    if (status === 500) console.error(e);
    return NextResponse.json({ error: message }, { status });
  }
}
