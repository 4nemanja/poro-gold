import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { setGiftExtra } from "@/lib/data";

export const dynamic = "force-dynamic";
const VALID = ["in_progress", "completed", "refunded"];

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function parse(body: Record<string, unknown>) {
  const date = String(body.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Enter a valid date (YYYY-MM-DD)." };
  const vbucks = Number(body.vbucks);
  if (Number.isNaN(vbucks) || vbucks < 0) return { error: "Enter the V-Bucks amount." };
  const status = String(body.status ?? "in_progress").toLowerCase();
  if (!VALID.includes(status)) return { error: "Invalid status." };
  const sold = body.sold_for === "" || body.sold_for == null ? null : Number(body.sold_for);
  if (sold != null && Number.isNaN(sold)) return { error: "Sold-for must be a number." };
  const cost = body.cost === "" || body.cost == null ? null : Number(body.cost);
  if (cost != null && Number.isNaN(cost)) return { error: "Cost must be a number." };
  const feePct = body.fee_pct === "" || body.fee_pct == null ? null : Number(body.fee_pct);
  if (feePct != null && (Number.isNaN(feePct) || feePct < 0 || feePct > 100)) return { error: "Fee % must be between 0 and 100." };
  return {
    fields: { date, customer: String(body.customer ?? "").trim() || null, vbucks, sold_for: sold, cost, status },
    feePct,
  };
}

export async function POST(req: Request) {
  try {
    const p = parse(await req.json());
    if ("error" in p) return bad(p.error as string);
    const order = { id: `GIFT-${Date.now().toString(36).toUpperCase()}`, added_at: new Date().toISOString(), ...p.fields };
    const { error } = await db().from("gift_orders").insert(order);
    if (error) throw new Error(error.message);
    await setGiftExtra(order.id, p.feePct ?? null);
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return bad("Missing id.");
    const p = parse(body);
    if ("error" in p) return bad(p.error as string);
    const { data, error } = await db().from("gift_orders").update(p.fields).eq("id", id).select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return bad("Gift not found.", 404);
    await setGiftExtra(id, p.feePct ?? null);
    return NextResponse.json({ ok: true, order: data[0] });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("Missing id.");
    const { data, error } = await db().from("gift_orders").delete().eq("id", id).select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return bad("Gift not found.", 404);
    await setGiftExtra(id, null);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed", 500);
  }
}
