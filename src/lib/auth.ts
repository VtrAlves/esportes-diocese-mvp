// Sessão do juiz: cookie "exp.assinatura" com HMAC-SHA256 (Web Crypto: funciona no middleware e no Node).
export const JUIZ_COOKIE = "juiz_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24;

const encoder = new TextEncoder();

function secret(): string {
  const s = process.env.JUIZ_SESSION_SECRET || process.env.JUIZ_PASSWORD;
  if (!s) throw new Error("JUIZ_SESSION_SECRET não configurado.");
  return s;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.JUIZ_PASSWORD;
  if (!expected) return false;
  return safeEqual(await hmac(`pw:${input}`), await hmac(`pw:${expected}`));
}

export async function createSessionToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${exp}.${await hmac(`session:${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  try {
    return safeEqual(sig, await hmac(`session:${exp}`));
  } catch {
    return false;
  }
}
