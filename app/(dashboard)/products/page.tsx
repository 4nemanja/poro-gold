import { loadOrders, resolvePeriod, inRange, makeStatusMatch, type ViewParams } from "@/lib/ordersView";
import { rankOrders } from "@/lib/batches";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PeriodFilter } from "@/components/PeriodFilter";
import { StatusFilter } from "@/components/StatusFilter";
import { BreakdownTable } from "@/components/BreakdownTable";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import { Package, TrendingUp, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ViewParams>;
}) {
  const sp = await searchParams;
  const { from, to, label } = resolvePeriod(sp, "all");
  const statusMatch = makeStatusMatch(sp);
  const { all } = await loadOrders();

  const visible = all.filter((o) => inRange(o, from, to) && statusMatch(o));
  const products = rankOrders(visible, (o) => o.product ?? "—");

  const totalProfit = products.reduce((a, p) => a + p.profit, 0);
  const totalRevenue = products.reduce((a, p) => a + p.revenue, 0);
  const best = products[0] ?? null; // rankOrders sorts by profit desc

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
          <p className="text-sm text-zinc-500 mt-1">Every product and how much it made {label}. Click a column to sort.</p>
        </div>
        <PeriodFilter defaultRange="all" />
      </div>

      <StatusFilter />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Products" value={formatNum(products.length)} icon={<Package size={18} />} />
        <StatCard label="Revenue" value={formatCurrencyPrecise(totalRevenue)} icon={<DollarSign size={18} />} iconClass="bg-sky-50 text-sky-600" />
        <StatCard label="Profit" value={formatCurrencyPrecise(totalProfit)} icon={<TrendingUp size={18} />} iconClass="bg-emerald-50 text-emerald-600" />
        <Card>
          <span className="text-sm text-zinc-500">Top Earner</span>
          {best ? (
            <>
              <div className="mt-3 text-lg font-bold text-zinc-900 truncate">{best.name}</div>
              <div className="text-xs text-zinc-500 mt-1"><span className="text-emerald-600 font-medium">{formatCurrencyPrecise(best.profit)}</span> profit · {formatNum(best.count)} orders</div>
            </>
          ) : (
            <div className="mt-3 text-sm text-zinc-400">No data</div>
          )}
        </Card>
      </div>

      <Card title="All Products" action={<span className="text-xs text-zinc-400">{products.length} products {label}</span>}>
        <BreakdownTable rows={products} firstCol="Product" />
      </Card>
    </div>
  );
}
