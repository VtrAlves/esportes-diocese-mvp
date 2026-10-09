import { NextResponse, type NextRequest } from "next/server";
import { JUIZ_COOKIE, verifySessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/juiz/login")) return NextResponse.next();
  if (await verifySessionToken(req.cookies.get(JUIZ_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/juiz/login", req.url));
}

export const config = { matcher: ["/juiz", "/juiz/:path*"] };
