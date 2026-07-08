import crypto from "node:crypto";
import { db } from "./supabase";
import type { Order } from "./types";

// Shared plumbing for the push-based marketplaces (G2G, iGV). Unlike GameBoost
// (which we poll), these platforms have no "list my sales" endpoint — they POST
// each order event to a webhook URL we register. We verify the signature, map
// the event to our Order shape, and upsert it tagged with the workspace.
//
// SAME HARD RULE as the GameBoost sync: we only ever write a fixed whitelist of
// safe fields, and we OMIT cost/supplier/profit on upsert so any values you've
// filled in by hand are never overwritten by an incoming event.

const ALLOWED_KEYS = new Set<string>([
  "order_id", "date", "method", "platform", "product", "sold_for", "status",
  "supplier_paid", "notes", "source", "workspace", "currency", "refunded_amount",
  "purchased_at", "completed_at", "refunded_at", "is_disputed", "added_at",
]);

// Timing-safe hex-string compare (case-insensitive), tolerant of length diff.
export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from((a || "").toLowerCase(), "utf8");
  const y = Buffer.from((b || "").toLowerCase(), "utf8");
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

export function hmacSha256Hex(key: string, message: string): string {
  return crypto.createHmac("sha256", key).update(message, "utf8").digest("hex");
}

// Upsert one normalized external order. Omits cost/supplier/profit so manual
// edits survive; enforces the field whitelist as a structural guarantee.
export async function upsertExternalOrder(o: Partial<Order> & { order_id: string }): Promise<void> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (!ALLOWED_KEYS.has(k)) {
      throw new Error(`Refusing to write external order: unexpected field "${k}"`);
    }
    row[k] = v;
  }
  const { error } = await db().from("orders").upsert(row, { onConflict: "order_id" });
  if (error) throw new Error(`external order upsert failed: ${error.message}`);
}

export function msToDate(ms: unknown): string | null {
  if (typeof ms !== "number" || !ms) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

// Strip non-ASCII noise from titles, same as the GameBoost sync.
export function cleanTitle(t: unknown): string | null {
  if (typeof t !== "string") return null;
  const cleaned = t.replace(/[^\x00-\x7F]+/g, "").replace(/\s{2,}/g, " ").trim();
  return cleaned || t.trim() || null;
}
