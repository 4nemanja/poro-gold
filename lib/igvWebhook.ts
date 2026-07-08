import type { Order } from "./types";
import { hmacSha256Hex, safeEqualHex, msToDate, cleanTitle, upsertExternalOrder } from "./marketplace";

// iGV pushes seller callbacks to our webhook. Docs:
//   https://docs.igv.com/seller/callback/signature-verification
//
// Signature: raw = X-Timestamp + X-Request-Id + secretKey
//            X-Signature == HMAC-SHA256(secretKey, raw) hex (case-insensitive)
//
// NOTE: iGV does not publish the callback body schema, so normalizeIgv reads a
// tolerant set of common field names. The route logs the raw body — once you
// share one real callback, we can pin the exact field mapping.

export type IgvEnv = { secret: string };

export function igvEnv(): IgvEnv | null {
  const secret = process.env.IGV_WEBHOOK_SECRET;
  if (!secret) return null;
  return { secret };
}

export function verifyIgvSignature(env: IgvEnv, timestamp: string, requestId: string, signature: string): boolean {
  if (!timestamp || !requestId || !signature) return false;
  const raw = timestamp + requestId + env.secret;
  return safeEqualHex(hmacSha256Hex(env.secret, raw), signature);
}

// First present value among candidate keys (checks top level + a nested data/payload).
function pick(body: Record<string, unknown>, keys: string[]): unknown {
  const nests = [body, body.data as Record<string, unknown>, body.payload as Record<string, unknown>, body.order as Record<string, unknown>].filter(Boolean);
  for (const src of nests) for (const k of keys) if (src && src[k] != null) return src[k];
  return undefined;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Map iGV status text/codes to our categories, defensively.
function statusFor(raw: unknown, eventType: unknown): string {
  const s = String(raw ?? eventType ?? "").toLowerCase();
  if (s.includes("refund")) return "refunded";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("complete") || s.includes("finish") || s.includes("deliver") || s.includes("paid")) return "completed";
  return "in_delivery";
}

export function normalizeIgv(body: Record<string, unknown>): Order | null {
  const orderId = pick(body, ["orderId", "order_id", "orderNo", "order_no", "orderSn", "id"]);
  if (orderId == null) return null;
  const amount = num(pick(body, ["amount", "payAmount", "pay_amount", "totalAmount", "total_amount", "price", "orderAmount"]));
  const createdMs = pick(body, ["createTime", "create_time", "createdAt", "created_at", "orderTime", "payTime"]);
  const date = msToDate(typeof createdMs === "number" ? createdMs : Number(createdMs)) ?? new Date().toISOString().slice(0, 10);
  const status = statusFor(pick(body, ["status", "orderStatus", "order_status"]), pick(body, ["eventType", "event_type", "type"]));
  return {
    order_id: `IGV-${orderId}`,
    date,
    method: null,
    platform: "iGV",
    product: cleanTitle(pick(body, ["productName", "product_name", "skuName", "sku_name", "title", "goodsName"])),
    supplier: null,
    cost: null,
    sold_for: amount,
    profit: null,
    status,
    supplier_paid: null,
    notes: null,
    source: "igv_api",
    currency: String(pick(body, ["currency", "currencyCode", "payCurrency"]) ?? "USD").toUpperCase(),
    refunded_amount: num(pick(body, ["refundAmount", "refund_amount", "refundedAmount"])),
    workspace: "igv",
    completed_at: status === "completed" ? date : undefined,
    refunded_at: status === "refunded" ? date : undefined,
    added_at: new Date().toISOString(),
  };
}

export async function handleIgvEvent(
  env: IgvEnv,
  headers: { timestamp: string; requestId: string; signature: string },
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; note: string }> {
  if (!verifyIgvSignature(env, headers.timestamp, headers.requestId, headers.signature)) {
    return { ok: false, status: 401, note: "bad signature" };
  }
  const order = normalizeIgv(body);
  if (!order) return { ok: true, status: 200, note: "ignored (no order id)" };
  const { cost, supplier, profit, ...rest } = order;
  void cost; void supplier; void profit;
  await upsertExternalOrder(rest as typeof order);
  return { ok: true, status: 200, note: `upserted ${order.order_id} (${order.status})` };
}
