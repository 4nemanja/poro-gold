import { NextResponse } from "next/server";
import { setPlatformFee, resolveWorkspace, type FeeKind } from "@/lib/data";

// Editable per-platform fees (%). `kind` selects which fee: "withdrawal" (cashing
// out) or "selling" (marketplace cut on each sale). Stored in app_config.
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const ws = await resolveWorkspace(String(body.workspace ?? ""));
    if (!ws) return NextResponse.json({ ok: false, error: "Unknown platform." }, { status: 400 });
    const kind = String(body.kind ?? "") as FeeKind;
    if (kind !== "withdrawal" && kind !== "selling")
      return NextResponse.json({ ok: false, error: "kind must be withdrawal or selling." }, { status: 400 });
    const pct = Number(body.pct);
    if (Number.isNaN(pct) || pct < 0 || pct > 100)
      return NextResponse.json({ ok: false, error: "Fee must be between 0 and 100." }, { status: 400 });
    await setPlatformFee(kind, ws.slug, Math.round(pct * 100) / 100);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
