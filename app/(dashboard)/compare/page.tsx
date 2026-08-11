import { loadOrders, todayISO, notRefunded } from "@/lib/ordersView";
import { buildComparison, type MetricRow, type MetricKind, type ProductCompareRow } from "@/lib/compareDates";
import { Card } from "@/components/ui/Card";
import { CompareDatePicker } from "@/components/CompareDatePicker";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import { Trophy, Lightbulb, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDays(dateISO: string, delta: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function fmtValue(v: number, kind: MetricKind): string {
  if (kind === "count") return formatNum(v);
  if (kind === "percent") return `${v.toFixed(1)}%`;
  return formatCurrencyPrecise(v);
}

// Signed difference plus a percentage where it's meaningful, e.g. "+15 (+51.7%)".
function fmtDiff(row: MetricRow): string {
  const sign = row.diff > 0 ? "+" : row.diff < 0 ? "−" : "";
  const abs = Math.abs(row.diff);
  const val = row.kind === "count" ? formatNum(abs) : row.kind === "percent" ? `${abs.toFixed(1)}%` : formatCurrencyPrecise(abs);
  const pct = row.pctDiff == null ? "" : ` (${row.pctDiff >= 0 ? "+" : "−"}${Math.abs(row.pctDiff).toFixed(1)}%)`;
  return `${sign}${val}${pct}`;
}

function prettyDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  const today = todayISO();
  const aDate = ISO_DATE.test(sp.a ?? "") ? sp.a! : shiftDays(today, -1);
  const bDate = ISO_DATE.test(sp.b ?? "") ? sp.b! : today;

  const { all: everything } = await loadOrders();
  // Same rule as every other analytics view: refunded orders never count.
  const all = everything.filter(notRefunded);
  const aOrders = all.filter((o) => o.date === aDate);
  const bOrders = all.filter((o) => o.date === bDate);

  const cmp = buildComparison(aDate, bDate, aOrders, bOrders);
  const sameDate = aDate === bDate;
  const noData = aOrders.length === 0 && bOrders.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Compare Dates</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Two days, side by side — and <span className="text-rose-600 font-medium">what changed</span> between them.
          </p>
        </div>
        <CompareDatePicker a={aDate} b={bDate} max={today} />
      </div>

      {sameDate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Date A and Date B are the same day. Pick two different dates to see a comparison.
        </div>
      )}

      {noData ? (
        <Card>
          <p className="text-sm text-zinc-500">
            No sales on {prettyDate(aDate)} or {prettyDate(bDate)}. Pick two dates that have orders.
          </p>
        </Card>
      ) : (
        <>
          {/* Side-by-side headline cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DayCard date={aDate} label="Date A" m={cmp.a} isWinner={cmp.winner === "a"} accent="sky" />
            <DayCard date={bDate} label="Date B" m={cmp.b} isWinner={cmp.winner === "b"} accent="violet" />
          </div>

          {/* What changed */}
          <Card title="What Changed" action={<span className="text-xs text-zinc-400">Difference = Date A − Date B · changes in red</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Metric</th>
                    <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">{prettyDate(aDate)}</th>
                    <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">{prettyDate(bDate)}</th>
                    <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {cmp.rows.map((r) => (
                    <tr key={r.key} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 text-sm text-zinc-700">{r.label}</td>
                      <td className={`py-3 text-sm font-mono text-right ${r.winner === "a" ? "font-semibold text-zinc-900" : "text-zinc-600"}`}>
                        {fmtValue(r.a, r.kind)}
                        {r.winner === "a" && <WinnerTick />}
                      </td>
                      <td className={`py-3 text-sm font-mono text-right ${r.winner === "b" ? "font-semibold text-zinc-900" : "text-zinc-600"}`}>
                        {fmtValue(r.b, r.kind)}
                        {r.winner === "b" && <WinnerTick />}
                      </td>
                      <td className={`py-3 text-sm font-mono text-right font-medium ${r.changed ? "text-rose-600" : "text-zinc-300"}`}>
                        {r.changed ? fmtDiff(r) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Volume vs efficiency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SplitCard
              title="Volume"
              subtitle="Was the day better because we sold more?"
              rows={cmp.rows.filter((r) => ["sales", "revenue"].includes(r.key))}
              aDate={aDate}
              bDate={bDate}
            />
            <SplitCard
              title="Efficiency"
              subtitle="Were the individual sales better?"
              rows={cmp.rows.filter((r) => ["avgProfitPerSale", "avgSalePrice", "avgCostPerSale", "marginPct"].includes(r.key))}
              aDate={aDate}
              bDate={bDate}
            />
          </div>

          {/* Product mix */}
          <Card title="Product Mix" action={<span className="text-xs text-zinc-400">sales · revenue · profit by product</span>}>
            <ProductTable rows={cmp.products} aDate={aDate} bDate={bDate} />
          </Card>

          {/* Selling price changes */}
          <Card title="Selling Price Changes" action={<span className="text-xs text-zinc-400">avg historical price · products sold on both days</span>}>
            <PriceTable rows={cmp.products} aDate={aDate} bDate={bDate} />
          </Card>

          {/* Insights */}
          <Card title={cmp.winner === "tie" ? "Insights" : `Why ${prettyDate(cmp.winner === "a" ? aDate : bDate)} performed better`}>
            <ul className="space-y-2">
              {cmp.insights.map((line, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-zinc-700">
                  <Lightbulb size={15} className="text-amber-500 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function WinnerTick() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 align-middle">
      <Trophy size={9} /> Better
    </span>
  );
}

const ACCENTS: Record<string, string> = {
  sky: "bg-sky-50 text-sky-700 border-sky-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

function DayCard({
  date,
  label,
  m,
  isWinner,
  accent,
}: {
  date: string;
  label: string;
  m: import("@/lib/compareDates").DayMetrics;
  isWinner: boolean;
  accent: string;
}) {
  return (
    <Card className={isWinner ? "ring-2 ring-emerald-300" : ""}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${ACCENTS[accent]}`}>{label}</span>
          <span className="text-sm font-semibold text-zinc-900">{prettyDate(date)}</span>
        </div>
        {isWinner && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
            <Trophy size={11} /> Better day
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Sales" value={formatNum(m.sales)} />
        <Stat label="Revenue" value={formatCurrencyPrecise(m.revenue)} />
        <Stat label="Profit" value={formatCurrencyPrecise(m.profit)} tone="emerald" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4">
        <Stat label="Profit / Sale" value={formatCurrencyPrecise(m.avgProfitPerSale)} small />
        <Stat label="Avg Price" value={formatCurrencyPrecise(m.avgSalePrice)} small />
        <Stat label="Margin" value={`${m.marginPct.toFixed(1)}%`} small />
      </div>
    </Card>
  );
}

function Stat({ label, value, tone, small }: { label: string; value: string; tone?: "emerald"; small?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`${small ? "text-base" : "text-xl"} font-bold tracking-tight ${tone === "emerald" ? "text-emerald-600" : "text-zinc-900"}`}>
        {value}
      </div>
    </div>
  );
}

function SplitCard({
  title,
  subtitle,
  rows,
  aDate,
  bDate,
}: {
  title: string;
  subtitle: string;
  rows: MetricRow[];
  aDate: string;
  bDate: string;
}) {
  return (
    <Card title={title} action={<span className="text-xs text-zinc-400">{subtitle}</span>}>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-600">{r.label}</span>
            <div className="flex items-center gap-3 text-sm font-mono">
              <span className={r.winner === "a" ? "font-semibold text-zinc-900" : "text-zinc-500"}>{fmtValue(r.a, r.kind)}</span>
              <span className="text-zinc-300">vs</span>
              <span className={r.winner === "b" ? "font-semibold text-zinc-900" : "text-zinc-500"}>{fmtValue(r.b, r.kind)}</span>
              <span className={`w-28 text-right ${r.changed ? "text-rose-600 font-medium" : "text-zinc-300"}`}>
                {r.changed ? fmtDiff(r) : "—"}
              </span>
            </div>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-zinc-400">
          {aDate} vs {bDate}
        </p>
      </div>
    </Card>
  );
}

function DiffArrow({ diff }: { diff: number }) {
  if (diff > 0) return <TrendingUp size={13} className="inline text-emerald-600" />;
  if (diff < 0) return <TrendingDown size={13} className="inline text-rose-500" />;
  return <Minus size={13} className="inline text-zinc-300" />;
}

function ProductTable({ rows, aDate, bDate }: { rows: ProductCompareRow[]; aDate: string; bDate: string }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No products sold on either date.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Product</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">{prettyDate(aDate)} Sales</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">{prettyDate(bDate)} Sales</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Δ Sales</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">A Profit</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">B Profit</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Δ Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {rows.map((r) => (
            <tr key={r.product} className="hover:bg-zinc-50 transition-colors">
              <td className="py-3 text-sm text-zinc-700 max-w-xs truncate">{r.product}</td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">{formatNum(r.aSales)}</td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">{formatNum(r.bSales)}</td>
              <td className={`py-3 text-sm font-mono text-right ${r.salesDiff !== 0 ? "text-rose-600 font-medium" : "text-zinc-300"}`}>
                <DiffArrow diff={r.salesDiff} /> {r.salesDiff > 0 ? "+" : r.salesDiff < 0 ? "−" : ""}
                {formatNum(Math.abs(r.salesDiff))}
              </td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">{formatCurrencyPrecise(r.aProfit)}</td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">{formatCurrencyPrecise(r.bProfit)}</td>
              <td className={`py-3 text-sm font-mono text-right ${Math.abs(r.profitDiff) >= 0.005 ? "text-rose-600 font-medium" : "text-zinc-300"}`}>
                {r.profitDiff > 0 ? "+" : r.profitDiff < 0 ? "−" : ""}
                {formatCurrencyPrecise(Math.abs(r.profitDiff))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceTable({ rows, aDate, bDate }: { rows: ProductCompareRow[]; aDate: string; bDate: string }) {
  const both = rows.filter((r) => r.priceDiff !== null);
  if (both.length === 0) {
    return <p className="text-sm text-zinc-500">No product was sold on both dates, so there are no like-for-like price changes to show.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Product</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">{prettyDate(aDate)} Avg Price</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">{prettyDate(bDate)} Avg Price</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {both.map((r) => (
            <tr key={r.product} className="hover:bg-zinc-50 transition-colors">
              <td className="py-3 text-sm text-zinc-700 max-w-xs truncate">{r.product}</td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">{formatCurrencyPrecise(r.aAvgPrice)}</td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">{formatCurrencyPrecise(r.bAvgPrice)}</td>
              <td className={`py-3 text-sm font-mono text-right ${r.priceChanged ? "text-rose-600 font-medium" : "text-zinc-400"}`}>
                {!r.priceChanged ? (
                  "No change"
                ) : (
                  <>
                    <DiffArrow diff={r.priceDiff as number} /> {(r.priceDiff as number) > 0 ? "+" : "−"}
                    {formatCurrencyPrecise(Math.abs(r.priceDiff as number))}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
