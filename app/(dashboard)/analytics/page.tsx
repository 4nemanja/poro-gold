import { sumRevenue, sumCost, sumProfit, sumFees, sumSupplierCuts } from "@/lib/data";
import { loadOrders, todayISO } from "@/lib/ordersView";
import { Card } from "@/components/ui/Card";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import type { Order } from "@/lib/types";
import { TrendingUp, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

// Your out-of-pocket costs on an order: what you paid the supplier + any fee.
// (A supplier's profit-share is foregone profit, not an out-of-pocket cost, so
// it's tracked separately.)
function costOf(orders: Order[]): number {
  return sumCost(orders) + sumFees(orders);
}

function shiftDays(dateISO: string, delta: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function inWindow(o: Order, from: string, to: string) {
  return !!o.date && o.date >= from && o.date <= to;
}

export default async function AnalyticsPage() {
  const { all } = await loadOrders();
  const today = todayISO();
  const weekAgo = shiftDays(today, -6); // last 7 days incl. today
  const monthAgo = shiftDays(today, -29); // last 30 days incl. today

  const todays = all.filter((o) => o.date === today);
  const week = all.filter((o) => inWindow(o, weekAgo, today));
  const month = all.filter((o) => inWindow(o, monthAgo, today));

  const summary = [
    { key: "today", label: "Today", orders: todays, sub: today },
    { key: "week", label: "This Week", orders: week, sub: `${weekAgo} → ${today}` },
    { key: "month", label: "This Month", orders: month, sub: `${monthAgo} → ${today}` },
    { key: "all", label: "All Time", orders: all, sub: "everything" },
  ];

  // Daily breakdown, last 14 days (newest first).
  const days: { date: string; orders: Order[] }[] = [];
  for (let i = 0; i < 14; i++) {
    const date = shiftDays(today, -i);
    days.push({ date, orders: all.filter((o) => o.date === date) });
  }

  // Weekly breakdown, last 8 weeks (Mon–Sun windows, newest first).
  const weeks: { label: string; from: string; to: string; orders: Order[] }[] = [];
  // Find the Monday of the current week (UTC).
  const todayDate = new Date(today + "T00:00:00Z");
  const dow = (todayDate.getUTCDay() + 6) % 7; // 0 = Monday
  const thisMonday = shiftDays(today, -dow);
  for (let i = 0; i < 8; i++) {
    const from = shiftDays(thisMonday, -7 * i);
    const to = shiftDays(from, 6);
    weeks.push({ label: from, from, to, orders: all.filter((o) => inWindow(o, from, to)) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Profit &amp; Costs</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Profit you made and what it cost you — today, this week, this month, and all time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => (
          <Card key={s.key}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700">{s.label}</span>
              <span className="text-xs text-zinc-400">{formatNum(s.orders.length)} orders</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <TrendingUp size={16} className="text-emerald-600" />
              <span className="text-2xl font-bold text-emerald-600">{formatCurrencyPrecise(sumProfit(s.orders))}</span>
              <span className="text-xs text-zinc-400 ml-1">profit</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1 text-sm">
              <TrendingDown size={14} className="text-rose-500" />
              <span className="font-mono text-rose-600">{formatCurrencyPrecise(costOf(s.orders))}</span>
              <span className="text-xs text-zinc-400 ml-1">costs</span>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Daily Breakdown" action={<span className="text-xs text-zinc-400">last 14 days</span>}>
        <BreakdownTable
          rows={days.map((d) => ({ label: d.date, orders: d.orders }))}
          firstCol="Date"
        />
      </Card>

      <Card title="Weekly Breakdown" action={<span className="text-xs text-zinc-400">last 8 weeks (Mon–Sun)</span>}>
        <BreakdownTable
          rows={weeks.map((w) => ({ label: `${w.from} → ${w.to}`, orders: w.orders }))}
          firstCol="Week"
        />
      </Card>
    </div>
  );
}

function BreakdownTable({ rows, firstCol }: { rows: { label: string; orders: Order[] }[]; firstCol: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">{firstCol}</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Orders</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Revenue</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Supplier Cost</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Fees</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Supplier Cut</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Costs</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {rows.map((r) => {
            const cost = sumCost(r.orders);
            const fees = sumFees(r.orders);
            const profit = sumProfit(r.orders);
            const cut = sumSupplierCuts(r.orders);
            const empty = r.orders.length === 0;
            return (
              <tr key={r.label} className={`hover:bg-zinc-50 transition-colors ${empty ? "text-zinc-300" : ""}`}>
                <td className="py-3 text-sm text-zinc-600 whitespace-nowrap">{r.label}</td>
                <td className="py-3 text-sm font-mono text-right">{formatNum(r.orders.length)}</td>
                <td className="py-3 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(sumRevenue(r.orders))}</td>
                <td className="py-3 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(cost)}</td>
                <td className="py-3 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(fees)}</td>
                <td className="py-3 text-sm font-mono text-violet-600 text-right">{cut ? formatCurrencyPrecise(cut) : "—"}</td>
                <td className="py-3 text-sm font-mono text-rose-600 text-right">{formatCurrencyPrecise(cost + fees)}</td>
                <td className={`py-3 text-sm font-mono text-right ${empty ? "" : profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatCurrencyPrecise(profit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
