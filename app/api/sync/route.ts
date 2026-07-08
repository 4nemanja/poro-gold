import { NextResponse } from "next/server";
import { syncGameboost } from "@/lib/gameboostSync";
import { syncPlayerok, playerokEnv } from "@/lib/playerokSync";

// Runs the PULL-based marketplace syncs (GameBoost always; PlayerOK if its
// session is configured). G2G and iGV are PUSH-based — they arrive via the
// /api/webhooks/* endpoints, so they're not part of this refresh.
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const report = await syncGameboost();
    // PlayerOK is best-effort: never let it fail the whole refresh.
    let playerok: { orders: number } | { error: string } | null = null;
    if (playerokEnv()) {
      try {
        playerok = await syncPlayerok();
      } catch (e) {
        playerok = { error: e instanceof Error ? e.message : "PlayerOK sync failed" };
      }
    }
    return NextResponse.json({ ok: true, report, playerok });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
