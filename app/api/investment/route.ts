import { NextResponse } from "next/server";
import { setConfig, getInvestment } from "@/lib/data";

// Investment settings. The invested total is now tracked as capital batches
// (see /api/investment/batches); this endpoint just keeps the RSD→USD rate and
// an optional note.
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const current = await getInvestment();
    const rsd_per_usd = Number(body.rsd_per_usd);
    const config = {
      invested_usd: current.invested_usd, // legacy; batches are the source of truth now
      note: body.note != null ? String(body.note).trim() : current.note,
      rsd_per_usd: Number.isNaN(rsd_per_usd) || rsd_per_usd <= 0 ? current.rsd_per_usd || 117 : rsd_per_usd,
    };
    await setConfig("investment", config);
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
