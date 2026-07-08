import type { Order } from "./types";
import { hmacSha256Hex, safeEqualHex, msToDate, upsertExternalOrder } from "./marketplace";

// G2G pushes order events to our webhook. Docs:
//   https://docs.g2g.com/message-signature-1237168m0  (signature)
//   https://docs.g2g.com/order-completed-18583505e0    (payload)
//
// Signature: canonical = webhook_url + user_id + timestamp
//            g2g-signature == HMAC-SHA256(secret, canonical) hex
// (Verified against the doc's own test vector.)

export type G2GEnv = { secret: string; userId: string; webhookUrl: string };

export function g2gEnv(): G2GEnv | null {
  const secret = process.env.G2G_WEBHOOK_SECRET;
  const userId = process.env.G2G_USER_ID;
  const webhookUrl = process.env.G2G_WEBHOOK_URL;
  if (!secret || !userId || !webhookUrl) return null;
  return { secret, userId, webhookUrl };
}

export function verifyG2GSignature(env: G2GEnv, timestamp: string, signature: string): boolean {
  if (!timestamp || !signature) return false;
  const canonical = env.webhookUrl + env.userId + timestamp;
  return safeEqualHex(hmacSha256Hex(env.secret, canonical), signature);
}

// Map G2G event type -> our status category.
function statusFor(eventType: string, orderStatus: string): string {
  const et = (eventType || "").toLowerCase();
  if (et === "order.completed") return "completed";
  if (et === "order.refunded") return "refunded";
  if (et === "order.cancelled") return "cancelled";
  if (et === "order.rollback_cancelled" || et === "order.rollback_completed") return "in_delivery";
  // Fall back to the order's own status when the event is a mid-flight update.
  const os = (orderStatus || "").toLowerCase();
  if (os === "delivered") return "completed";
  if (os === "refunded") return "refunded";
  return "in_delivery";
}

type G2GEvent = {
  event_type?: string;
  event_happened_at?: number;
  payload?: Record<string, unknown>;
};

export function normalizeG2G(evt: G2GEvent): Order | null {
  const p = evt.payload ?? {};
  const orderId = p.order_id as string | undefined;
  if (!orderId) return null;
  const amount = typeof p.amount === "number" ? p.amount : null;
  const refunded = typeof p.refunded_amount === "number" ? p.refunded_amount : null;
  const date = msToDate(p.order_created_at) ?? msToDate(evt.event_happened_at);
  const status = statusFor(evt.event_type ?? "", (p.order_status as string) ?? "");
  return {
    order_id: `G2G-${orderId}`,
    date,
    method: null,
    platform: "G2G",
    product: (p.offer_service_type as string) ?? null,
    supplier: null,
    cost: null,
    sold_for: amount,
    profit: null,
    status,
    supplier_paid: null,
    notes: null,
    source: "g2g_api",
    currency: ((p.checkout_currency as string) || (p.offer_currency as string) || "USD").toUpperCase(),
    refunded_amount: refunded,
    workspace: "g2g",
    completed_at: status === "completed" ? date : undefined,
    refunded_at: status === "refunded" ? date : undefined,
    added_at: new Date().toISOString(),
  };
}

// Verify + upsert one incoming G2G event. Returns what happened, for the log.
export async function handleG2GEvent(
  env: G2GEnv,
  headers: { timestamp: string; signature: string },
  body: G2GEvent,
): Promise<{ ok: boolean; status: number; note: string }> {
  if (!verifyG2GSignature(env, headers.timestamp, headers.signature)) {
    return { ok: false, status: 401, note: "bad signature" };
  }
  const order = normalizeG2G(body);
  if (!order) return { ok: true, status: 200, note: "ignored (no order_id)" };
  const { cost, supplier, profit, ...rest } = order;
  void cost; void supplier; void profit; // omit so manual edits survive
  await upsertExternalOrder(rest as typeof order);
  return { ok: true, status: 200, note: `upserted ${order.order_id} (${order.status})` };
}
