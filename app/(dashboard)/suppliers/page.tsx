import { loadOrders, resolvePeriod, inRange, makeStatusMatch, type ViewParams } from "@/lib/ordersView";
import { Card } from "@/components/ui/Card";
import { PeriodFilter } from "@/components/PeriodFilter";
import { StatusFilter } from "@/components/StatusFilter";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<ViewParams>;
}) {
  const sp = await searchParams;
  const { from, to, label } = resolvePeriod(sp);
  const statusMatch = makeStatusMatch(sp);
  const { all } = await loadOrders();

  const visible = all.filter((o) => inRange(o, from, to) && statusMatch(o));
  const map = new Map<string, { orders: number; cost: number; revenue: number }>();
  for (const o of visible) {
    if (!o.supplier) continue;
    const s = map.get(o.supplier) ?? { orders: 0, cost: 0, revenue: 0 };
    s.orders += 1;
    s.cost += o.cost ?? 0;
    s.revenue += o.sold_for ?? 0;
    map.set(o.supplier, s);
  }
  const suppliers = [...map.entries()]
    .map(([name, s]) => ({ name, ...s, margin: s.revenue - s.cost }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Suppliers</h1>
          <p className="text-sm text-zinc-500 mt-1">Per-supplier totals {label}.</p>
        </div>
        <PeriodFilter />
      </div>

      <StatusFilter />

      <Card title="Suppliers">
        {suppliers.length === 0 ? (
          <p className="text-sm text-zinc-500">No suppliers in this view. Add a supplier name when you log an order.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Supplier</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Orders</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Total Cost</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Revenue</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {suppliers.map((s) => (
                <tr key={s.name} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 text-sm font-medium text-zinc-900">{s.name}</td>
                  <td className="py-4 text-sm font-mono text-zinc-700 text-right">{formatNum(s.orders)}</td>
                  <td className="py-4 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(s.cost)}</td>
                  <td className="py-4 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(s.revenue)}</td>
                  <td className="py-4 text-sm font-mono text-emerald-600 text-right">{formatCurrencyPrecise(s.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
