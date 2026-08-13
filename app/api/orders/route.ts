import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { setOrderExtra, setRefundReason } from "@/lib/data";
import { parseOrderFields, persistRefundReason, createOrder } from "@/lib/orders";

// Manually-added orders live in the shared `orders` table with source='manual'.
// Only manual rows can be edited/deleted (API/Excel rows are read-only).
//
// Creation/validation logic lives in lib/orders.ts so the Discord bot
// (/api/webhooks/discord) creates orders through the exact same code path.
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await createOrder(body);
    if (!res.ok) return bad(res.error);
    return NextResponse.json({ ok: true, order: res.order });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to add order", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.order_id ?? "");
    if (!id) return bad("Missing order id.");
    const parsed = await parseOrderFields(body);
    if (!parsed.ok) return bad(parsed.error);
    // Any order can be edited (e.g. adding supplier cost to a GameBoost order).
    // The GameBoost sync omits cost/supplier/profit, so those edits survive a refresh.
    const { data, error } = await db()
      .from("orders")
      .update(parsed.fields)
      .eq("order_id", id)
      .select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return bad("Order not found.", 404);
    await setOrderExtra(id, parsed.extra);
    await persistRefundReason(id, parsed);
    return NextResponse.json({ ok: true, order: data[0] });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to edit order", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("Missing order id.");
    const { data, error } = await db()
      .from("orders")
      .delete()
      .eq("order_id", id)
      .eq("source", "manual")
      .select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return bad("Only manually-added orders can be deleted.", 404);
    await setOrderExtra(id, null);
    await setRefundReason(id, null);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to delete order", 500);
  }
}
