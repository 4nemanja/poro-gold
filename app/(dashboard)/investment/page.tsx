import { getInvestment, LEDGER_START } from "@/lib/data";
import { loadOrders } from "@/lib/ordersView";
import { isCompleted } from "@/lib/orderStatus";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { InvestmentModal } from "@/components/InvestmentModal";
import { formatCurrencyPrecise } from "@/lib/format";
import { platformBadgeClass } from "@/lib/platformBadge";
import { DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvestmentPage() {
  const inv = await getInvestment();
  const rate = inv.rsd_per_usd || 117;
  const toUsd = (amt: number | null | undefined, cur?: string | null) =>
    amt == null ? 0 : (cur ?? "USD").toUpperCase() === "RSD" ? amt / rate : amt;

  const { all } = await loadOrders();

  let spent = 0;
  let collected = 0;
  const ledger = all
    .filter((o) => o.cost != null && (o.date ?? "") >= LEDGER_START)
    .map((o) => {
      const costUsd = toUsd(o.cost, o.currency);
      const revUsd = isCompleted(o.status) ? toUsd(o.sold_for, o.currency) : 0;
      spent += costUsd;
      collected += revUsd;
      return { o, costUsd, revUsd };
    })
    .sort((a, b) => (b.o.date ?? "").localeCompare(a.o.date ?? ""));
  const netPosition = inv.invested_usd - spent + collected;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Investment</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Your capital, drawn down by supplier payments. Counting from {LEDGER_START}; only orders with a recorded cost.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <span className="text-sm text-zinc-500">Invested</span>
            <InvestmentModal investment={inv} />
          </div>
          <div className="mt-3 text-3xl font-bold text-zinc-900">{formatCurrencyPrecise(inv.invested_usd)}</div>
          {inv.note && <div className="text-xs text-zinc-400 mt-1">{inv.note}</div>}
        </Card>
        <StatCard label="Spent on Suppliers" value={formatCurrencyPrecise(spent)} icon={<DollarSign size={18} />} iconClass="bg-rose-50 text-rose-600" />
        <StatCard label="Revenue Collected" value={formatCurrencyPrecise(collected)} icon={<DollarSign size={18} />} iconClass="bg-emerald-50 text-emerald-600" />
        <Card>
          <span className="text-sm text-zinc-500">Net Position</span>
          <div className={`mt-3 text-3xl font-bold ${netPosition >= inv.invested_usd ? "text-emerald-600" : "text-zinc-900"}`}>
            {formatCurrencyPrecise(netPosition)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Invested − supplier costs + revenue collected</div>
        </Card>
      </div>

      <Card title="Transactions" action={<span className="text-xs text-zinc-400">supplier payments &amp; collections, newest first</span>}>
        {ledger.length === 0 ? (
          <p className="text-sm text-zinc-500">No transactions yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Website</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Product</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Supplier</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Cost Out</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {ledger.slice(0, 100).map(({ o, costUsd, revUsd }) => (
                <tr key={o.order_id} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3 text-sm text-zinc-500">{o.date ?? "—"}</td>
                  <td className="py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${platformBadgeClass(o.platform)}`}>{o.platform ?? "—"}</span>
                  </td>
                  <td className="py-3 text-sm text-zinc-700 max-w-xs truncate">{o.product ?? "—"}</td>
                  <td className="py-3 text-sm text-zinc-500">{o.supplier ?? "—"}</td>
                  <td className="py-3 text-sm font-mono text-rose-600 text-right">{costUsd ? `-${formatCurrencyPrecise(costUsd)}` : "—"}</td>
                  <td className="py-3 text-sm font-mono text-emerald-600 text-right">{revUsd ? `+${formatCurrencyPrecise(revUsd)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
