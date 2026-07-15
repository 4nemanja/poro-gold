import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { computeOrderProfit, setOrderExtra, getPlatformFees, resolveWorkspace, setRefundReason } from "@/lib/data";

// Manually-added orders live in the shared `orders` table with source='manual'.
// Only manual rows can be edited/deleted (API/Excel rows are read-only).
export const dynamic = "force-dynamic";

const VALID_STATUS = ["completed", "in_delivery", "refunded", "cancelled"];

type Fields = Record<string, unknown>;
type Extra = {
  fee_pct?: number;
  fee?: number;
  withdrawal_fee?: number;
  supplier_share_pct?: number;
  supplier_cut?: number;
  is_gift?: boolean;
  vbucks?: number;
};

// Checkbox/boolean values arrive as "on"/"true"/true depending on the client.
function truthy(v: unknown): boolean {
  return v === true || v === "true" || v === "on" || v === "1";
}

async function parseFields(body: Record<string, unknown>): Promise<{ ok: false; error: string } | { ok: true; fields: Fields; extra: Extra; refundReason: string; isRefund: boolean }> {
  const ws = await resolveWorkspace(String(body.workspace ?? ""));
  if (!ws) return { ok: false, error: "Pick a valid website." };
  const product = String(body.product ?? "").trim();
  if (!product) return { ok: false, error: "Product is required." };
  const soldFor = Number(body.sold_for);
  if (Number.isNaN(soldFor) || soldFor < 0) return { ok: false, error: "Enter a valid sold-for amount." };
  const date = String(body.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Enter a valid date (YYYY-MM-DD)." };
  const status = String(body.status ?? "completed").toLowerCase();
  if (!VALID_STATUS.includes(status)) return { ok: false, error: "Invalid status." };
  // A refund must have a reason. It's only sent (and required) when refunded;
  // for other statuses we leave any previously saved reason untouched.
  const refundReason = String(body.refund_reason ?? "").trim();
  if (status === "refunded" && !refundReason) return { ok: false, error: "Please enter a refund reason." };
  const costRaw = body.cost;
  const cost = costRaw === "" || costRaw == null ? null : Number(costRaw);
  if (cost != null && Number.isNaN(cost)) return { ok: false, error: "Supplier cost must be a number." };
  // Fee is entered as a PERCENT of the sale price.
  const feeRaw = body.fee_pct;
  const feePct = feeRaw === "" || feeRaw == null ? null : Number(feeRaw);
  if (feePct != null && (Number.isNaN(feePct) || feePct < 0 || feePct > 100))
    return { ok: false, error: "Fee % must be between 0 and 100." };
  const feeAmount = feePct != null ? Math.round(soldFor * (feePct / 100) * 100) / 100 : null;
  const shareRaw = body.supplier_share_pct;
  const sharePct = shareRaw === "" || shareRaw == null ? null : Number(shareRaw);
  if (sharePct != null && (Number.isNaN(sharePct) || sharePct < 0 || sharePct > 100))
    return { ok: false, error: "Supplier profit share must be between 0 and 100." };

  // The platform's withdrawal fee (what it costs to cash out) is a real cost and
  // comes off BEFORE any supplier profit-split, so a splitting supplier shares it.
  const wdPct = (await getPlatformFees("withdrawal"))[ws.slug] ?? 0;
  const withdrawalAmount = wdPct > 0 ? Math.round(soldFor * (wdPct / 100) * 100) / 100 : 0;

  // Profit is net of both fees and any supplier profit-split. It's the authoritative
  // money figure and lives in the real `profit` column; fee %/amount/share/cut are
  // kept as annotations (app_config) via `extra`.
  const { supplierCut, profit } = computeOrderProfit(soldFor, cost, feeAmount, withdrawalAmount, sharePct);
  return {
    ok: true,
    fields: {
      date,
      platform: ws.name,
      product,
      supplier: String(body.supplier ?? "").trim() || null,
      cost,
      sold_for: soldFor,
      profit: cost != null || feePct != null || withdrawalAmount > 0 ? profit : null,
      status,
      method: String(body.method ?? "").trim() || null,
      currency: String(body.currency ?? "USD").trim().toUpperCase() || "USD",
      workspace: ws.slug,
    },
    extra: {
      fee_pct: feePct ?? undefined,
      fee: feeAmount ?? undefined,
      withdrawal_fee: withdrawalAmount || undefined,
      supplier_share_pct: sharePct ?? undefined,
      supplier_cut: supplierCut || undefined,
      is_gift: truthy(body.is_gift) || undefined,
      vbucks: truthy(body.is_gift) && Number(body.vbucks) > 0 ? Number(body.vbucks) : undefined,
    },
    refundReason,
    isRefund: status === "refunded",
  };
}

// Save/clear the refund reason. Only written when the order is refunded; for any
// other status the previously saved reason is left untouched (not deleted).
async function persistRefundReason(orderId: string, parsed: { refundReason: string; isRefund: boolean }): Promise<void> {
  if (parsed.isRefund) await setRefundReason(orderId, parsed.refundReason);
}

// Bug #1: let a PlayerOK (or any) order be identified by the buyer's name instead
// of a random MAN-xxxx id. Sanitize, then make it unique so two orders from the
// same buyer don't collide on the primary key.
async function uniqueOrderId(raw: string): Promise<string> {
  const base = raw.trim().replace(/\s+/g, " ").slice(0, 60);
  const { data } = await db().from("orders").select("order_id").ilike("order_id", `${base}%`);
  const taken = new Set((data ?? []).map((r) => String(r.order_id).toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 500; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = await parseFields(body);
    if (!parsed.ok) return bad(parsed.error);
    // Use the buyer's name as the order id when given, otherwise a random one.
    const custom = String(body.custom_id ?? "").trim();
    const orderId = custom ? await uniqueOrderId(custom) : `MAN-${Date.now().toString(36).toUpperCase()}`;
    const order = {
      order_id: orderId,
      supplier_paid: null,
      notes: null,
      source: "manual",
      added_at: new Date().toISOString(),
      ...parsed.fields,
    };
    const { error } = await db().from("orders").insert(order);
    if (error) throw new Error(error.message);
    await setOrderExtra(order.order_id, parsed.extra);
    await persistRefundReason(order.order_id, parsed);
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
    const parsed = await parseFields(body);
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
