import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getWorkspace } from "@/lib/workspaces";

// Manually-added orders live in the shared `orders` table with source='manual'.
// Only manual rows can be edited/deleted (API/Excel rows are read-only).
export const dynamic = "force-dynamic";

const VALID_STATUS = ["completed", "in_delivery", "refunded", "cancelled"];

type Fields = Record<string, unknown>;

function parseFields(body: Record<string, unknown>): { ok: false; error: string } | { ok: true; fields: Fields } {
  const ws = getWorkspace(String(body.workspace ?? ""));
  if (!ws) return { ok: false, error: "Pick a valid website." };
  const product = String(body.product ?? "").trim();
  if (!product) return { ok: false, error: "Product is required." };
  const soldFor = Number(body.sold_for);
  if (Number.isNaN(soldFor) || soldFor < 0) return { ok: false, error: "Enter a valid sold-for amount." };
  const date = String(body.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Enter a valid date (YYYY-MM-DD)." };
  const status = String(body.status ?? "completed").toLowerCase();
  if (!VALID_STATUS.includes(status)) return { ok: false, error: "Invalid status." };
  const costRaw = body.cost;
  const cost = costRaw === "" || costRaw == null ? null : Number(costRaw);
  if (cost != null && Number.isNaN(cost)) return { ok: false, error: "Supplier cost must be a number." };
  return {
    ok: true,
    fields: {
      date,
      platform: ws.name,
      product,
      supplier: String(body.supplier ?? "").trim() || null,
      cost,
      sold_for: soldFor,
      profit: cost != null ? Math.round((soldFor - cost) * 100) / 100 : null,
      status,
      method: String(body.method ?? "").trim() || null,
      currency: String(body.currency ?? "USD").trim().toUpperCase() || "USD",
      workspace: ws.slug,
    },
  };
}

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    const parsed = parseFields(await req.json());
    if (!parsed.ok) return bad(parsed.error);
    const order = {
      order_id: `MAN-${Date.now().toString(36).toUpperCase()}`,
      supplier_paid: null,
      notes: null,
      source: "manual",
      added_at: new Date().toISOString(),
      ...parsed.fields,
    };
    const { error } = await db().from("orders").insert(order);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to add order", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.order_id ?? "");
    if (!id) return bad("Missing order id.");
    const parsed = parseFields(body);
    if (!parsed.ok) return bad(parsed.error);
    const { data, error } = await db()
      .from("orders")
      .update(parsed.fields)
      .eq("order_id", id)
      .eq("source", "manual")
      .select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return bad("Only manually-added orders can be edited.", 404);
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
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Failed to delete order", 500);
  }
}
