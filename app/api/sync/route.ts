import { NextResponse } from "next/server";
import { syncGameboost } from "@/lib/gameboostSync";

// Local single-user tool: this endpoint is unauthenticated, same as the rest of
// the app. It only reads from GameBoost and writes the local orders JSON - no
// destructive action. Lock it down before this is ever exposed to the internet.
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const report = await syncGameboost();
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
