import type { Order } from "./types";
import type { InvestmentBatch } from "./data";
import { statusCategory, isCompleted } from "./orderStatus";

// Per-batch analytics. Capital use is tracked FIFO (a supplier payment draws down
// the oldest batch that existed by that date) — same as the Investment page — so
// "% used" hits 100% when a batch's cash is fully deployed. Activity & profit are
// time-windowed: a batch "owns" every order from the day it was added until the
// next top-up, giving each batch a clean, non-overlapping set of orders to analyse.

const r2 = (n: number) => Math.round(n * 100) / 100;

// A refunded/cancelled order earned nothing.
function earned(o: Order): number {
  const c = statusCategory(o.status);
  return c === "refunded" || c === "cancelled" ? 0 : o.profit ?? 0;
}

export type Ranked = { name: string; count: number; revenue: number; cost: number; profit: number; marginPct: number };

export type BatchAnalysis = {
  batch: InvestmentBatch;
  windowStart: string;
  windowEnd: string; // exclusive; "" for the current (open) batch
  isCurrent: boolean;
  injected: number;
  spent: number; // FIFO capital used
  left: number;
  pctUsed: number;
  complete: boolean;
  orders: Order[];
  orderCount: number;
  revenue: number;
  cost: number;
  fees: number;
  profit: number;
  marginPct: number; // profit / revenue
  byProduct: Ranked[];
  bySupplier: Ranked[];
  bestProduct: Ranked | null; // most profit
  commonProduct: Ranked | null; // most orders
  bestSupplier: Ranked | null; // most profit
  insights: string[];
};

export function rankOrders(orders: Order[], keyOf: (o: Order) => string): Ranked[] {
  const m = new Map<string, Ranked>();
  for (const o of orders) {
    const name = keyOf(o) || "—";
    const r = m.get(name) ?? { name, count: 0, revenue: 0, cost: 0, profit: 0, marginPct: 0 };
    r.count += 1;
    r.revenue += isCompleted(o.status) ? o.sold_for ?? 0 : 0;
    r.cost += o.cost ?? 0;
    r.profit += earned(o);
    m.set(name, r);
  }
  const list = [...m.values()].map((r) => ({ ...r, revenue: r2(r.revenue), cost: r2(r.cost), profit: r2(r.profit), marginPct: r.revenue > 0 ? r2((r.profit / r.revenue) * 100) : 0 }));
  return list.sort((a, b) => b.profit - a.profit);
}

export function analyzeBatches(batches: InvestmentBatch[], orders: Order[]): BatchAnalysis[] {
  const sorted = [...batches].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  if (sorted.length === 0) return [];

  // FIFO allocate every supplier payment to the oldest batch available on its date.
  const purse = sorted.map((b) => ({ id: b.id, date: b.date, rem: b.amount, spent: 0 }));
  const spendTxns = orders
    .filter((o) => o.cost != null && o.date && o.date >= sorted[0].date)
    .map((o) => ({ date: o.date as string, amount: o.cost as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const t of spendTxns) {
    let amt = t.amount;
    for (const p of purse) {
      if (amt <= 0) break;
      if (p.date > t.date || p.rem <= 0) continue;
      const take = Math.min(p.rem, amt);
      p.rem -= take;
      p.spent += take;
      amt -= take;
    }
  }
  const spentById = Object.fromEntries(purse.map((p) => [p.id, { spent: p.spent, left: p.rem }]));

  const avgMargin = (() => {
    let rev = 0;
    let prof = 0;
    for (const o of orders) {
      rev += isCompleted(o.status) ? o.sold_for ?? 0 : 0;
      prof += earned(o);
    }
    return rev > 0 ? (prof / rev) * 100 : 0;
  })();

  return sorted.map((b, i) => {
    const windowStart = b.date;
    const windowEnd = sorted[i + 1]?.date ?? "";
    const isCurrent = i === sorted.length - 1;
    const inWindow = orders.filter((o) => (o.date ?? "") >= windowStart && (windowEnd === "" || (o.date ?? "") < windowEnd));

    const revenue = r2(inWindow.reduce((a, o) => a + (isCompleted(o.status) ? o.sold_for ?? 0 : 0), 0));
    const cost = r2(inWindow.reduce((a, o) => a + (o.cost ?? 0), 0));
    const fees = r2(inWindow.reduce((a, o) => a + (o.fee ?? 0) + (o.withdrawal_fee ?? 0), 0));
    const profit = r2(inWindow.reduce((a, o) => a + earned(o), 0));
    const marginPct = revenue > 0 ? r2((profit / revenue) * 100) : 0;

    const byProduct = rankOrders(inWindow, (o) => o.product ?? "—");
    const bySupplier = rankOrders(inWindow.filter((o) => o.supplier), (o) => o.supplier ?? "—");
    const bestProduct = byProduct[0] ?? null;
    const commonProduct = [...byProduct].sort((a, b) => b.count - a.count)[0] ?? null;
    const bestSupplier = bySupplier[0] ?? null;

    const spent = r2(spentById[b.id]?.spent ?? 0);
    const left = r2(spentById[b.id]?.left ?? b.amount);
    const pctUsed = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
    const complete = !isCurrent || left <= 0.5;

    const insights: string[] = [];
    if (bestProduct) insights.push(`Top earner: ${bestProduct.name} made ${money(bestProduct.profit)} across ${bestProduct.count} order${bestProduct.count === 1 ? "" : "s"}.`);
    if (commonProduct && commonProduct.name !== bestProduct?.name) insights.push(`Most sold: ${commonProduct.name} (${commonProduct.count} orders, ${money(commonProduct.profit)} profit).`);
    if (bestSupplier) insights.push(`Best supplier: ${bestSupplier.name} returned ${money(bestSupplier.profit)} profit.`);
    if (revenue > 0) {
      if (marginPct >= avgMargin) insights.push(`Healthy margin at ${marginPct}% — at or above your ${r2(avgMargin)}% average. Lean into ${bestProduct?.name ?? "your top product"} and ${bestSupplier?.name ?? "your best supplier"} to scale it.`);
      else insights.push(`Margin ${marginPct}% is below your ${r2(avgMargin)}% average — a low-margin product dragged it down. Shift volume toward ${bestProduct?.name ?? "your top product"} and higher-margin lines.`);
    }
    const losers = byProduct.filter((p) => p.revenue > 0 && p.profit / p.revenue < 0.1);
    if (losers.length) insights.push(`Thin margin (<10%): ${losers.slice(0, 3).map((p) => p.name).join(", ")}. Renegotiate cost or raise price.`);

    return {
      batch: b, windowStart, windowEnd, isCurrent,
      injected: b.amount, spent, left, pctUsed, complete,
      orders: inWindow, orderCount: inWindow.length,
      revenue, cost, fees, profit, marginPct,
      byProduct, bySupplier, bestProduct, commonProduct, bestSupplier, insights,
    };
  });
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
