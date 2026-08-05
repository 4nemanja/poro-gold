import { getTransactions, getSuppliers } from "@/lib/data";
import { todayISO } from "@/lib/ordersView";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { TransactionModal } from "@/components/TransactionModal";
import { DeleteTransactionButton } from "@/components/DeleteTransactionButton";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import type { SupplierTransaction } from "@/lib/types";
import { Send, CalendarDays, CalendarRange, CalendarClock, Infinity as InfinityIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function shiftDays(dateISO: string, delta: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
const sumSince = (txs: SupplierTransaction[], from: string) =>
  txs.filter((t) => t.date >= from).reduce((a, t) => a + t.amount, 0);

export default async function TransactionsPage() {
  const [txs, suppliers] = await Promise.all([getTransactions(), getSuppliers()]);
  const today = todayISO();

  const list = [...txs].sort(
    (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
  const overall = txs.reduce((a, t) => a + t.amount, 0);

  const periods = [
    { label: "Today", value: sumSince(txs, today), icon: <CalendarDays size={18} /> },
    { label: "Last 7 Days", value: sumSince(txs, shiftDays(today, -6)), icon: <CalendarRange size={18} /> },
    { label: "Last 30 Days", value: sumSince(txs, shiftDays(today, -29)), icon: <CalendarRange size={18} /> },
    { label: "Last 3 Months", value: sumSince(txs, shiftDays(today, -89)), icon: <CalendarClock size={18} /> },
    { label: "Overall", value: overall, icon: <InfinityIcon size={18} /> },
  ];

  // Amount sent per supplier (all-time), most first.
  const bySupplier = (() => {
    const m = new Map<string, { amount: number; count: number }>();
    for (const t of txs) {
      const g = m.get(t.supplier) ?? { amount: 0, count: 0 };
      g.amount += t.amount;
      g.count += 1;
      m.set(t.supplier, g);
    }
    return [...m.entries()].map(([supplier, g]) => ({ supplier, ...g })).sort((a, b) => b.amount - a.amount);
  })();

  const supplierNames = suppliers.map((s) => s.name);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Transactions</h1>
          <p className="text-sm text-zinc-500 mt-1">Money sent to suppliers — payouts, stock purchases, advances and top-ups.</p>
        </div>
        <TransactionModal suppliers={supplierNames} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {periods.map((p) => (
          <StatCard
            key={p.label}
            label={p.label}
            value={formatCurrencyPrecise(p.value)}
            icon={p.icon}
            iconClass={p.label === "Overall" ? "bg-zinc-900 text-white" : "bg-rose-50 text-rose-600"}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Amount Sent per Supplier" action={<span className="text-xs text-zinc-400">all time</span>}>
          {bySupplier.length === 0 ? (
            <p className="text-sm text-zinc-500">No supplier payments yet.</p>
          ) : (
            <ul className="space-y-3">
              {bySupplier.map((s) => {
                const pct = overall > 0 ? Math.round((s.amount / overall) * 100) : 0;
                return (
                  <li key={s.supplier}>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        <span className="font-medium text-zinc-900">{s.supplier}</span>
                        <span className="text-zinc-400 ml-2 text-xs">{s.count} tx</span>
                      </span>
                      <span className="font-mono text-zinc-700">{formatCurrencyPrecise(s.amount)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-sm text-zinc-500"><Send size={16} /> Total Sent to Suppliers</div>
          <div className="mt-3 text-4xl font-bold text-zinc-900 tracking-tight">{formatCurrencyPrecise(overall)}</div>
          <div className="text-xs text-zinc-400 mt-1">{formatNum(txs.length)} transactions all time</div>
        </Card>
      </div>

      <Card title="Transactions" action={<span className="text-xs text-zinc-400">{txs.length} · {formatCurrencyPrecise(overall)}</span>}>
        {list.length === 0 ? (
          <p className="text-sm text-zinc-500">No transactions yet. Use Add Transaction to log a payment sent to a supplier.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Supplier</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Amount</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Reason</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Created By</th>
                <th className="pb-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {list.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 transition-colors align-top">
                  <td className="py-3.5 text-sm text-zinc-500">{t.date}</td>
                  <td className="py-3.5 text-sm font-medium text-zinc-900">{t.supplier}</td>
                  <td className="py-3.5 text-sm font-mono text-rose-600 text-right">{formatCurrencyPrecise(t.amount)}</td>
                  <td className="py-3.5 text-sm text-zinc-600 max-w-sm whitespace-pre-wrap">{t.reason}</td>
                  <td className="py-3.5 text-sm text-zinc-500">{t.created_by ?? "—"}</td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <TransactionModal tx={t} suppliers={supplierNames} />
                      <DeleteTransactionButton id={t.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
