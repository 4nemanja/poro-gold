import { NextResponse } from "next/server";
import { setConfig } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const invested_usd = Number(body.invested_usd);
    if (Number.isNaN(invested_usd) || invested_usd < 0) {
      return NextResponse.json({ ok: false, error: "Enter a valid invested amount (USD)." }, { status: 400 });
    }
    const rsd_per_usd = Number(body.rsd_per_usd);
    const config = {
      invested_usd: Math.round(invested_usd * 100) / 100,
      note: String(body.note ?? "").trim(),
      rsd_per_usd: Number.isNaN(rsd_per_usd) || rsd_per_usd <= 0 ? 117 : rsd_per_usd,
    };
    await setConfig("investment", config);
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
