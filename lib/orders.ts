import { db } from "./supabase";
import { computeOrderProfit, setOrderExtra, getPlatformFees, resolveWorkspace, setRefundReason } from "./data";

// Single source of truth for CREATING a manual order. Both the dashboard's
// "Add Order" form (POST /api/orders) and the Discord bot (POST
// /api/webhooks/discord) go through here, so an order entered from Discord is
// byte-for-byte identical to one typed into the dashboard: same validation,
// same withdrawal-fee lookup, same profit math, same rows written.

export const VALID_STATUS = ["completed", "in_delivery", "refunded", "cancelled"];

export type OrderFields = Record<string, unknown>;
export type OrderExtra = {
  fee_pct?: number;
  fee?: number;
  withdrawal_fee?: number;
  supplier_share_pct?: number;
  supplier_cut?: number;
};

export type ParsedOrder = {
  fields: OrderFields;
  extra: OrderExtra;
  refundReason: string;
  isRefund: boolean;
};

// Validate + normalize an incoming order body into the DB fields, the app_config
// annotations (extra), and the refund reason. Shared by create (POST) and edit
// (PUT) so both apply identical rules and calculations.
export async function parseOrderFields(
  body: Record<string, unknown>,
): Promise<{ ok: false; error: string } | ({ ok: true } & ParsedOrder)> {
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
  // Fees COMPOUND, they don't add: the marketplace selling fee comes off the sale
  // price first, then the platform withdrawal fee applies to what's LEFT — not to
  // the full sale price. So net = sold_for * (1 - feePct/100) * (1 - wdPct/100),
  // never sold_for * (1 - feePct/100 - wdPct/100). Keep full precision here and
  // round only the stored cents, so the profit matches the exact compounded value.
  const feeExact = feePct != null ? soldFor * (feePct / 100) : 0;
  const feeAmount = feePct != null ? Math.round(feeExact * 100) / 100 : null;
  const shareRaw = body.supplier_share_pct;
  const sharePct = shareRaw === "" || shareRaw == null ? null : Number(shareRaw);
  if (sharePct != null && (Number.isNaN(sharePct) || sharePct < 0 || sharePct > 100))
    return { ok: false, error: "Supplier profit share must be between 0 and 100." };

  // The platform's withdrawal fee (what it costs to cash out) is a real cost and
  // comes off BEFORE any supplier profit-split, so a splitting supplier shares it.
  // It applies to the amount remaining AFTER the selling fee.
  const wdPct = (await getPlatformFees("withdrawal"))[ws.slug] ?? 0;
  const withdrawalExact = wdPct > 0 ? (soldFor - feeExact) * (wdPct / 100) : 0;
  const withdrawalAmount = wdPct > 0 ? Math.round(withdrawalExact * 100) / 100 : 0;

  // Profit is net of both fees and any supplier profit-split. It's the authoritative
  // money figure and lives in the real `profit` column; fee %/amount/share/cut are
  // kept as annotations (app_config) via `extra`. Feed the UNROUNDED fee amounts so
  // the compounding math isn't skewed by intermediate cent-rounding.
  const feeForProfit = feePct != null ? feeExact : null;
  const { supplierCut, profit } = computeOrderProfit(soldFor, cost, feeForProfit, withdrawalExact, sharePct);
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
    },
    refundReason,
    isRefund: status === "refunded",
  };
}

// Save/clear the refund reason. Only written when the order is refunded; for any
// other status the previously saved reason is left untouched (not deleted).
export async function persistRefundReason(
  orderId: string,
  parsed: { refundReason: string; isRefund: boolean },
): Promise<void> {
  if (parsed.isRefund) await setRefundReason(orderId, parsed.refundReason);
}

// Bug #1: let a PlayerOK (or any) order be identified by the buyer's name instead
// of a random MAN-xxxx id. Sanitize, then make it unique so two orders from the
// same buyer don't collide on the primary key.
export async function uniqueOrderId(raw: string): Promise<string> {
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

// Create a manual order from an already-parsed body. Returns the inserted row.
// `custom_id` (the buyer name / order id) becomes the primary key when given,
// otherwise a random MAN-xxxx id is generated — exactly as the dashboard form does.
export async function createOrder(
  body: Record<string, unknown>,
): Promise<{ ok: false; error: string } | { ok: true; order: Record<string, unknown> }> {
  const parsed = await parseOrderFields(body);
  if (!parsed.ok) return { ok: false, error: parsed.error };
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
  return { ok: true, order };
}
