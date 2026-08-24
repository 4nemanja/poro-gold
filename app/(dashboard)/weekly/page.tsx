import { loadOrders, todayISO } from "@/lib/ordersView";
import { getNotes, getInvestmentBatches, BUSINESS_START } from "@/lib/data";
import { monthsBetween, weeksInMonth, monthLabel, shortDate, type WeekRange } from "@/lib/weeks";
import { buildWeeklyReview, freshness, unaccounted, delta, type WeekTotals, type GroupRow, type Delta, type Takeaway } from "@/lib/weekly";
import { Card } from "@/components/ui/Card";
import { WeekPicker } from "@/components/WeekPicker";
import { PrintButton } from "@/components/PrintButton";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import {
  ArrowUpRight, ArrowDownRight, Minus, TriangleAlert, Lightbulb,
  CheckCircle2, CircleAlert, NotebookPen,
} from "lucide-react";

export const dynamic = "force-dynamic";

const MONTH_KEY = /^\d{4}-\d{2}$/;

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; week?: string }>;
}) {
  const sp = await searchParams;
  const [{ all: orders }, notes, batches] = await Promise.all([loadOrders(), getNotes(), getInvestmentBatches()]);

  const today = todayISO();
  // Months the business has actually traded in — never an empty dropdown of
  // future months, never a month before the business started.
  const latestOrder = orders.reduce((max, o) => (o.date && o.date > max ? o.date : max), BUSINESS_START);
  const months = monthsBetween(BUSINESS_START, latestOrder > today ? latestOrder : today);

  const month = MONTH_KEY.test(sp.month ?? "") && months.includes(sp.month!) ? sp.month! : months[0];
  const weeks = weeksInMonth(month);

  const hasOrders = (w: WeekRange) => orders.some((o) => !!o.date && o.date >= w.from && o.date <= w.to);

  // Default to the most recent week whose data is actually complete. This page
  // exists for end-of-week reviews, and the in-progress week is always missing
  // the last day or two of manual entry — opening on it would headline a "−82%"
  // that is really just un-entered orders. Fall back to the newest week with
  // anything in it when nothing is fully logged yet.
  const { completeThrough } = freshness(orders);
  const newestFirst = [...weeks].reverse();
  const fallbackWeek =
    newestFirst.find((w) => hasOrders(w) && (completeThrough == null || w.to <= completeThrough))?.index ??
    newestFirst.find(hasOrders)?.index ??
    1;
  const requested = Number(sp.week);
  const weekIndex = weeks.some((w) => w.index === requested) ? requested : fallbackWeek;
  const week = weeks.find((w) => w.index === weekIndex)!;

  // The previous week, crossing the month boundary when we're on week 1.
  const previousWeek: WeekRange | null =
    weekIndex > 1
      ? weeks[weekIndex - 2]
      : (() => {
          const idx = months.indexOf(month);
          if (idx === -1 || idx + 1 >= months.length) return null;
          const prev = weeksInMonth(months[idx + 1]);
          return prev[prev.length - 1];
        })();

  const review = buildWeeklyReview({ week, previousWeek, allWeeks: weeks, orders, notes, batches, today });
  const { totals, previous } = review;
  const gap = unaccounted(totals);
  const empty = totals.orders === 0 && totals.refundCount === 0;

  const d = (pick: (t: WeekTotals) => number): Delta | null =>
    previous && previous.totals.orders > 0 ? delta(pick(totals), pick(previous.totals)) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Weekly Review</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {monthLabel(month)} · <span className="font-medium text-zinc-700">{week.label}</span>, {week.rangeLabel}
            {week.partial && <span className="text-amber-600"> · short week ({week.days} days)</span>}
            {previous && (
              <>
                {" "}
                · compared with {previous.week.label} ({previous.week.rangeLabel})
                {previous.week.days !== week.days && (
                  <span className="text-amber-600">
                    {" "}
                    — only {previous.week.days} days long, so the changes below are not like-for-like
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WeekPicker
            months={months}
            weeks={weeks}
            month={month}
            week={weekIndex}
            emptyWeeks={weeks.filter((w) => !hasOrders(w)).map((w) => w.index)}
          />
          <PrintButton />
        </div>
      </div>

      {review.pendingDays.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2.5">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">
              {review.pendingDays.length} {review.pendingDays.length === 1 ? "day" : "days"} in this week probably aren&apos;t
              logged yet
            </span>{" "}
            — {review.pendingDays.map(shortDate).join(", ")}. Manual orders are entered about{" "}
            {review.freshness.lagDays === 0 ? "same day" : `${review.freshness.lagDays} day${review.freshness.lagDays === 1 ? "" : "s"} late`}
            , and the newest entry was made {review.freshness.lastEntryAt?.slice(0, 10)}. Treat the totals below as a floor,
            not a final number.
          </div>
        </div>
      )}

      {empty ? (
        <Card>
          <p className="text-sm text-zinc-500">
            No orders were logged between {shortDate(week.from)} and {shortDate(week.to)}. Pick another week.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi label="Revenue" value={formatCurrencyPrecise(totals.revenue)} delta={d((t) => t.revenue)} />
            <Kpi label="Net Profit" value={formatCurrencyPrecise(totals.profit)} delta={d((t) => t.profit)} tone="emerald" />
            <Kpi label="Orders" value={formatNum(totals.orders)} delta={d((t) => t.orders)} />
            <Kpi
              label="Net Margin"
              value={`${totals.marginPct.toFixed(1)}%`}
              delta={d((t) => t.marginPct)}
              pointsNotPercent
            />
            <Kpi
              label="Refund Rate"
              value={`${totals.refundRatePct.toFixed(1)}%`}
              delta={d((t) => t.refundRatePct)}
              pointsNotPercent
              lowerIsBetter
              foot={`${totals.refundCount} orders · ${formatCurrencyPrecise(totals.refundValue)}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card
                title="Where the money went"
                action={<span className="text-xs text-zinc-400">every dollar of revenue, from sale to net profit</span>}
              >
                <MoneyFlow totals={totals} gap={gap} />
              </Card>
            </div>
            <Card title="Week at a glance">
              <dl className="space-y-2.5">
                <Line label="Average order value" value={formatCurrencyPrecise(totals.aov)} />
                <Line label="Profit per order" value={formatCurrencyPrecise(totals.profitPerOrder)} />
                <Line label="Days with sales" value={`${totals.activeDays} of ${week.days}`} />
                <Line label="Still in progress" value={`${totals.inProgressCount} · ${formatCurrencyPrecise(totals.inProgressValue)}`} />
                <Line label="Capital deployed" value={formatCurrencyPrecise(review.capitalDeployed)} />
                <Line
                  label="Return on capital"
                  value={review.returnOnCapitalPct == null ? "—" : `${review.returnOnCapitalPct.toFixed(1)}%`}
                />
                <Line
                  label="Share of the month"
                  value={
                    review.monthTotals.profit
                      ? `${((totals.profit / review.monthTotals.profit) * 100).toFixed(0)}% of profit`
                      : "—"
                  }
                />
              </dl>
            </Card>
          </div>

          {review.takeaways.length > 0 && (
            <Card title="What this week is telling you" action={<span className="text-xs text-zinc-400">derived from the numbers below</span>}>
              <ul className="space-y-2.5">
                {review.takeaways.map((t, i) => (
                  <TakeawayLine key={i} takeaway={t} />
                ))}
              </ul>
            </Card>
          )}

          <Card
            title={`Every week of ${monthLabel(month)}`}
            action={<span className="text-xs text-zinc-400">selected week highlighted</span>}
          >
            <MonthTable review={review} />
          </Card>

          <Card title="Day by day" action={<span className="text-xs text-zinc-400">{week.rangeLabel}</span>}>
            <DayTable review={review} />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="By website" action={<span className="text-xs text-zinc-400">cost ratio = supplier cost ÷ sale price</span>}>
              <GroupTable rows={review.byPlatform} firstCol="Website" />
            </Card>
            <Card title="By supplier">
              <GroupTable rows={review.bySupplier} firstCol="Supplier" />
            </Card>
          </div>

          <Card title="Products" action={<span className="text-xs text-zinc-400">top 15 by revenue</span>}>
            <GroupTable rows={review.byProduct.slice(0, 15)} firstCol="Product" wideFirst />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card
              title="Refunds"
              action={<span className="text-xs text-zinc-400">{totals.refundCount} this week</span>}
            >
              <RefundTable refunds={review.refunds} />
            </Card>
            <Card
              title="Notes from this week"
              action={<span className="text-xs text-zinc-400">{review.notes.length} logged</span>}
            >
              <NoteList notes={review.notes} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- KPI card */

function Kpi({
  label,
  value,
  delta: dl,
  tone,
  foot,
  lowerIsBetter = false,
  pointsNotPercent = false,
}: {
  label: string;
  value: string;
  delta: Delta | null;
  tone?: "emerald";
  foot?: string;
  lowerIsBetter?: boolean;
  pointsNotPercent?: boolean;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
      <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500">{label}</span>
      <div className="mt-3">
        <span className={`text-2xl font-semibold tracking-tight ${tone === "emerald" ? "text-emerald-600" : "text-zinc-900"}`}>
          {value}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {dl ? <DeltaChip delta={dl} lowerIsBetter={lowerIsBetter} pointsNotPercent={pointsNotPercent} /> : null}
        {foot && <span className="text-zinc-400 truncate">{foot}</span>}
      </div>
    </div>
  );
}

function DeltaChip({
  delta: dl,
  lowerIsBetter = false,
  pointsNotPercent = false,
}: {
  delta: Delta;
  lowerIsBetter?: boolean;
  pointsNotPercent?: boolean;
}) {
  if (dl.direction === "flat") {
    return (
      <span className="inline-flex items-center gap-0.5 font-medium text-zinc-400">
        <Minus size={13} /> no change
      </span>
    );
  }
  const good = lowerIsBetter ? dl.direction === "down" : dl.direction === "up";
  const Icon = dl.direction === "up" ? ArrowUpRight : ArrowDownRight;
  const text = pointsNotPercent
    ? `${dl.abs >= 0 ? "+" : "−"}${Math.abs(dl.abs).toFixed(1)} pts`
    : dl.pct == null
    ? "new"
    : `${dl.pct >= 0 ? "+" : "−"}${Math.abs(dl.pct).toFixed(0)}%`;
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${good ? "text-emerald-600" : "text-rose-600"}`}>
      <Icon size={13} /> {text}
      <span className="text-zinc-400 font-normal ml-1">vs prev week</span>
    </span>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm font-mono font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

/* --------------------------------------------------------- money flow bar */

function MoneyFlow({ totals, gap }: { totals: WeekTotals; gap: number }) {
  const parts = [
    { label: "Supplier cost", value: totals.supplierCost, bar: "bg-rose-500", text: "text-rose-600" },
    { label: "Marketplace fee", value: totals.sellingFees, bar: "bg-amber-500", text: "text-amber-700" },
    { label: "Withdrawal fee", value: totals.withdrawalFees, bar: "bg-amber-400", text: "text-amber-700" },
    { label: "Supplier profit split", value: totals.supplierCut, bar: "bg-violet-500", text: "text-violet-600" },
    ...(Math.abs(gap) >= 0.01
      ? [{ label: "Unrecorded cost", value: gap, bar: "bg-zinc-300", text: "text-zinc-500" }]
      : []),
    { label: "Net profit", value: totals.profit, bar: "bg-emerald-500", text: "text-emerald-600" },
  ];
  const total = totals.revenue || 1;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100">
        {parts.map((p) => (
          <div
            key={p.label}
            className={p.bar}
            style={{ width: `${Math.max((p.value / total) * 100, 0)}%` }}
            title={`${p.label}: ${formatCurrencyPrecise(p.value)}`}
          />
        ))}
      </div>

      <table className="w-full mt-5">
        <tbody className="divide-y divide-zinc-200">
          <tr>
            <td className="py-2.5 text-sm font-medium text-zinc-900">Revenue</td>
            <td className="py-2.5 text-sm text-right text-zinc-400">100%</td>
            <td className="py-2.5 text-sm font-mono text-right font-semibold text-zinc-900">
              {formatCurrencyPrecise(totals.revenue)}
            </td>
          </tr>
          {parts.map((p) => (
            <tr key={p.label}>
              <td className="py-2.5 text-sm text-zinc-600">
                <span className={`inline-block w-2 h-2 rounded-sm mr-2 align-middle ${p.bar}`} />
                {p.label}
              </td>
              <td className="py-2.5 text-sm text-right text-zinc-400">{((p.value / total) * 100).toFixed(1)}%</td>
              <td className={`py-2.5 text-sm font-mono text-right font-medium ${p.text}`}>
                {p.label === "Net profit" ? "" : "−"}
                {formatCurrencyPrecise(Math.abs(p.value))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {Math.abs(gap) >= 0.01 && (
        <p className="mt-3 text-xs text-zinc-400">
          &ldquo;Unrecorded cost&rdquo; is {totals.missingCostCount} order{totals.missingCostCount === 1 ? "" : "s"} logged
          with no supplier cost, so their profit counts as zero. Fill those in and this line disappears.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ month table */

function MonthTable({ review }: { review: ReturnType<typeof buildWeeklyReview> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Week</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Orders</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Revenue</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Supplier Cost</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Fees</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Profit</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Margin</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">AOV</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Refunds</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {review.monthWeeks.map(({ week, totals, isSelected }) => {
            const blank = totals.orders === 0 && totals.refundCount === 0;
            return (
              <tr key={week.index} className={isSelected ? "bg-zinc-100" : blank ? "text-zinc-300" : "hover:bg-zinc-50 transition-colors"}>
                <td className={`py-3 text-sm whitespace-nowrap ${isSelected ? "font-semibold text-zinc-900" : "text-zinc-600"}`}>
                  {week.label}
                  <span className="ml-2 text-xs text-zinc-400">{week.rangeLabel}</span>
                  {week.partial && <span className="ml-1.5 text-xs text-amber-600">· {week.days}d</span>}
                </td>
                <td className="py-3 text-sm font-mono text-right">{formatNum(totals.orders)}</td>
                <td className="py-3 text-sm font-mono text-right text-zinc-700">{formatCurrencyPrecise(totals.revenue)}</td>
                <td className="py-3 text-sm font-mono text-right text-zinc-700">{formatCurrencyPrecise(totals.supplierCost)}</td>
                <td className="py-3 text-sm font-mono text-right text-zinc-700">
                  {formatCurrencyPrecise(totals.sellingFees + totals.withdrawalFees)}
                </td>
                <td className={`py-3 text-sm font-mono text-right font-medium ${blank ? "" : "text-emerald-600"}`}>
                  {formatCurrencyPrecise(totals.profit)}
                </td>
                <td className="py-3 text-sm font-mono text-right text-zinc-700">{totals.marginPct.toFixed(1)}%</td>
                <td className="py-3 text-sm font-mono text-right text-zinc-600">{formatCurrencyPrecise(totals.aov)}</td>
                <td className={`py-3 text-sm font-mono text-right ${totals.refundCount ? "text-rose-600" : "text-zinc-300"}`}>
                  {totals.refundCount ? `${totals.refundCount} · ${formatCurrencyPrecise(totals.refundValue)}` : "—"}
                </td>
              </tr>
            );
          })}
          <MonthTotalRow totals={review.monthTotals} label={monthLabel(review.week.monthKey)} />
        </tbody>
      </table>
    </div>
  );
}

function MonthTotalRow({ totals, label }: { totals: WeekTotals; label: string }) {
  return (
    <tr className="border-t-2 border-zinc-200 font-medium">
      <td className="py-3 text-sm text-zinc-900 whitespace-nowrap">{label} total</td>
      <td className="py-3 text-sm font-mono text-right text-zinc-900">{formatNum(totals.orders)}</td>
      <td className="py-3 text-sm font-mono text-right text-zinc-900">{formatCurrencyPrecise(totals.revenue)}</td>
      <td className="py-3 text-sm font-mono text-right text-zinc-900">{formatCurrencyPrecise(totals.supplierCost)}</td>
      <td className="py-3 text-sm font-mono text-right text-zinc-900">
        {formatCurrencyPrecise(totals.sellingFees + totals.withdrawalFees)}
      </td>
      <td className="py-3 text-sm font-mono text-right text-emerald-600">{formatCurrencyPrecise(totals.profit)}</td>
      <td className="py-3 text-sm font-mono text-right text-zinc-900">{totals.marginPct.toFixed(1)}%</td>
      <td className="py-3 text-sm font-mono text-right text-zinc-900">{formatCurrencyPrecise(totals.aov)}</td>
      <td className={`py-3 text-sm font-mono text-right ${totals.refundCount ? "text-rose-600" : "text-zinc-300"}`}>
        {totals.refundCount ? `${totals.refundCount} · ${formatCurrencyPrecise(totals.refundValue)}` : "—"}
      </td>
    </tr>
  );
}

/* -------------------------------------------------------------- day table */

function DayTable({ review }: { review: ReturnType<typeof buildWeeklyReview> }) {
  const peak = Math.max(...review.days.map((r) => r.revenue), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Day</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase" />
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Orders</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Revenue</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Profit</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Margin</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Refunds</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {review.days.map((r) => (
            <tr key={r.date} className={r.future ? "text-zinc-300" : "hover:bg-zinc-50 transition-colors"}>
              <td className="py-3 text-sm text-zinc-700 whitespace-nowrap">
                <span className="font-medium">{r.weekday}</span>
                <span className="ml-2 text-zinc-400">{shortDate(r.date)}</span>
                {r.pendingEntry && (
                  <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    not logged yet
                  </span>
                )}
                {r.future && <span className="ml-2 text-[10px] font-medium text-zinc-300">upcoming</span>}
              </td>
              <td className="py-3 w-40">
                <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={r.pendingEntry ? "h-full bg-zinc-200" : "h-full bg-emerald-500"}
                    style={{ width: `${(r.revenue / peak) * 100}%` }}
                  />
                </div>
              </td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">{r.future ? "—" : formatNum(r.orders)}</td>
              <td className="py-3 text-sm font-mono text-right text-zinc-700">
                {r.future ? "—" : formatCurrencyPrecise(r.revenue)}
              </td>
              <td className={`py-3 text-sm font-mono text-right ${!r.future && r.profit > 0 ? "text-emerald-600" : "text-zinc-400"}`}>
                {r.future ? "—" : formatCurrencyPrecise(r.profit)}
              </td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">{!r.future && r.orders ? `${r.marginPct.toFixed(1)}%` : "—"}</td>
              <td className={`py-3 text-sm font-mono text-right ${r.refunds ? "text-rose-600" : "text-zinc-300"}`}>
                {r.refunds || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------ group table */

function GroupTable({ rows, firstCol, wideFirst = false }: { rows: GroupRow[]; firstCol: string; wideFirst?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">Nothing to show for this week.</p>;
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
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Cost Ratio</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-zinc-50 transition-colors">
              <td className={`py-3 text-sm text-zinc-700 ${wideFirst ? "max-w-xs truncate" : "whitespace-nowrap"}`}>{r.key}</td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">{formatNum(r.orders)}</td>
              <td className="py-3 text-sm font-mono text-right text-zinc-700">{formatCurrencyPrecise(r.revenue)}</td>
              <td className={`py-3 text-sm font-mono text-right ${r.profit > 0 ? "text-emerald-600" : "text-zinc-400"}`}>
                {formatCurrencyPrecise(r.profit)}
              </td>
              <td
                className={`py-3 text-sm font-mono text-right font-medium ${
                  r.marginPct < 4 ? "text-rose-600" : r.marginPct >= 10 ? "text-emerald-600" : "text-zinc-700"
                }`}
              >
                {r.marginPct.toFixed(1)}%
              </td>
              <td className="py-3 text-sm font-mono text-right text-zinc-600">
                {r.costRatioPct ? `${r.costRatioPct.toFixed(1)}%` : "—"}
              </td>
              <td className="py-3 text-sm font-mono text-right text-zinc-500">{r.revenueSharePct.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------------------------------------- panels */

function RefundTable({ refunds }: { refunds: import("@/lib/types").Order[] }) {
  if (refunds.length === 0) return <p className="text-sm text-zinc-500">No refunds this week.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Day</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Website</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Product</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Value</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {refunds.map((o) => (
            <tr key={o.order_id} className="hover:bg-zinc-50 transition-colors">
              <td className="py-3 text-sm text-zinc-600 whitespace-nowrap">{o.date ? shortDate(o.date) : "—"}</td>
              <td className="py-3 text-sm text-zinc-600 whitespace-nowrap">{o.platform ?? "—"}</td>
              <td className="py-3 text-sm text-zinc-700 max-w-[14rem] truncate">{o.product ?? "—"}</td>
              <td className="py-3 text-sm font-mono text-right text-rose-600">{formatCurrencyPrecise(o.sold_for ?? 0)}</td>
              <td className="py-3 text-sm text-zinc-600 max-w-[14rem] truncate">
                {o.refund_reason || <span className="text-amber-600">no reason recorded</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoteList({ notes }: { notes: import("@/lib/types").DailyNote[] }) {
  if (notes.length === 0) {
    return <p className="text-sm text-zinc-500">No notes were written this week.</p>;
  }
  return (
    <ul className="space-y-4">
      {notes.map((n) => (
        <li key={n.id} className="flex gap-3">
          <NotebookPen size={15} className="text-zinc-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-zinc-400">
              {shortDate(n.date)}
              {n.author && <> · {n.author}</>}
            </div>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap line-clamp-6">{n.content}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const TAKEAWAY_ICON = {
  good: { Icon: CheckCircle2, className: "text-emerald-600" },
  bad: { Icon: CircleAlert, className: "text-rose-600" },
  warn: { Icon: TriangleAlert, className: "text-amber-600" },
  info: { Icon: Lightbulb, className: "text-zinc-400" },
} as const;

function TakeawayLine({ takeaway }: { takeaway: Takeaway }) {
  const { Icon, className } = TAKEAWAY_ICON[takeaway.tone] ?? TAKEAWAY_ICON.info;
  return (
    <li className="flex gap-2.5 text-sm text-zinc-700">
      <Icon size={15} className={`mt-0.5 shrink-0 ${className}`} />
      <span>{takeaway.text}</span>
    </li>
  );
}
