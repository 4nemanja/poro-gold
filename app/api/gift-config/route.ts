import { NextResponse } from "next/server";
import { setConfig } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const invested_usd = Number(body.invested_usd);
    const vbucks_stock = Number(body.vbucks_stock);
    if (Number.isNaN(invested_usd) || invested_usd < 0) {
      return NextResponse.json({ ok: false, error: "Enter a valid invested amount." }, { status: 400 });
    }
    if (Number.isNaN(vbucks_stock) || vbucks_stock < 0) {
      return NextResponse.json({ ok: false, error: "Enter a valid V-Bucks stock." }, { status: 400 });
    }
    const config = {
      invested_usd: Math.round(invested_usd * 100) / 100,
      vbucks_stock: Math.round(vbucks_stock),
      note: String(body.note ?? "").trim(),
    };
    await setConfig("gift_config", config);
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
