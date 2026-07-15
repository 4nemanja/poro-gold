import { getSuppliers } from "@/lib/data";
import { loadOrders, resolvePeriod, inRange, makeStatusMatch, notRefunded, type ViewParams } from "@/lib/ordersView";
import { Card } from "@/components/ui/Card";
import { PeriodFilter } from "@/components/PeriodFilter";
import { StatusFilter } from "@/components/StatusFilter";
import { SupplierModal } from "@/components/SupplierModal";
import { DeleteSupplierButton } from "@/components/DeleteSupplierButton";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<ViewParams>;
}) {
  const sp = await searchParams;
  const { from, to, label } = resolvePeriod(sp, "all");
  const statusMatch = makeStatusMatch(sp);
  const [{ all }, managed] = await Promise.all([loadOrders(), getSuppliers()]);

  const visible = all.filter((o) => inRange(o, from, to) && statusMatch(o) && notRefunded(o));
  const map = new Map<string, { orders: number; cost: number; revenue: number; supplierCut: number; withdrawal: number }>();
  for (const o of visible) {
    if (!o.supplier) continue;
    const s = map.get(o.supplier) ?? { orders: 0, cost: 0, revenue: 0, supplierCut: 0, withdrawal: 0 };
    s.orders += 1;
    s.cost += o.cost ?? 0;
    s.revenue += o.sold_for ?? 0;
    s.supplierCut += o.supplier_cut ?? 0;
    s.withdrawal += o.withdrawal_fee ?? 0;
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
          <p className="text-sm text-zinc-500 mt-1">Manage suppliers and see per-supplier totals {label}.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <PeriodFilter defaultRange="all" />
          <SupplierModal />
        </div>
      </div>

      <Card title="Your Suppliers" action={<span className="text-xs text-zinc-400">{managed.length} saved</span>}>
        {managed.length === 0 ? (
          <p className="text-sm text-zinc-500">No suppliers saved yet. Use Add Supplier to create one with a FIXED or SPLIT profit system.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Supplier</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">What They Do</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Profit System</th>
                <th className="pb-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {managed.map((s) => (
                <tr key={s.name} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 text-sm font-medium text-zinc-900">{s.name}</td>
                  <td className="py-4 text-sm text-zinc-500 max-w-md">{s.description || "—"}</td>
                  <td className="py-4 text-sm">
                    {s.profit_system === "SPLIT" ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700">SPLIT · {s.share_pct}%</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">FIXED</span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <SupplierModal supplier={s} />
                      <DeleteSupplierButton name={s.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <StatusFilter />

      <Card title="Supplier Totals">
        {suppliers.length === 0 ? (
          <p className="text-sm text-zinc-500">No supplier activity in this view.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Supplier</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Orders</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Total Cost</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Revenue</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Withdrawal Fee</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Profit Share Taken</th>
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
                  <td className="py-4 text-sm font-mono text-rose-600 text-right">{s.withdrawal ? formatCurrencyPrecise(s.withdrawal) : "—"}</td>
                  <td className="py-4 text-sm font-mono text-violet-600 text-right">{s.supplierCut ? formatCurrencyPrecise(s.supplierCut) : "—"}</td>
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
