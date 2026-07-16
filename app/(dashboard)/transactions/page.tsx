import { getTransactions, getSuppliers, getAllWorkspaces, resolveWorkspace } from "@/lib/data";
import { resolvePeriod, type ViewParams } from "@/lib/ordersView";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PeriodFilter } from "@/components/PeriodFilter";
import { WebsiteFilter } from "@/components/WebsiteFilter";
import { TransactionModal } from "@/components/TransactionModal";
import { DeleteTransactionButton } from "@/components/DeleteTransactionButton";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import { platformBadgeClass } from "@/lib/platformBadge";
import { Send, Hash, Divide } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<ViewParams & { ws?: string }>;
}) {
  const sp = await searchParams;
  const { from, to, label } = resolvePeriod(sp, "all");
  const [txs, suppliers, workspaces, ws] = await Promise.all([
    getTransactions(),
    getSuppliers(),
    getAllWorkspaces(),
    sp.ws ? resolveWorkspace(sp.ws) : Promise.resolve(null),
  ]);

  const nameOf = (slug: string) => workspaces.find((w) => w.slug === slug)?.name ?? slug;

  const filtered = txs
    .filter((t) => t.date >= from && t.date <= to && (!ws || t.platform === ws.slug))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  const total = filtered.reduce((a, t) => a + t.amount, 0);
  const count = filtered.length;
  const avg = count ? total / count : 0;

  const bySupplier = groupSum(filtered, (t) => t.supplier);
  const byPlatform = groupSum(filtered, (t) => t.platform).map((g) => ({ ...g, label: nameOf(g.key) }));

  const supplierNames = suppliers.map((s) => s.name);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Transactions</h1>
          <p className="text-sm text-zinc-500 mt-1">Payments sent to suppliers {label}.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <WebsiteFilter />
          <PeriodFilter defaultRange="all" />
          <TransactionModal suppliers={supplierNames} platforms={workspaces} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Sent to Suppliers" value={formatCurrencyPrecise(total)} icon={<Send size={18} />} iconClass="bg-rose-50 text-rose-600" />
        <StatCard label="Transactions" value={formatNum(count)} icon={<Hash size={18} />} />
        <StatCard label="Average Transaction" value={formatCurrencyPrecise(avg)} icon={<Divide size={18} />} iconClass="bg-sky-50 text-sky-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Amount by Supplier">
          <BreakdownList rows={bySupplier.map((g) => ({ label: g.key, amount: g.amount, count: g.count }))} total={total} empty="No supplier payments in this view." />
        </Card>
        <Card title="Amount by Platform">
          <BreakdownList rows={byPlatform.map((g) => ({ label: g.label, amount: g.amount, count: g.count, slug: g.key }))} total={total} empty="No platform payments in this view." badge />
        </Card>
      </div>

      <Card title="Transactions" action={<span className="text-xs text-zinc-400">{count} · {formatCurrencyPrecise(total)}</span>}>
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">No transactions in this view. Use Add Transaction to log a payment sent to a supplier.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Supplier</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Platform</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Amount</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Reason</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Created By</th>
                <th className="pb-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 transition-colors align-top">
                  <td className="py-3.5 text-sm text-zinc-500">{t.date}</td>
                  <td className="py-3.5 text-sm font-medium text-zinc-900">{t.supplier}</td>
                  <td className="py-3.5 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${platformBadgeClass(t.platform)}`}>{nameOf(t.platform)}</span>
                  </td>
                  <td className="py-3.5 text-sm font-mono text-rose-600 text-right">{formatCurrencyPrecise(t.amount)}</td>
                  <td className="py-3.5 text-sm text-zinc-600 max-w-sm whitespace-pre-wrap">{t.reason}</td>
                  <td className="py-3.5 text-sm text-zinc-500">{t.created_by ?? "—"}</td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <TransactionModal tx={t} suppliers={supplierNames} platforms={workspaces} />
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

function groupSum<T extends { amount: number }>(items: T[], keyOf: (t: T) => string) {
  const m = new Map<string, { key: string; amount: number; count: number }>();
  for (const it of items) {
    const key = keyOf(it) || "—";
    const g = m.get(key) ?? { key, amount: 0, count: 0 };
    g.amount += it.amount;
    g.count += 1;
    m.set(key, g);
  }
  return [...m.values()].sort((a, b) => b.amount - a.amount);
}

function BreakdownList({
  rows,
  total,
  empty,
  badge = false,
}: {
  rows: { label: string; amount: number; count: number; slug?: string }[];
  total: number;
  empty: string;
  badge?: boolean;
}) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
        return (
          <li key={r.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-700">
                {badge ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${platformBadgeClass(r.slug ?? r.label)}`}>{r.label}</span>
                ) : (
                  <span className="font-medium text-zinc-900">{r.label}</span>
                )}
                <span className="text-zinc-400 ml-2 text-xs">{r.count} tx</span>
              </span>
              <span className="font-mono text-zinc-700">{formatCurrencyPrecise(r.amount)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
