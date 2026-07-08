import { NextResponse } from "next/server";
import { setWithdrawalFee } from "@/lib/data";
import { getWorkspace } from "@/lib/workspaces";

// Editable per-platform withdrawal fee (%), stored in app_config. Single-user
// tool, same auth model as the rest of the app.
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const ws = getWorkspace(String(body.workspace ?? ""));
    if (!ws) return NextResponse.json({ ok: false, error: "Unknown platform." }, { status: 400 });
    const pct = Number(body.pct);
    if (Number.isNaN(pct) || pct < 0 || pct > 100)
      return NextResponse.json({ ok: false, error: "Fee must be between 0 and 100." }, { status: 400 });
    await setWithdrawalFee(ws.slug, Math.round(pct * 100) / 100);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
