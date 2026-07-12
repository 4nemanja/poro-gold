import Link from "next/link";
import { getInvestmentBatches } from "@/lib/data";
import { loadOrders } from "@/lib/ordersView";
import { analyzeBatches, type BatchAnalysis, type Ranked } from "@/lib/batches";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { BatchSelector } from "@/components/BatchSelector";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import { Layers, TrendingUp, TrendingDown, Package, Truck, Lightbulb, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${n}%`;
}

export default async function BatchAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const sp = await searchParams;
  const [batches, { all }] = await Promise.all([getInvestmentBatches(), loadOrders()]);
  const analyses = analyzeBatches(batches, all);

  if (analyses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Batch Analysis</h1>
          <p className="text-sm text-zinc-500 mt-1">Add capital batches on the Investment page to analyse them here.</p>
        </div>
      </div>
    );
  }

  const options = analyses.map((a, i) => ({
    id: a.batch.id,
    label: `Batch ${i + 1} · ${a.batch.date} · ${formatCurrencyPrecise(a.injected)}`,
  }));
  const selected = analyses.find((a) => a.batch.id === sp.batch) ?? analyses[analyses.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Batch Analysis</h1>
          <p className="text-sm text-zinc-500 mt-1">
            How each capital batch performed and why — pick one for a full breakdown and next steps.
          </p>
        </div>
        <BatchSelector options={options} />
      </div>

      {/* Compare all batches side by side — click a row to open its analysis */}
      <Card title="All Batches" action={<span className="text-xs text-zinc-400">click a batch to analyse it</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Batch</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Injected</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Used</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Orders</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Revenue</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Profit</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Margin</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {analyses.map((a, i) => {
                const on = a.batch.id === selected.batch.id;
                return (
                  <tr key={a.batch.id} className={`group cursor-pointer transition-colors ${on ? "bg-sky-50/50" : "hover:bg-zinc-50"}`}>
                    <td className="py-3.5 text-sm font-medium text-zinc-900">
                      <Link href={`/batches?batch=${a.batch.id}`} className="flex items-center gap-2 group-hover:text-sky-600">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${on ? "bg-sky-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>{i + 1}</span>
                        {a.batch.date}
                      </Link>
                    </td>
                    <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(a.injected)}</td>
                    <td className="py-3.5 text-sm font-mono text-zinc-500 text-right">{pct(a.pctUsed)}</td>
                    <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">{formatNum(a.orderCount)}</td>
                    <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(a.revenue)}</td>
                    <td className="py-3.5 text-sm font-mono font-semibold text-emerald-600 text-right">{formatCurrencyPrecise(a.profit)}</td>
                    <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">{pct(a.marginPct)}</td>
                    <td className="py-3.5 text-sm">
                      {a.complete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} /> Complete</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700"><Clock size={12} /> {pct(a.pctUsed)} used</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <BatchDetail a={selected} />
    </div>
  );
}

function BatchDetail({ a }: { a: BatchAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Layers size={18} className="text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-900">
          Batch on {a.batch.date} — {formatCurrencyPrecise(a.injected)} {a.batch.note ? `(${a.batch.note})` : ""}
        </h2>
        {a.complete ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} /> Complete</span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700"><Clock size={12} /> {pct(a.pctUsed)} used</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Injected" value={formatCurrencyPrecise(a.injected)} icon={<Layers size={18} />} iconClass="bg-zinc-100 text-zinc-700" />
        <StatCard label="Orders" value={formatNum(a.orderCount)} icon={<Package size={18} />} />
        <StatCard label="Revenue" value={formatCurrencyPrecise(a.revenue)} icon={<TrendingUp size={18} />} iconClass="bg-sky-50 text-sky-600" />
        <StatCard label="Supplier Cost" value={formatCurrencyPrecise(a.cost)} icon={<TrendingDown size={18} />} iconClass="bg-rose-50 text-rose-600" />
        <StatCard label="Profit" value={formatCurrencyPrecise(a.profit)} icon={<TrendingUp size={18} />} iconClass="bg-emerald-50 text-emerald-600" />
        <StatCard label="Margin" value={pct(a.marginPct)} icon={<TrendingUp size={18} />} iconClass="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Highlight title="Best Product" icon={<Package size={16} />} r={a.bestProduct} metric="profit" />
        <Highlight title="Most Sold" icon={<Package size={16} />} r={a.commonProduct} metric="count" />
        <Highlight title="Best Supplier" icon={<Truck size={16} />} r={a.bestSupplier} metric="profit" />
      </div>

      {a.insights.length > 0 && (
        <Card title="Analysis & Next Steps">
          <ul className="space-y-2">
            {a.insights.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                <Lightbulb size={15} className="text-amber-500 mt-0.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6">
        <Card title="By Product">
          <BreakdownTable rows={a.byProduct} firstCol="Product" />
        </Card>
        <Card title="By Supplier">
          <BreakdownTable rows={a.bySupplier} firstCol="Supplier" />
        </Card>
      </div>
    </div>
  );
}

function Highlight({ title, icon, r, metric }: { title: string; icon: React.ReactNode; r: Ranked | null; metric: "profit" | "count" }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-sm text-zinc-500">{icon}{title}</div>
      {r ? (
        <>
          <div className="mt-2 text-lg font-bold text-zinc-900 truncate">{r.name}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {metric === "count" ? `${formatNum(r.count)} orders · ` : ""}
            <span className="text-emerald-600 font-medium">{formatCurrencyPrecise(r.profit)}</span> profit
            {r.marginPct > 0 && ` · ${pct(r.marginPct)} margin`}
          </div>
        </>
      ) : (
        <div className="mt-2 text-sm text-zinc-400">No data</div>
      )}
    </Card>
  );
}

function BreakdownTable({ rows, firstCol }: { rows: Ranked[]; firstCol: string }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No {firstCol.toLowerCase()} data for this batch.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">{firstCol}</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Orders</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Revenue</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Profit</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Margin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {rows.map((r) => (
            <tr key={r.name} className="hover:bg-zinc-50 transition-colors">
              <td className="py-3 text-sm text-zinc-700">{r.name}</td>
              <td className="py-3 text-sm font-mono text-zinc-700 text-right">{formatNum(r.count)}</td>
              <td className="py-3 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(r.revenue)}</td>
              <td className="py-3 text-sm font-mono text-emerald-600 text-right">{formatCurrencyPrecise(r.profit)}</td>
              <td className="py-3 text-sm font-mono text-zinc-500 text-right">{r.revenue > 0 ? pct(r.marginPct) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
