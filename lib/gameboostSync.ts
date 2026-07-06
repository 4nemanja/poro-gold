import type { Order } from "./types";
import { db } from "./supabase";
import { setConfig } from "./data";

// Pulls GameBoost order history and upserts it into Supabase. Same hard rule:
// buyer credentials are never stored - normalize() only ever emits a fixed
// whitelist of safe fields, and a post-check aborts if any other key appears.

const API_BASE = "https://api.gameboost.com/v2";
const FORBIDDEN = ["credentials", "offer_credentials", "delivery_instructions"];

// The only keys a normalized order may ever contain. Anything else = abort.
const ALLOWED_KEYS = new Set<keyof Order | string>([
  "order_id", "date", "method", "platform", "product", "supplier", "cost",
  "sold_for", "profit", "status", "supplier_paid", "notes", "source",
  "purchased_at", "completed_at", "refunded_at", "is_disputed",
]);

const ORDER_ENDPOINTS: { path: string; kind: string }[] = [
  { path: "/item-orders", kind: "item" },
  { path: "/account-orders", kind: "account" },
  { path: "/currency-orders", kind: "currency" },
  { path: "/gift-card-orders", kind: "gift_card" },
];

type RawOrder = Record<string, unknown>;

function tsToDate(ts: unknown): string | null {
  if (typeof ts !== "number" || !ts) return null;
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function priceUsd(o: RawOrder): number | null {
  const p = (o.price_usd ?? o.price) as { value?: number } | number | undefined;
  if (p && typeof p === "object" && typeof p.value === "number") return p.value;
  return typeof p === "number" ? p : null;
}

function cleanTitle(t: unknown): string | null {
  if (typeof t !== "string") return null;
  const cleaned = t.replace(/[^\x00-\x7F]+/g, "").replace(/\s{2,}/g, " ").trim();
  return cleaned || t.trim();
}

function normalize(o: RawOrder, kind: string): Order {
  return {
    order_id: `GB-${o.id}`,
    date: tsToDate(o.created_at ?? o.purchased_at),
    method: kind,
    platform: "GameBoost",
    product: cleanTitle(o.title),
    supplier: null,
    cost: null,
    sold_for: priceUsd(o),
    profit: null,
    status: (o.status as string) ?? null,
    supplier_paid: null,
    notes: null,
    source: "gameboost_api",
    purchased_at: tsToDate(o.purchased_at),
    completed_at: tsToDate(o.completed_at),
    refunded_at: tsToDate(o.refunded_at),
    is_disputed: !!o.is_disputed,
  };
}

async function apiGet(pathq: string, key: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}${pathq}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "User-Agent": "VBucksRelay-Sync/1.0",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GameBoost ${pathq} returned ${res.status}`);
  return res.json();
}

async function pullAll(endpoint: string, kind: string, key: string): Promise<Order[]> {
  const orders: Order[] = [];
  let page = 1;
  // Hard cap on pages to avoid a runaway loop if the API misbehaves.
  for (let guard = 0; guard < 200; guard++) {
    const payload = await apiGet(`${endpoint}?per_page=50&sort=-created_at&page=${page}`, key);
    const data = (payload.data as RawOrder[]) ?? [];
    for (const raw of data) {
      for (const f of FORBIDDEN) delete raw[f];
      orders.push(normalize(raw, kind));
    }
    const meta = (payload.meta as { last_page?: number }) ?? {};
    const lastPage = meta.last_page ?? page;
    if (page >= lastPage || data.length === 0) break;
    page += 1;
  }
  return orders;
}

export type SyncReport = {
  synced_at: string;
  source: string;
  orders: number;
  item_orders: number;
  account_orders: number;
  currency_orders: number;
  gift_card_orders: number;
  date_range: { first: string; last: string } | null;
  gross_revenue_usd: number;
  refunds: number;
  credentials_stored: false;
};

export async function syncGameboost(): Promise<SyncReport> {
  const key = process.env.GAMEBOOST_API_KEY;
  if (!key) throw new Error("GAMEBOOST_API_KEY is not set");

  const results = await Promise.all(
    ORDER_ENDPOINTS.map((e) => pullAll(e.path, e.kind, key))
  );
  const [item, account, currency, giftCard] = results;
  const orders = results.flat();

  // Structural credential guarantee: no normalized order may carry any key
  // outside the safe whitelist (credentials/offer_credentials/etc. can't survive).
  for (const o of orders) {
    for (const k of Object.keys(o)) {
      if (!ALLOWED_KEYS.has(k)) {
        throw new Error(`Refusing to write: unexpected field "${k}" in a normalized order`);
      }
    }
  }

  orders.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  // Upsert into the shared orders table, tagged as the GameBoost workspace.
  const rows = orders.map((o) => ({ ...o, workspace: "gameboost", currency: "USD" }));
  const client = db();
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await client.from("orders").upsert(chunk, { onConflict: "order_id" });
    if (error) throw new Error(`GameBoost upsert failed: ${error.message}`);
  }

  const dates = orders.map((o) => o.date).filter((d): d is string => !!d).sort();
  const revenue = orders.reduce((a, o) => a + (o.sold_for ?? 0), 0);
  const refunds = orders.filter((o) => (o.status ?? "").toLowerCase() === "refunded").length;

  const report: SyncReport = {
    synced_at: new Date().toISOString(),
    source: "gameboost_api",
    orders: orders.length,
    item_orders: item.length,
    account_orders: account.length,
    currency_orders: currency.length,
    gift_card_orders: giftCard.length,
    date_range: dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null,
    gross_revenue_usd: Math.round(revenue * 100) / 100,
    refunds,
    credentials_stored: false,
  };
  await setConfig("sync_report", report);

  return report;
}
