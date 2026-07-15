import { getInvestment, getInvestmentBatches, sumProfit, LEDGER_START } from "@/lib/data";
import { loadOrders } from "@/lib/ordersView";
import { isCompleted, statusCategory } from "@/lib/orderStatus";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { InvestmentModal } from "@/components/InvestmentModal";
import { InvestmentBatchModal } from "@/components/InvestmentBatchModal";
import { DeleteBatchButton } from "@/components/DeleteBatchButton";
import { formatCurrencyPrecise } from "@/lib/format";
import { platformBadgeClass } from "@/lib/platformBadge";
import { DollarSign, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvestmentPage() {
  const [inv, batches, { all }] = await Promise.all([
    getInvestment(),
    getInvestmentBatches(),
    loadOrders(),
  ]);
  const rate = inv.rsd_per_usd || 117;
  const toUsd = (amt: number | null | undefined, cur?: string | null) =>
    amt == null ? 0 : (cur ?? "USD").toUpperCase() === "RSD" ? amt / rate : amt;

  const injected = batches.reduce((a, b) => a + b.amount, 0);
  const sortedBatches = [...batches].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  // A refunded/cancelled order made no profit.
  const earned = (o: (typeof all)[number]) => {
    const c = statusCategory(o.status);
    return c === "refunded" || c === "cancelled" ? 0 : toUsd(o.profit, o.currency);
  };

  const ledger = all
    .filter((o) => o.cost != null && (o.date ?? "") >= LEDGER_START && statusCategory(o.status) !== "refunded")
    .map((o) => ({
      o,
      costUsd: toUsd(o.cost, o.currency),
      revUsd: isCompleted(o.status) ? toUsd(o.sold_for, o.currency) : 0,
      profitUsd: earned(o),
    }))
    .sort((a, b) => (b.o.date ?? "").localeCompare(a.o.date ?? ""));
  const spent = ledger.reduce((a, l) => a + l.costUsd, 0);
  const collected = ledger.reduce((a, l) => a + l.revUsd, 0);

  // Revolving capital: what you have on hand now = injected - supplier spend +
  // revenue collected. Profit ("what's in between") = collected - spent.
  const currentCapital = injected - spent + collected;
  const profit = collected - spent;
  const multiple = injected > 0 ? currentCapital / injected : 0;

  // Per-batch usage: allocate each supplier payment to the oldest batch that
  // already existed on that date (FIFO). "Spent" = injection used to buy stock;
  // "Left" = still unspent. (Collected revenue is a pool-level return, not added
  // back to a specific batch — that's what Current Capital reflects.)
  const purse = sortedBatches.map((b) => ({ id: b.id, date: b.date, rem: b.amount, spent: 0 }));
  const spendTxns = ledger
    .filter((l) => l.costUsd > 0)
    .map((l) => ({ date: l.o.date ?? "", amount: l.costUsd }))
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const t of spendTxns) {
    let amt = t.amount;
    for (const p of purse) {
      if (amt <= 0) break;
      if (p.date > t.date || p.rem <= 0) continue; // batch not available / empty
      const take = Math.min(p.rem, amt);
      p.rem -= take;
      p.spent += take;
      amt -= take;
    }
  }
  const usage = Object.fromEntries(purse.map((p) => [p.id, { spent: p.spent, left: p.rem }]));
  const totalLeft = purse.reduce((a, p) => a + p.rem, 0);

  // Profit made "by batch" = profit from every order while that batch was your
  // working capital, i.e. from the day it was added until the next top-up.
  const madeByBatch: Record<string, number> = {};
  sortedBatches.forEach((b, i) => {
    const start = b.date;
    const end = sortedBatches[i + 1]?.date ?? "9999-12-31";
    const inWindow = all.filter((o) => (o.date ?? "") >= start && (o.date ?? "") < end);
    madeByBatch[b.id] = sumProfit(inWindow);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Investment</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Working capital injected in batches. It revolves — a batch funds many sales, so
            current capital = injected − supplier spend + collected. Counting from {LEDGER_START}.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <InvestmentModal investment={inv} />
          <InvestmentBatchModal />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Injected" value={formatCurrencyPrecise(injected)} icon={<Layers size={18} />} iconClass="bg-zinc-100 text-zinc-700" />
        <StatCard label="Spent on Suppliers" value={formatCurrencyPrecise(spent)} icon={<DollarSign size={18} />} iconClass="bg-rose-50 text-rose-600" />
        <StatCard label="Collected" value={formatCurrencyPrecise(collected)} icon={<DollarSign size={18} />} iconClass="bg-emerald-50 text-emerald-600" />
        <Card>
          <span className="text-sm text-zinc-500">Current Capital</span>
          <div className={`mt-3 text-3xl font-bold ${currentCapital >= injected ? "text-emerald-600" : "text-zinc-900"}`}>
            {formatCurrencyPrecise(currentCapital)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            {formatCurrencyPrecise(injected)} in →{" "}
            <span className={profit >= 0 ? "text-emerald-600" : "text-rose-600"}>
              {profit >= 0 ? "+" : ""}{formatCurrencyPrecise(profit)}
            </span>{" "}
            {multiple > 0 && <>· {multiple.toFixed(2)}×</>}
          </div>
        </Card>
      </div>

      <Card
        title="Capital Batches"
        action={<span className="text-xs text-zinc-400">{formatCurrencyPrecise(totalLeft)} left of {formatCurrencyPrecise(injected)} injected</span>}
      >
        {batches.length === 0 ? (
          <p className="text-sm text-zinc-500">No batches yet. Use Add Batch each time you put money in (e.g. a $500 top-up).</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">#</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Date Added</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Note</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Amount</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Spent</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Left</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Made</th>
                <th className="pb-3 w-24">Used</th>
                <th className="pb-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {sortedBatches.map((b, i) => {
                const u = usage[b.id] ?? { spent: 0, left: b.amount };
                const pct = b.amount > 0 ? Math.min(100, Math.round((u.spent / b.amount) * 100)) : 0;
                return (
                  <tr key={b.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3.5 text-sm text-zinc-400">{i + 1}</td>
                    <td className="py-3.5 text-sm text-zinc-700">{b.date}</td>
                    <td className="py-3.5 text-sm text-zinc-500">{b.note || "—"}</td>
                    <td className="py-3.5 text-sm font-mono text-zinc-900 text-right">{formatCurrencyPrecise(b.amount)}</td>
                    <td className="py-3.5 text-sm font-mono text-rose-600 text-right">{formatCurrencyPrecise(u.spent)}</td>
                    <td className={`py-3.5 text-sm font-mono text-right ${u.left > 0 ? "text-emerald-600" : "text-zinc-400"}`}>
                      {formatCurrencyPrecise(u.left)}
                    </td>
                    <td className="py-3.5 text-sm font-mono text-emerald-600 text-right">{formatCurrencyPrecise(madeByBatch[b.id] ?? 0)}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden">
                          <div className={`h-full ${pct >= 100 ? "bg-rose-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-zinc-400 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <InvestmentBatchModal batch={b} />
                        <DeleteBatchButton id={b.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

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
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {ledger.slice(0, 100).map(({ o, costUsd, revUsd, profitUsd }) => (
                <tr key={o.order_id} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3 text-sm text-zinc-500">{o.date ?? "—"}</td>
                  <td className="py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${platformBadgeClass(o.platform)}`}>{o.platform ?? "—"}</span>
                  </td>
                  <td className="py-3 text-sm text-zinc-700">{o.product ?? "—"}</td>
                  <td className="py-3 text-sm text-zinc-500">{o.supplier ?? "—"}</td>
                  <td className="py-3 text-sm font-mono text-rose-600 text-right">{costUsd ? `-${formatCurrencyPrecise(costUsd)}` : "—"}</td>
                  <td className="py-3 text-sm font-mono text-emerald-600 text-right">{revUsd ? `+${formatCurrencyPrecise(revUsd)}` : "—"}</td>
                  <td className={`py-3 text-sm font-mono text-right ${profitUsd > 0 ? "text-emerald-600" : profitUsd < 0 ? "text-rose-600" : "text-zinc-400"}`}>
                    {profitUsd ? formatCurrencyPrecise(profitUsd) : "—"}
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
