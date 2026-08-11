import { sumRevenue, sumCost, sumProfit, sumFees, sumSupplierCuts } from "./data";
import type { Order } from "./types";

// Deterministic date-vs-date comparison used by the Compare Dates page. It never
// creates its own totals — every figure comes from the same sum helpers the rest
// of the dashboard (Profit & Costs, Products) already uses, so numbers can't drift
// out of sync. Callers pass in orders that are already filtered to a single
// calendar date and to non-refunded status.

export type DayMetrics = {
  sales: number;
  revenue: number;
  supplierCost: number; // what you paid suppliers
  fees: number; // marketplace + withdrawal fees
  costs: number; // out-of-pocket = supplierCost + fees (matches Profit & Costs)
  supplierCut: number; // foregone profit paid to splitting suppliers
  profit: number;
  avgSalePrice: number; // revenue / sales
  avgCostPerSale: number; // supplierCost / sales
  avgProfitPerSale: number; // profit / sales
  marginPct: number; // profit / revenue * 100
};

// Guard every division so an empty date can never produce NaN / Infinity.
function safeDiv(n: number, d: number): number {
  return d ? n / d : 0;
}

export function computeDayMetrics(orders: Order[]): DayMetrics {
  const sales = orders.length;
  const revenue = round2(sumRevenue(orders));
  const supplierCost = round2(sumCost(orders));
  const fees = round2(sumFees(orders));
  const supplierCut = round2(sumSupplierCuts(orders));
  const profit = round2(sumProfit(orders));
  const costs = round2(supplierCost + fees);
  return {
    sales,
    revenue,
    supplierCost,
    fees,
    costs,
    supplierCut,
    profit,
    avgSalePrice: round2(safeDiv(revenue, sales)),
    avgCostPerSale: round2(safeDiv(supplierCost, sales)),
    avgProfitPerSale: round2(safeDiv(profit, sales)),
    marginPct: round2(safeDiv(profit, revenue) * 100),
  };
}

export type MetricKind = "count" | "currency" | "percent";

export type MetricRow = {
  key: keyof DayMetrics;
  label: string;
  kind: MetricKind;
  higherIsBetter: boolean;
  a: number;
  b: number;
  diff: number; // a - b
  pctDiff: number | null; // (a - b) / |b| * 100; null when b is 0 and a isn't
  changed: boolean;
  winner: "a" | "b" | "tie";
};

type MetricDef = { key: keyof DayMetrics; label: string; kind: MetricKind; higherIsBetter: boolean };

// Order matches the request's suggested layout: volume metrics first, then the
// efficiency (per-order) metrics.
const METRIC_DEFS: MetricDef[] = [
  { key: "sales", label: "Sales", kind: "count", higherIsBetter: true },
  { key: "revenue", label: "Revenue", kind: "currency", higherIsBetter: true },
  { key: "supplierCost", label: "Supplier Cost", kind: "currency", higherIsBetter: false },
  { key: "fees", label: "Fees", kind: "currency", higherIsBetter: false },
  { key: "costs", label: "Costs", kind: "currency", higherIsBetter: false },
  { key: "profit", label: "Profit", kind: "currency", higherIsBetter: true },
  { key: "avgSalePrice", label: "Avg Selling Price", kind: "currency", higherIsBetter: true },
  { key: "avgCostPerSale", label: "Avg Cost / Sale", kind: "currency", higherIsBetter: false },
  { key: "avgProfitPerSale", label: "Avg Profit / Sale", kind: "currency", higherIsBetter: true },
  { key: "marginPct", label: "Profit Margin", kind: "percent", higherIsBetter: true },
];

// Values that are "equal" once rounded shouldn't be flagged as changed — avoids
// red highlights from floating-point dust.
function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

function pctDiff(a: number, b: number): number | null {
  if (b === 0) return a === 0 ? 0 : null; // can't express "∞% higher" — leave null
  return round2(((a - b) / Math.abs(b)) * 100);
}

export function buildMetricRows(a: DayMetrics, b: DayMetrics): MetricRow[] {
  return METRIC_DEFS.map((d) => {
    const av = a[d.key];
    const bv = b[d.key];
    const changed = !nearlyEqual(av, bv);
    let winner: "a" | "b" | "tie" = "tie";
    if (changed) winner = (av > bv) === d.higherIsBetter ? "a" : "b";
    return {
      key: d.key,
      label: d.label,
      kind: d.kind,
      higherIsBetter: d.higherIsBetter,
      a: av,
      b: bv,
      diff: round2(av - bv),
      pctDiff: pctDiff(av, bv),
      changed,
      winner,
    };
  });
}

// Per-product breakdown for one date. Profit/revenue come from the canonical sum
// helpers so a product's totals match the Products page. Avg price uses actual
// order sold_for (historical price), never a current SKU configuration.
export type ProductStat = {
  product: string;
  sales: number;
  revenue: number;
  profit: number;
  avgPrice: number;
};

function bucketByProduct(orders: Order[]): Map<string, Order[]> {
  const m = new Map<string, Order[]>();
  for (const o of orders) {
    const key = o.product?.trim() || "—";
    const list = m.get(key);
    if (list) list.push(o);
    else m.set(key, [o]);
  }
  return m;
}

function productStats(orders: Order[]): Map<string, ProductStat> {
  const out = new Map<string, ProductStat>();
  for (const [product, list] of bucketByProduct(orders)) {
    const revenue = round2(sumRevenue(list));
    out.set(product, {
      product,
      sales: list.length,
      revenue,
      profit: round2(sumProfit(list)),
      avgPrice: round2(safeDiv(revenue, list.length)),
    });
  }
  return out;
}

export type ProductCompareRow = {
  product: string;
  aSales: number;
  bSales: number;
  salesDiff: number;
  aRevenue: number;
  bRevenue: number;
  aProfit: number;
  bProfit: number;
  profitDiff: number;
  aAvgPrice: number; // 0 when the product didn't sell that day
  bAvgPrice: number;
  priceDiff: number | null; // null when the product sold on only one of the dates
  priceChanged: boolean;
};

export function buildProductRows(aOrders: Order[], bOrders: Order[]): ProductCompareRow[] {
  const aStats = productStats(aOrders);
  const bStats = productStats(bOrders);
  const names = new Set<string>([...aStats.keys(), ...bStats.keys()]);
  const rows: ProductCompareRow[] = [];
  for (const product of names) {
    const a = aStats.get(product);
    const b = bStats.get(product);
    const bothSold = !!a && !!b;
    const priceDiff = bothSold ? round2(a!.avgPrice - b!.avgPrice) : null;
    rows.push({
      product,
      aSales: a?.sales ?? 0,
      bSales: b?.sales ?? 0,
      salesDiff: (a?.sales ?? 0) - (b?.sales ?? 0),
      aRevenue: a?.revenue ?? 0,
      bRevenue: b?.revenue ?? 0,
      aProfit: a?.profit ?? 0,
      bProfit: b?.profit ?? 0,
      profitDiff: round2((a?.profit ?? 0) - (b?.profit ?? 0)),
      aAvgPrice: a?.avgPrice ?? 0,
      bAvgPrice: b?.avgPrice ?? 0,
      priceDiff,
      priceChanged: priceDiff !== null && Math.abs(priceDiff) >= 0.005,
    });
  }
  // Biggest absolute profit swing first — that's what explains the difference.
  return rows.sort((x, y) => Math.abs(y.profitDiff) - Math.abs(x.profitDiff));
}

export type Comparison = {
  aDate: string;
  bDate: string;
  a: DayMetrics;
  b: DayMetrics;
  rows: MetricRow[];
  products: ProductCompareRow[];
  winner: "a" | "b" | "tie"; // by total profit
  insights: string[];
};

// Factual, data-backed insights only — no speculation. Each bullet is derived
// straight from the numbers above and is skipped when it isn't supported.
function buildInsights(c: {
  aDate: string;
  bDate: string;
  a: DayMetrics;
  b: DayMetrics;
  products: ProductCompareRow[];
  winner: "a" | "b" | "tie";
}): string[] {
  const { a, b, aDate, bDate, products, winner } = c;
  if (winner === "tie") {
    if (a.sales === 0 && b.sales === 0) return ["No sales on either date — nothing to compare."];
    return ["Both dates produced the same total profit."];
  }
  const win = winner === "a" ? { m: a, date: aDate, other: b, otherDate: bDate } : { m: b, date: bDate, other: a, otherDate: aDate };
  const out: string[] = [];

  const salesGap = win.m.sales - win.other.sales;
  if (salesGap > 0) {
    const pct = win.other.sales ? ` (${signedPct(pctFrom(win.m.sales, win.other.sales))})` : "";
    out.push(`${win.date} had ${salesGap} more ${salesGap === 1 ? "sale" : "sales"} than ${win.otherDate}${pct}.`);
  } else if (salesGap < 0) {
    out.push(`${win.date} had ${Math.abs(salesGap)} fewer sales than ${win.otherDate}, yet still made more profit — each order was more profitable.`);
  }

  const profitGap = round2(win.m.profit - win.other.profit);
  if (profitGap !== 0) {
    const pct = win.other.profit ? ` (${signedPct(pctFrom(win.m.profit, win.other.profit))})` : "";
    out.push(`Total profit was ${money(Math.abs(profitGap))} higher on ${win.date}${pct}.`);
  }

  const ppoGap = round2(win.m.avgProfitPerSale - win.other.avgProfitPerSale);
  if (Math.abs(ppoGap) >= 0.005) {
    const dir = ppoGap > 0 ? "higher" : "lower";
    out.push(`Average profit per order was ${money(Math.abs(ppoGap))} ${dir} on ${win.date} (${money(win.m.avgProfitPerSale)} vs ${money(win.other.avgProfitPerSale)}).`);
  }

  const priceGap = round2(win.m.avgSalePrice - win.other.avgSalePrice);
  if (Math.abs(priceGap) >= 0.005) {
    const dir = priceGap > 0 ? "higher" : "lower";
    out.push(`Average selling price was ${money(Math.abs(priceGap))} ${dir} on ${win.date} (${money(win.m.avgSalePrice)} vs ${money(win.other.avgSalePrice)}).`);
  }

  const marginGap = round2(win.m.marginPct - win.other.marginPct);
  if (Math.abs(marginGap) >= 0.05) {
    const dir = marginGap > 0 ? "higher" : "lower";
    out.push(`Profit margin was ${Math.abs(marginGap).toFixed(1)}% ${dir} on ${win.date} (${win.m.marginPct.toFixed(1)}% vs ${win.other.marginPct.toFixed(1)}%).`);
  }

  // Product that most explains the profit gap, in the winning date's favour.
  const topProduct = products
    .filter((p) => (winner === "a" ? p.profitDiff > 0 : p.profitDiff < 0))
    .sort((x, y) => Math.abs(y.profitDiff) - Math.abs(x.profitDiff))[0];
  if (topProduct && Math.abs(topProduct.profitDiff) >= 0.01) {
    out.push(`${topProduct.product} generated ${money(Math.abs(topProduct.profitDiff))} more profit on ${win.date}.`);
  }

  // Product-mix share shift: the product whose share of orders moved the most.
  if (a.sales > 0 && b.sales > 0) {
    let best: { product: string; aShare: number; bShare: number; gap: number } | null = null;
    for (const p of products) {
      const aShare = (p.aSales / a.sales) * 100;
      const bShare = (p.bSales / b.sales) * 100;
      const gap = Math.abs(aShare - bShare);
      if (!best || gap > best.gap) best = { product: p.product, aShare, bShare, gap };
    }
    if (best && best.gap >= 1) {
      out.push(`${best.product} represented ${best.aShare.toFixed(0)}% of orders on ${aDate} compared with ${best.bShare.toFixed(0)}% on ${bDate}.`);
    }
  }

  return out;
}

export function buildComparison(aDate: string, bDate: string, aOrders: Order[], bOrders: Order[]): Comparison {
  const a = computeDayMetrics(aOrders);
  const b = computeDayMetrics(bOrders);
  const rows = buildMetricRows(a, b);
  const products = buildProductRows(aOrders, bOrders);
  let winner: "a" | "b" | "tie" = "tie";
  if (!nearlyEqual(a.profit, b.profit)) winner = a.profit > b.profit ? "a" : "b";
  const insights = buildInsights({ aDate, bDate, a, b, products, winner });
  return { aDate, bDate, a, b, rows, products, winner, insights };
}

// --- tiny local formatters (kept here so insights read naturally) ---
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
function pctFrom(a: number, b: number): number {
  return b ? ((a - b) / Math.abs(b)) * 100 : 0;
}
function signedPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}
