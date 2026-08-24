import { sumRevenue, sumCost, sumProfit, sumFees, sumSupplierCuts, sumWithdrawalFees } from "./data";
import { statusCategory } from "./orderStatus";
import { eachDay, weekdayOf, type WeekRange } from "./weeks";
import type { Order, DailyNote } from "./types";
import type { InvestmentBatch } from "./data";

// Everything the Weekly Review page shows, computed in one place. Like
// compareDates, this never invents its own totals — revenue/cost/fee/profit all
// come from the same sum helpers Profit & Costs and Products use, so a week here
// can never disagree with the rest of the dashboard.
//
// Convention, matching every other analytics view: a refunded or cancelled order
// earned nothing and is excluded from revenue, profit and margin. Refunds are
// reported separately, as their own line.

function safeDiv(n: number, d: number): number {
  return d ? n / d : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isLive(o: Order): boolean {
  const c = statusCategory(o.status);
  return c !== "refunded" && c !== "cancelled";
}

export type WeekTotals = {
  orders: number;
  revenue: number;
  supplierCost: number;
  sellingFees: number; // marketplace commission
  withdrawalFees: number; // cost of cashing out
  supplierCut: number; // foregone profit paid to a splitting supplier
  profit: number;
  marginPct: number;
  aov: number; // average order value
  profitPerOrder: number;
  refundCount: number;
  refundValue: number;
  refundRatePct: number; // refunds / (live + refunds)
  inProgressCount: number;
  inProgressValue: number;
  missingCostCount: number; // live orders with no supplier cost recorded
  missingCostRevenue: number;
  activeDays: number; // days in the week with at least one order
};

export function computeTotals(rows: Order[]): WeekTotals {
  const live = rows.filter(isLive);
  const refunded = rows.filter((o) => statusCategory(o.status) === "refunded");
  const inProgress = live.filter((o) => statusCategory(o.status) === "in_delivery");
  const missing = live.filter((o) => o.cost == null);

  const revenue = round2(sumRevenue(live));
  const profit = round2(sumProfit(live));
  const denominator = live.length + refunded.length;

  return {
    orders: live.length,
    revenue,
    supplierCost: round2(sumCost(live)),
    sellingFees: round2(sumFees(live)),
    withdrawalFees: round2(sumWithdrawalFees(live)),
    supplierCut: round2(sumSupplierCuts(live)),
    profit,
    marginPct: round2(safeDiv(profit, revenue) * 100),
    aov: round2(safeDiv(revenue, live.length)),
    profitPerOrder: round2(safeDiv(profit, live.length)),
    refundCount: refunded.length,
    refundValue: round2(sumRevenue(refunded)),
    refundRatePct: round2(safeDiv(refunded.length, denominator) * 100),
    inProgressCount: inProgress.length,
    inProgressValue: round2(sumRevenue(inProgress)),
    missingCostCount: missing.length,
    missingCostRevenue: round2(sumRevenue(missing)),
    activeDays: new Set(live.map((o) => o.date)).size,
  };
}

// Revenue that can't be explained by cost + fees + cut + profit. It's exactly the
// revenue of orders logged with no supplier cost, so surfacing it stops the
// breakdown from silently not adding up.
export function unaccounted(t: WeekTotals): number {
  return round2(t.revenue - t.supplierCost - t.sellingFees - t.withdrawalFees - t.supplierCut - t.profit);
}

export type GroupRow = {
  key: string;
  orders: number;
  revenue: number;
  supplierCost: number;
  profit: number;
  marginPct: number;
  costRatioPct: number; // supplier cost as a % of the sale price
  revenueSharePct: number;
};

/** Group live orders by one of their fields, richest first. */
export function groupBy(rows: Order[], field: "platform" | "supplier" | "product"): GroupRow[] {
  const live = rows.filter(isLive);
  const total = sumRevenue(live);
  const buckets = new Map<string, Order[]>();
  for (const o of live) {
    const key = (o[field] as string | null) ?? "— not set —";
    const list = buckets.get(key);
    if (list) list.push(o);
    else buckets.set(key, [o]);
  }
  return [...buckets.entries()]
    .map(([key, list]) => {
      const revenue = round2(sumRevenue(list));
      const profit = round2(sumProfit(list));
      const supplierCost = round2(sumCost(list));
      return {
        key,
        orders: list.length,
        revenue,
        supplierCost,
        profit,
        marginPct: round2(safeDiv(profit, revenue) * 100),
        costRatioPct: round2(safeDiv(supplierCost, revenue) * 100),
        revenueSharePct: round2(safeDiv(revenue, total) * 100),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export type DayRow = {
  date: string;
  weekday: string;
  orders: number;
  revenue: number;
  profit: number;
  marginPct: number;
  refunds: number;
  pendingEntry: boolean; // day has happened, but its sales probably aren't logged yet
  future: boolean; // day hasn't happened yet — an empty row here means nothing
};

export function dayRows(week: WeekRange, rows: Order[], completeThrough: string | null, today: string): DayRow[] {
  return eachDay(week.from, week.to).map((date) => {
    const onDay = rows.filter((o) => o.date === date);
    const live = onDay.filter(isLive);
    const revenue = round2(sumRevenue(live));
    const profit = round2(sumProfit(live));
    return {
      date,
      weekday: weekdayOf(date),
      orders: live.length,
      revenue,
      profit,
      marginPct: round2(safeDiv(profit, revenue) * 100),
      refunds: onDay.filter((o) => statusCategory(o.status) === "refunded").length,
      // A day only counts as "waiting on data entry" once it has actually
      // happened. Future days are empty because they haven't come round yet.
      pendingEntry: completeThrough != null && date > completeThrough && date <= today,
      future: date > today,
    };
  });
}

// --- data freshness -------------------------------------------------------
//
// Manual orders (PlayerOK, iGV, KupujemProdajem) are typed in by hand a day or
// so after the sale, so the most recent days always look dead until someone
// enters them. Reporting a week without saying so makes a logging gap look like
// a sales collapse. We measure the habit rather than assume it: take the median
// gap between the sale date and when it was entered, and treat anything after
// (last entry − that gap) as "not in yet".

export type Freshness = {
  lastEntryAt: string | null; // ISO timestamp of the newest manual entry
  lagDays: number; // typical delay between a sale and it being logged
  completeThrough: string | null; // last date we believe is fully logged
};

const FRESHNESS_SAMPLE = 60;

export function freshness(all: Order[]): Freshness {
  const manual = all
    .filter((o) => o.source === "manual" && o.added_at && o.date)
    .sort((a, b) => (b.added_at as string).localeCompare(a.added_at as string));

  if (manual.length === 0) return { lastEntryAt: null, lagDays: 0, completeThrough: null };

  const lags = manual
    .slice(0, FRESHNESS_SAMPLE)
    .map((o) => Math.round((Date.parse(`${(o.added_at as string).slice(0, 10)}T00:00:00Z`) - Date.parse(`${o.date}T00:00:00Z`)) / 86400000))
    .filter((n) => n >= 0)
    .sort((a, b) => a - b);

  const lagDays = lags.length ? lags[Math.floor(lags.length / 2)] : 0;
  const lastEntryAt = manual[0].added_at as string;
  const completeThrough = new Date(Date.parse(`${lastEntryAt.slice(0, 10)}T00:00:00Z`) - lagDays * 86400000)
    .toISOString()
    .slice(0, 10);

  return { lastEntryAt, lagDays, completeThrough };
}

// --- deltas ---------------------------------------------------------------

export type Delta = {
  abs: number;
  pct: number | null; // null when the previous value was 0
  direction: "up" | "down" | "flat";
};

export function delta(current: number, previous: number, epsilon = 0.005): Delta {
  const abs = round2(current - previous);
  const direction = Math.abs(abs) < epsilon ? "flat" : abs > 0 ? "up" : "down";
  return { abs, pct: previous === 0 ? null : round2((current - previous) / Math.abs(previous) * 100), direction };
}

// --- the whole page in one object ----------------------------------------

export type WeekSlice = {
  week: WeekRange;
  totals: WeekTotals;
  isSelected: boolean;
};

export type WeeklyReview = {
  week: WeekRange;
  totals: WeekTotals;
  previous: { week: WeekRange; totals: WeekTotals } | null;
  monthWeeks: WeekSlice[]; // every week of the month, for the trend table
  monthTotals: WeekTotals;
  days: DayRow[];
  byPlatform: GroupRow[];
  bySupplier: GroupRow[];
  byProduct: GroupRow[];
  refunds: Order[];
  notes: DailyNote[];
  capitalDeployed: number;
  returnOnCapitalPct: number | null;
  freshness: Freshness;
  pendingDays: string[]; // days in this week that probably aren't logged yet
  takeaways: Takeaway[];
};

export type Takeaway = {
  tone: "good" | "bad" | "warn" | "info";
  text: string;
};

export function buildWeeklyReview(opts: {
  week: WeekRange;
  previousWeek: WeekRange | null;
  allWeeks: WeekRange[];
  orders: Order[]; // every order, unfiltered
  notes: DailyNote[];
  batches: InvestmentBatch[];
  today: string;
}): WeeklyReview {
  const { week, previousWeek, allWeeks, orders, notes, batches, today } = opts;
  const inRange = (from: string, to: string) => orders.filter((o) => !!o.date && o.date >= from && o.date <= to);

  const rows = inRange(week.from, week.to);
  const totals = computeTotals(rows);
  const fresh = freshness(orders);

  const previous = previousWeek
    ? { week: previousWeek, totals: computeTotals(inRange(previousWeek.from, previousWeek.to)) }
    : null;

  const monthWeeks = allWeeks.map((w) => ({
    week: w,
    totals: computeTotals(inRange(w.from, w.to)),
    isSelected: w.index === week.index,
  }));

  const monthStart = `${week.monthKey}-01`;
  const monthEnd = allWeeks[allWeeks.length - 1].to;
  const monthTotals = computeTotals(inRange(monthStart, monthEnd));

  const capitalDeployed = round2(
    batches.filter((b) => b.date >= week.from && b.date <= week.to).reduce((acc, b) => acc + (Number(b.amount) || 0), 0),
  );

  const days = dayRows(week, rows, fresh.completeThrough, today);

  return {
    week,
    totals,
    previous,
    monthWeeks,
    monthTotals,
    days,
    byPlatform: groupBy(rows, "platform"),
    bySupplier: groupBy(rows, "supplier"),
    byProduct: groupBy(rows, "product"),
    refunds: rows.filter((o) => statusCategory(o.status) === "refunded").sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    notes: notes.filter((n) => n.date >= week.from && n.date <= week.to).sort((a, b) => a.date.localeCompare(b.date)),
    capitalDeployed,
    returnOnCapitalPct: capitalDeployed > 0 ? round2(safeDiv(totals.profit, capitalDeployed) * 100) : null,
    freshness: fresh,
    pendingDays: days.filter((d) => d.pendingEntry).map((d) => d.date),
    takeaways: buildTakeaways({ week, totals, previous, byPlatform: groupBy(rows, "platform"), refunds: rows.filter((o) => statusCategory(o.status) === "refunded") }),
  };
}

// Plain-language reads of the week. Every line is derived from a threshold on
// real numbers, so nothing here can say something the tables don't show.
function buildTakeaways(a: {
  week: WeekRange;
  totals: WeekTotals;
  previous: { week: WeekRange; totals: WeekTotals } | null;
  byPlatform: GroupRow[];
  refunds: Order[];
}): Takeaway[] {
  const out: Takeaway[] = [];
  const { totals, previous, byPlatform, refunds } = a;

  if (totals.orders === 0) {
    return [{ tone: "info", text: "No orders are logged for this week yet." }];
  }

  if (previous && previous.totals.orders > 0) {
    const d = delta(totals.profit, previous.totals.profit);
    const rev = delta(totals.revenue, previous.totals.revenue);
    const pctText = d.pct == null ? "" : ` (${d.pct >= 0 ? "+" : "−"}${Math.abs(d.pct).toFixed(0)}%)`;
    out.push({
      tone: d.direction === "up" ? "good" : d.direction === "down" ? "bad" : "info",
      text: `Profit ${d.direction === "up" ? "rose" : d.direction === "down" ? "fell" : "held"} to $${totals.profit.toFixed(2)} from $${previous.totals.profit.toFixed(2)}${pctText}, on revenue ${rev.direction === "up" ? "up" : rev.direction === "down" ? "down" : "flat"} at $${totals.revenue.toFixed(2)}.`,
    });

    const m = round2(totals.marginPct - previous.totals.marginPct);
    if (Math.abs(m) >= 0.5) {
      out.push({
        tone: m > 0 ? "good" : "bad",
        text: `Net margin ${m > 0 ? "improved" : "compressed"} by ${Math.abs(m).toFixed(1)} points, ${previous.totals.marginPct.toFixed(1)}% → ${totals.marginPct.toFixed(1)}%.`,
      });
    }
  }

  // Thin-margin platforms are the single most common cause of a soft week.
  const thin = byPlatform.filter((p) => p.revenue >= 100 && p.marginPct < 4);
  for (const p of thin) {
    out.push({
      tone: "bad",
      text: `${p.key} is running at ${p.marginPct.toFixed(1)}% margin on $${p.revenue.toFixed(2)} of revenue — supplier cost is ${p.costRatioPct.toFixed(1)}% of the sale price there.`,
    });
  }

  const best = byPlatform.find((p) => p.revenue >= 100 && p.marginPct >= 7);
  if (best) {
    out.push({
      tone: "good",
      text: `${best.key} carried the week: $${best.revenue.toFixed(2)} across ${best.orders} orders at ${best.marginPct.toFixed(1)}% margin.`,
    });
  }

  // Concentration: one platform or supplier holding most of the revenue is a risk
  // worth naming even in a good week.
  const top = byPlatform[0];
  if (top && top.revenueSharePct >= 70) {
    out.push({
      tone: "warn",
      text: `${top.key} is ${top.revenueSharePct.toFixed(0)}% of the week's revenue — an outage or ban there removes most of the income.`,
    });
  }

  if (refunds.length > 0) {
    const platforms = [...new Set(refunds.map((r) => r.platform ?? "—"))];
    const noReason = refunds.filter((r) => !r.refund_reason).length;
    out.push({
      tone: "warn",
      text:
        platforms.length === 1
          ? `All ${refunds.length} refunds this week came from ${platforms[0]}${noReason ? `, and ${noReason} have no reason recorded` : ""}.`
          : `${refunds.length} refunds across ${platforms.length} platforms${noReason ? `, ${noReason} with no reason recorded` : ""}.`,
    });
  }

  if (totals.missingCostCount > 0) {
    out.push({
      tone: "warn",
      text: `${totals.missingCostCount} orders ($${totals.missingCostRevenue.toFixed(2)} of revenue) were logged with no supplier cost, so their profit counts as zero and this week is understated.`,
    });
  }

  return out;
}
