import { NextResponse } from "next/server";
import { igvEnv, handleIgvEvent } from "@/lib/igvWebhook";

// Public endpoint iGV POSTs seller callbacks to. Register this URL in your iGV
// seller settings; set IGV_WEBHOOK_SECRET to the secret key iGV assigns you.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const env = igvEnv();
  if (!env) {
    return NextResponse.json(
      { ok: false, error: "iGV webhook not configured (set IGV_WEBHOOK_SECRET)." },
      { status: 503 },
    );
  }
  const timestamp = req.headers.get("x-timestamp") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const signature = req.headers.get("x-signature") ?? "";
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  // Log the raw callback so the exact field mapping can be finalized from a real sample.
  console.log("[igv-webhook] payload:", JSON.stringify(body));
  try {
    const res = await handleIgvEvent(env, { timestamp, requestId, signature }, body);
    return NextResponse.json({ ok: res.ok, note: res.note }, { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: true, endpoint: "igv-webhook", configured: !!igvEnv() });
}
