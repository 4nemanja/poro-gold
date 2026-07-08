import { sumRevenue, getWithdrawalFees } from "@/lib/data";
import { WORKSPACES } from "@/lib/workspaces";
import { loadOrders, resolvePeriod, inRange, makeStatusMatch, type ViewParams } from "@/lib/ordersView";
import { isCompleted } from "@/lib/orderStatus";
import { Card } from "@/components/ui/Card";
import { PeriodFilter } from "@/components/PeriodFilter";
import { StatusFilter } from "@/components/StatusFilter";
import { WithdrawalFeeCell } from "@/components/WithdrawalFeeCell";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import { platformBadgeClass } from "@/lib/platformBadge";

export const dynamic = "force-dynamic";

export default async function ByWebsite({
  searchParams,
}: {
  searchParams: Promise<ViewParams>;
}) {
  const sp = await searchParams;
  // Default to all-time here so every recorded sale shows up. A "today"-only
  // default previously hid any sale not dated today, which read as a bug.
  const { from, to, label } = resolvePeriod(sp, "all");
  const statusMatch = makeStatusMatch(sp);
  const [{ perWs }, fees] = await Promise.all([loadOrders(), getWithdrawalFees()]);

  const rows = WORKSPACES.map((w, i) => {
    const p = perWs[i].filter((o) => inRange(o, from, to) && statusMatch(o));
    return {
      ...w,
      orders: p.length,
      completed: p.filter((o) => isCompleted(o.status)).length,
      revenue: sumRevenue(p),
      withdrawalFee: fees[w.slug] ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">By Website</h1>
          <p className="text-sm text-zinc-500 mt-1">Per-marketplace totals {label}.</p>
        </div>
        <PeriodFilter defaultRange="all" />
      </div>

      <StatusFilter />

      <Card title="By Website">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Website</th>
              <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Source</th>
              <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Orders</th>
              <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Completed</th>
              <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Revenue</th>
              <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Withdrawal Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {rows.map((b) => (
              <tr key={b.slug} className="hover:bg-zinc-50 transition-colors">
                <td className="py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${platformBadgeClass(b.slug)}`}>{b.name}</span>
                </td>
                <td className="py-4 text-sm text-zinc-500">
                  {b.source === "api" ? "Live API" : b.source === "excel" ? "Excel export" : "Manual"}
                </td>
                <td className="py-4 text-sm font-mono text-zinc-700 text-right">{formatNum(b.orders)}</td>
                <td className="py-4 text-sm font-mono text-zinc-700 text-right">{formatNum(b.completed)}</td>
                <td className="py-4 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(b.revenue)}</td>
                <td className="py-4 text-sm text-right">
                  <WithdrawalFeeCell slug={b.slug} pct={b.withdrawalFee} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
