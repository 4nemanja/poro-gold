import { NextResponse } from "next/server";
import { g2gEnv, handleG2GEvent } from "@/lib/g2gWebhook";

// Public endpoint G2G POSTs order events to. Register this URL (and a webhook
// secret) in your G2G OpenAPI settings. Signature is verified before any write.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const env = g2gEnv();
  if (!env) {
    return NextResponse.json(
      { ok: false, error: "G2G webhook not configured (set G2G_WEBHOOK_SECRET, G2G_USER_ID, G2G_WEBHOOK_URL)." },
      { status: 503 },
    );
  }
  const timestamp = req.headers.get("g2g-timestamp") ?? "";
  const signature = req.headers.get("g2g-signature") ?? "";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const res = await handleG2GEvent(env, { timestamp, signature }, body as never);
    return NextResponse.json({ ok: res.ok, note: res.note }, { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

// A GET makes it easy to eyeball that the endpoint is reachable in a browser.
export function GET() {
  return NextResponse.json({ ok: true, endpoint: "g2g-webhook", configured: !!g2gEnv() });
}
