import { NextResponse } from "next/server";
import { checkCredentials, sign, COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!checkCredentials(String(email ?? ""), String(password ?? ""))) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sign(String(email)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
