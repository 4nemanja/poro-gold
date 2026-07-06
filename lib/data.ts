import { db } from "./supabase";
import type { Order } from "./types";

// Business started 2026-07-01. GameBoost's API carries years of history;
// everything before this date is hidden across the whole app.
export const BUSINESS_START = "2026-07-01";
// The investor's capital started paying suppliers on 2026-07-06, so the
// Investment and Refunded views only count from this date.
export const LEDGER_START = "2026-07-06";

// Supabase returns numeric columns as strings; coerce the money/number fields.
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function rowToOrder(r: Record<string, unknown>): Order {
  return {
    order_id: r.order_id as string,
    date: (r.date as string) ?? null,
    method: (r.method as string) ?? null,
    platform: (r.platform as string) ?? null,
    product: (r.product as string) ?? null,
    supplier: (r.supplier as string) ?? null,
    cost: num(r.cost),
    sold_for: num(r.sold_for),
    profit: num(r.profit),
    status: (r.status as string) ?? null,
    supplier_paid: (r.supplier_paid as boolean) ?? null,
    notes: (r.notes as string) ?? null,
    source: (r.source as string) ?? undefined,
    workspace: (r.workspace as string) ?? undefined,
    currency: (r.currency as string) ?? undefined,
    earning: num(r.earning),
    refunded_amount: num(r.refunded_amount),
    purchased_at: (r.purchased_at as string) ?? undefined,
    completed_at: (r.completed_at as string) ?? undefined,
    refunded_at: (r.refunded_at as string) ?? undefined,
    is_disputed: (r.is_disputed as boolean) ?? undefined,
    added_at: (r.added_at as string) ?? undefined,
  };
}

// Newest first: by order date, then by when it was logged.
export function orderRecencySort(a: Order, b: Order): number {
  const d = (b.date ?? "").localeCompare(a.date ?? "");
  if (d !== 0) return d;
  return (b.added_at ?? "").localeCompare(a.added_at ?? "");
}

export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await db().from("orders").select("*").gte("date", BUSINESS_START);
  if (error) throw new Error(`orders query failed: ${error.message}`);
  return (data ?? []).map(rowToOrder).sort(orderRecencySort);
}

export async function getWorkspaceOrders(workspace: string): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select("*")
    .eq("workspace", workspace)
    .gte("date", BUSINESS_START);
  if (error) throw new Error(`orders query failed: ${error.message}`);
  return (data ?? []).map(rowToOrder).sort(orderRecencySort);
}

// --- SKU catalog ---
export type Sku = { label: string; price: number; payout: number; active: boolean };

export async function getSkus(workspace: string): Promise<Sku[]> {
  const { data, error } = await db().from("skus").select("*").eq("workspace", workspace);
  if (error) throw new Error(`skus query failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    label: r.label as string,
    price: num(r.price) ?? 0,
    payout: num(r.payout) ?? 0,
    active: (r.active as boolean) ?? true,
  }));
}

// --- app_config singletons ---
async function getConfig<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await db().from("app_config").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`app_config query failed: ${error.message}`);
  return (data?.value as T) ?? fallback;
}

export async function setConfig(key: string, value: unknown): Promise<void> {
  const { error } = await db().from("app_config").upsert({ key, value });
  if (error) throw new Error(`app_config upsert failed: ${error.message}`);
}

export type SyncReportSummary = {
  synced_at?: string;
  orders?: number;
  gross_revenue_usd?: number;
} | null;

export async function getSyncReport(): Promise<SyncReportSummary> {
  return getConfig<SyncReportSummary>("sync_report", null);
}

// Capital / treasury config.
export type Investment = { invested_usd: number; note: string; rsd_per_usd: number };
export async function getInvestment(): Promise<Investment> {
  return getConfig<Investment>("investment", { invested_usd: 0, note: "", rsd_per_usd: 117 });
}

// --- Gift System ---
export type GiftConfig = { invested_usd: number; vbucks_stock: number; note: string };
export type GiftOrder = {
  id: string;
  date: string;
  customer: string | null;
  vbucks: number;
  sold_for: number | null;
  cost: number | null;
  status: string; // in_progress | completed | refunded
  added_at?: string;
};

export async function getGiftConfig(): Promise<GiftConfig> {
  return getConfig<GiftConfig>("gift_config", { invested_usd: 33, vbucks_stock: 12500, note: "" });
}

export async function getGiftOrders(): Promise<GiftOrder[]> {
  const { data, error } = await db().from("gift_orders").select("*");
  if (error) throw new Error(`gift_orders query failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    date: (r.date as string) ?? "",
    customer: (r.customer as string) ?? null,
    vbucks: num(r.vbucks) ?? 0,
    sold_for: num(r.sold_for),
    cost: num(r.cost),
    status: (r.status as string) ?? "in_progress",
    added_at: (r.added_at as string) ?? undefined,
  }));
}

// --- Pure aggregation helpers ---
export function sumRevenue(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + (o.sold_for ?? 0), 0);
}
export function sumCost(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + (o.cost ?? 0), 0);
}
export function sumProfit(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + (o.profit ?? 0), 0);
}
