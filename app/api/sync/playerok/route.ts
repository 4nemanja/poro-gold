import { NextResponse } from "next/server";
import { syncPlayerok, playerokEnv } from "@/lib/playerokSync";

// On-demand PlayerOK sync (also runs as part of the main /api/sync Refresh).
// It paginates every deal, so a single call imports historical orders too.
export const dynamic = "force-dynamic";

export async function POST() {
  if (!playerokEnv()) {
    return NextResponse.json(
      { ok: false, error: "PlayerOK not configured. Set PLAYEROK_TOKEN, PLAYEROK_DDG5, PLAYEROK_USER_ID (see SETUP-INTEGRATIONS.md)." },
      { status: 503 },
    );
  }
  try {
    const report = await syncPlayerok();
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "PlayerOK sync failed" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: true, endpoint: "playerok-sync", configured: !!playerokEnv() });
}
