import { NextRequest, NextResponse } from "next/server";
import { verify, COOKIE } from "@/lib/auth";

// Protects every route. Unauthenticated users are redirected to /login (pages)
// or get 401 (API). /login and the auth endpoints are always public.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Marketplace webhooks (G2G, iGV) are called by external services with no
  // session cookie — they authenticate via their own HMAC signature, verified
  // inside each route handler. They must bypass the app's cookie auth.
  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }

  const user = verify(req.cookies.get(COOKIE)?.value);
  if (user) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
