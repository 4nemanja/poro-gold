import { db } from "./supabase";
import { statusCategory } from "./orderStatus";
import type { Order, SupplierRecord } from "./types";

// A refunded or cancelled order earned no profit — never count it.
function earnsProfit(o: Order): boolean {
  const c = statusCategory(o.status);
  return c !== "refunded" && c !== "cancelled";
}

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

// Per-order fee / supplier-split annotations. The orders table schema can't be
// altered from here, so these live in app_config keyed by order_id. `profit`
// (a real column) already nets them out; these are for display + cost breakdown.
export type OrderExtra = { fee_pct?: number; fee?: number; supplier_share_pct?: number; supplier_cut?: number };
export type OrderExtras = Record<string, OrderExtra>;

export async function getOrderExtras(): Promise<OrderExtras> {
  return getConfig<OrderExtras>("order_extras", {});
}

export async function setOrderExtra(orderId: string, extra: OrderExtra | null): Promise<void> {
  const all = await getOrderExtras();
  if (extra && (extra.fee_pct || extra.fee || extra.supplier_share_pct || extra.supplier_cut)) all[orderId] = extra;
  else delete all[orderId];
  await setConfig("order_extras", all);
}

function mergeExtras(orders: Order[], extras: OrderExtras): Order[] {
  for (const o of orders) {
    const e = extras[o.order_id];
    if (e) {
      o.fee_pct = e.fee_pct ?? null;
      o.fee = e.fee ?? null;
      o.supplier_share_pct = e.supplier_share_pct ?? null;
      o.supplier_cut = e.supplier_cut ?? null;
    }
  }
  return orders;
}

export async function getAllOrders(): Promise<Order[]> {
  const [{ data, error }, extras] = await Promise.all([
    db().from("orders").select("*").gte("date", BUSINESS_START),
    getOrderExtras(),
  ]);
  if (error) throw new Error(`orders query failed: ${error.message}`);
  return mergeExtras((data ?? []).map(rowToOrder), extras).sort(orderRecencySort);
}

export async function getWorkspaceOrders(workspace: string): Promise<Order[]> {
  const [{ data, error }, extras] = await Promise.all([
    db().from("orders").select("*").eq("workspace", workspace).gte("date", BUSINESS_START),
    getOrderExtras(),
  ]);
  if (error) throw new Error(`orders query failed: ${error.message}`);
  return mergeExtras((data ?? []).map(rowToOrder), extras).sort(orderRecencySort);
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
  fee_pct: number | null; // selling fee as a % of sold_for (stored in app_config)
  status: string; // in_progress | completed | refunded
  added_at?: string;
};

// Per-gift fee lives in app_config (the gift_orders table can't be altered here).
// Stored as a percent of the sale price.
export type GiftExtras = Record<string, { fee_pct?: number }>;
export async function getGiftExtras(): Promise<GiftExtras> {
  return getConfig<GiftExtras>("gift_extras", {});
}
export async function setGiftExtra(id: string, feePct: number | null): Promise<void> {
  const all = await getGiftExtras();
  if (feePct) all[id] = { fee_pct: feePct };
  else delete all[id];
  await setConfig("gift_extras", all);
}

export async function getGiftConfig(): Promise<GiftConfig> {
  return getConfig<GiftConfig>("gift_config", { invested_usd: 33, vbucks_stock: 12500, note: "" });
}

export async function getGiftOrders(): Promise<GiftOrder[]> {
  const [{ data, error }, extras] = await Promise.all([
    db().from("gift_orders").select("*"),
    getGiftExtras(),
  ]);
  if (error) throw new Error(`gift_orders query failed: ${error.message}`);
  return (data ?? []).map((r) => {
    const id = r.id as string;
    return {
      id,
      date: (r.date as string) ?? "",
      customer: (r.customer as string) ?? null,
      vbucks: num(r.vbucks) ?? 0,
      sold_for: num(r.sold_for),
      cost: num(r.cost),
      fee_pct: extras[id]?.fee_pct ?? null,
      status: (r.status as string) ?? "in_progress",
      added_at: (r.added_at as string) ?? undefined,
    };
  });
}

// --- Suppliers (managed by hand; stored in app_config) ---
export async function getSuppliers(): Promise<SupplierRecord[]> {
  return getConfig<SupplierRecord[]>("suppliers", []);
}
export async function saveSuppliers(list: SupplierRecord[]): Promise<void> {
  await setConfig("suppliers", list);
}

// --- Per-platform fees (editable %, keyed by workspace slug) ---
// Two independent kinds: "withdrawal" (cashing out) and "selling" (marketplace
// cut on each sale). Both live in app_config as slug -> percent maps.
export type PlatformFees = Record<string, number>;
export type FeeKind = "withdrawal" | "selling";
const FEE_KEY: Record<FeeKind, string> = { withdrawal: "withdrawal_fees", selling: "selling_fees" };

export async function getPlatformFees(kind: FeeKind): Promise<PlatformFees> {
  return getConfig<PlatformFees>(FEE_KEY[kind], {});
}
export async function setPlatformFee(kind: FeeKind, slug: string, pct: number): Promise<void> {
  const all = await getPlatformFees(kind);
  all[slug] = pct;
  await setConfig(FEE_KEY[kind], all);
}
// Back-compat aliases used by the withdrawal-fee UI.
export const getWithdrawalFees = () => getPlatformFees("withdrawal");
export const setWithdrawalFee = (slug: string, pct: number) => setPlatformFee("withdrawal", slug, pct);

// --- Pure aggregation helpers ---
export function sumRevenue(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + (o.sold_for ?? 0), 0);
}
export function sumCost(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + (o.cost ?? 0), 0);
}
export function sumProfit(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + (earnsProfit(o) ? o.profit ?? 0 : 0), 0);
}
export function sumFees(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + (o.fee ?? 0), 0);
}
export function sumSupplierCuts(orders: Order[]): number {
  return orders.reduce((acc, o) => acc + (o.supplier_cut ?? 0), 0);
}

// Net profit math for a single order, given a fee and the supplier's share % of
// the gross profit. Returns the fee-adjusted gross, the supplier's cut, and your
// net profit. Supplier only shares in a positive gross (never covers a loss).
export function computeOrderProfit(
  soldFor: number,
  cost: number | null,
  fee: number | null,
  sharePct: number | null,
): { gross: number; supplierCut: number; profit: number } {
  const gross = Math.round((soldFor - (cost ?? 0) - (fee ?? 0)) * 100) / 100;
  const pct = sharePct && sharePct > 0 ? Math.min(sharePct, 100) : 0;
  const supplierCut = gross > 0 && pct > 0 ? Math.round(gross * (pct / 100) * 100) / 100 : 0;
  const profit = Math.round((gross - supplierCut) * 100) / 100;
  return { gross, supplierCut, profit };
}
