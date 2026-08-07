import { sumRevenue, sumCost, sumProfit, sumFees } from "@/lib/data";
import { loadOrders, todayISO, notRefunded } from "@/lib/ordersView";
import { Card } from "@/components/ui/Card";
import { TrackerDatePicker } from "@/components/TrackerDatePicker";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import type { Order } from "@/lib/types";
import { Target, TrendingUp, TrendingDown, Check, X } from "lucide-react";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Out-of-pocket cost on an order: supplier cost + fees (supplier profit-share is
// foregone profit, not a cash cost — same convention as Profit & Costs).
function costOf(orders: Order[]): number {
  return sumCost(orders) + sumFees(orders);
}

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const { all: everything } = await loadOrders();
  // Refunded orders never count toward KPIs.
  const all = everything.filter(notRefunded);
  const today = todayISO();
  // Selected day drives the whole page (defaults to today, never the future).
  const sel = ISO_DATE.test(sp.date ?? "") && sp.date! <= today ? sp.date! : today;
  const isToday = sel === today;

  const now = new Date(sel + "T00:00:00Z");
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based month of the selected day
  const dayOfMonth = now.getUTCDate();

  // KPI baseline = the previous full calendar month. Its daily averages become
  // the targets to beat, and they roll forward automatically each month.
  const prevStart = new Date(Date.UTC(y, m - 1, 1));
  const prevEnd = new Date(Date.UTC(y, m, 0)); // day 0 of this month = last day of previous month
  const prevFrom = prevStart.toISOString().slice(0, 10);
  const prevTo = prevEnd.toISOString().slice(0, 10);
  const daysInPrev = prevEnd.getUTCDate();
  const prevLabel = prevStart.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const prevOrders = all.filter((o) => !!o.date && o.date >= prevFrom && o.date <= prevTo);
  const hasBaseline = prevOrders.length > 0;

  const prevTotals = {
    profit: sumProfit(prevOrders),
    revenue: sumRevenue(prevOrders),
    orders: prevOrders.length,
    cost: costOf(prevOrders),
  };
  const target = {
    profit: prevTotals.profit / daysInPrev,
    revenue: prevTotals.revenue / daysInPrev,
    orders: prevTotals.orders / daysInPrev,
    cost: prevTotals.cost / daysInPrev,
  };

  // Selected day's actuals.
  const dayOrders = all.filter((o) => o.date === sel);
  const actual = {
    profit: sumProfit(dayOrders),
    revenue: sumRevenue(dayOrders),
    orders: dayOrders.length,
    cost: costOf(dayOrders),
  };

  // Month-to-date pace (up to and including the selected day) vs where we
  // should be by then.
  const monthFrom = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const monthOrders = all.filter((o) => !!o.date && o.date >= monthFrom && o.date <= sel);
  const mtdProfit = sumProfit(monthOrders);
  const expectedProfit = target.profit * dayOfMonth;
  const paceDelta = mtdProfit - expectedProfit;

  // Daily log — last 14 days, newest first, scored against the daily profit target.
  const log: { date: string; orders: Order[] }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.UTC(y, m, dayOfMonth - i)).toISOString().slice(0, 10);
    log.push({ date: d, orders: all.filter((o) => o.date === d) });
  }

  const tiles = [
    { key: "profit", label: "Profit", value: actual.profit, target: target.profit, money: true },
    { key: "revenue", label: "Revenue", value: actual.revenue, target: target.revenue, money: true },
    { key: "orders", label: "Orders", value: actual.orders, target: target.orders, money: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Daily Tracker</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Your daily KPIs vs the targets to hit — set from last month&apos;s average.
        </p>
      </div>

      {/* Baseline / targets */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Target size={16} className="text-emerald-600" /> Daily Targets
          </span>
        }
        action={<span className="text-xs text-zinc-400">based on {prevLabel}</span>}
      >
        {hasBaseline ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-500">
              {prevLabel}: {formatCurrencyPrecise(prevTotals.profit)} profit from {formatNum(prevTotals.orders)} orders
              over {daysInPrev} days
            </div>
            <div className="flex flex-wrap gap-6">
              <TargetStat label="Profit / day" value={formatCurrencyPrecise(target.profit)} />
              <TargetStat label="Revenue / day" value={formatCurrencyPrecise(target.revenue)} />
              <TargetStat label="Orders / day" value={target.orders.toFixed(1)} />
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">
            No orders in {prevLabel} yet, so there is no baseline to set targets from.
          </div>
        )}
      </Card>

      {/* Selected day vs target */}
      <div>
        <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-zinc-700">{isToday ? "Today" : "On"} — {sel}</h2>
            <span className="text-xs text-zinc-400">
              {formatNum(actual.orders)} orders{isToday ? " so far" : ""}
            </span>
          </div>
          <TrackerDatePicker date={sel} today={today} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tiles.map((t) => {
            const met = hasBaseline && t.value >= t.target;
            const pct = t.target > 0 ? Math.round((t.value / t.target) * 100) : 0;
            const fmt = (n: number) => (t.money ? formatCurrencyPrecise(n) : formatNum(Math.round(n)));
            return (
              <Card key={t.key}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700">{t.label}</span>
                  {hasBaseline &&
                    (met ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <Check size={14} /> Target met
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        <X size={14} /> {pct}% of target
                      </span>
                    ))}
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-zinc-900">{fmt(t.value)}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  target {hasBaseline ? fmt(t.target) : "—"}
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-amber-400"}`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Month-to-date pace */}
      <Card title={`Month-to-date pace — ${sel.slice(0, 7)}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-500">
            Day {dayOfMonth} of the month — you should be around{" "}
            <span className="font-mono text-zinc-700">{formatCurrencyPrecise(expectedProfit)}</span> profit by{" "}
            {isToday ? "now" : sel}.
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-xs text-zinc-400 uppercase">MTD Profit</div>
              <div className="font-mono text-lg font-bold text-emerald-600">{formatCurrencyPrecise(mtdProfit)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase">vs pace</div>
              <div className={`flex items-baseline gap-1 font-mono text-lg font-bold ${paceDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {paceDelta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {paceDelta >= 0 ? "+" : "−"}
                {formatCurrencyPrecise(Math.abs(paceDelta))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Daily log */}
      <Card title="Daily Log" action={<span className="text-xs text-zinc-400">last 14 days · vs profit target</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Orders</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Revenue</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Costs</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Profit</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Target</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-center">Hit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {log.map((d) => {
                const profit = sumProfit(d.orders);
                const empty = d.orders.length === 0;
                const met = hasBaseline && profit >= target.profit;
                const rowIsToday = d.date === today;
                const rowIsSel = d.date === sel;
                return (
                  <tr key={d.date} className={`transition-colors ${rowIsSel ? "bg-emerald-50/60" : "hover:bg-zinc-50"} ${empty ? "text-zinc-300" : ""}`}>
                    <td className="py-3 text-sm text-zinc-600 whitespace-nowrap">
                      {d.date}
                      {rowIsToday && <span className="ml-2 text-[10px] font-medium text-emerald-600 uppercase">today</span>}
                      {rowIsSel && !rowIsToday && <span className="ml-2 text-[10px] font-medium text-emerald-600 uppercase">selected</span>}
                    </td>
                    <td className="py-3 text-sm font-mono text-right">{formatNum(d.orders.length)}</td>
                    <td className="py-3 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(sumRevenue(d.orders))}</td>
                    <td className="py-3 text-sm font-mono text-rose-600 text-right">{formatCurrencyPrecise(costOf(d.orders))}</td>
                    <td className={`py-3 text-sm font-mono text-right ${empty ? "" : profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatCurrencyPrecise(profit)}
                    </td>
                    <td className="py-3 text-sm font-mono text-zinc-400 text-right">{hasBaseline ? formatCurrencyPrecise(target.profit) : "—"}</td>
                    <td className="py-3 text-center">
                      {empty ? (
                        <span className="text-zinc-300">—</span>
                      ) : met ? (
                        <Check size={16} className="inline text-emerald-600" />
                      ) : (
                        <X size={16} className="inline text-rose-400" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TargetStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-400 uppercase">{label}</div>
      <div className="font-mono text-lg font-bold text-emerald-600">{value}</div>
    </div>
  );
}
