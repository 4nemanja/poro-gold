import { sumRevenue, sumProfit, sumCost, getNotes } from "@/lib/data";
import { loadOrders, resolvePeriod, inRange, makeStatusMatch, notRefunded, addDateFor, type ViewParams } from "@/lib/ordersView";
import { isCompleted, isInProgress } from "@/lib/orderStatus";
import { resolveWorkspace } from "@/lib/data";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { OrderModal } from "@/components/OrderModal";
import { OrdersTable } from "@/components/OrdersTable";
import { PeriodFilter } from "@/components/PeriodFilter";
import { StatusFilter } from "@/components/StatusFilter";
import { WebsiteFilter } from "@/components/WebsiteFilter";
import { NoteModal } from "@/components/NoteModal";
import { DeleteNoteButton } from "@/components/DeleteNoteButton";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import { ClipboardList, CheckCircle2, Clock, DollarSign, NotebookPen } from "lucide-react";

export const dynamic = "force-dynamic";
const MAX = 50;

export default async function MainDashboard({
  searchParams,
}: {
  searchParams: Promise<ViewParams & { ws?: string }>;
}) {
  const sp = await searchParams;
  const { from, to, label } = resolvePeriod(sp);
  const statusMatch = makeStatusMatch(sp);
  const ws = sp.ws ? await resolveWorkspace(sp.ws) : null;

  const { all } = await loadOrders();
  const visible = all.filter(
    (o) => inRange(o, from, to) && statusMatch(o) && notRefunded(o) && (!ws || o.workspace === ws.slug),
  );
  const completed = visible.filter((o) => isCompleted(o.status));
  const inProgress = visible.filter((o) => isInProgress(o.status));
  const revenue = sumRevenue(visible);
  const profit = sumProfit(visible);
  const spent = sumCost(visible);

  // Notes that apply to the day(s) currently in view, newest day first.
  const selectedDay = addDateFor(sp);
  const dayNotes = (await getNotes())
    .filter((n) => n.date >= from && n.date <= to)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Main Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {ws ? `${ws.name} sales` : "What happened across all your websites"} {label}.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <WebsiteFilter />
          <PeriodFilter />
          <OrderModal defaultDate={addDateFor(sp)} defaultWorkspace={ws?.slug} />
        </div>
      </div>

      <StatusFilter />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Orders" value={formatNum(visible.length)} icon={<ClipboardList size={18} />} />
        <StatCard label="In Progress" value={formatNum(inProgress.length)} icon={<Clock size={18} />} iconClass="bg-amber-50 text-amber-600" />
        <StatCard label="Completed" value={formatNum(completed.length)} icon={<CheckCircle2 size={18} />} iconClass="bg-emerald-50 text-emerald-600" />
        <StatCard label="Revenue" value={formatCurrencyPrecise(revenue)} icon={<DollarSign size={18} />} iconClass="bg-sky-50 text-sky-600" />
        <StatCard label="Spent on Suppliers" value={formatCurrencyPrecise(spent)} icon={<DollarSign size={18} />} iconClass="bg-rose-50 text-rose-600" />
        <StatCard label="Profit" value={formatCurrencyPrecise(profit)} icon={<DollarSign size={18} />} iconClass="bg-emerald-50 text-emerald-600" />
      </div>

      <Card
        title={<span className="inline-flex items-center gap-2"><NotebookPen size={15} className="text-zinc-400" /> Daily Notes <span className="text-xs font-normal text-zinc-400">{label}</span></span>}
        action={<NoteModal defaultDate={selectedDay} compact />}
      >
        {dayNotes.length === 0 ? (
          <p className="text-sm text-zinc-500">No notes for this period. Add one to explain what happened on a day (e.g. day off, listings paused, supplier issue).</p>
        ) : (
          <ul className="space-y-3">
            {dayNotes.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">{n.date}</span>
                    <span>{n.author ?? "—"}</span>
                    <span className="text-zinc-300">·</span>
                    <span>logged {(n.created_at ?? "").replace("T", " ").slice(0, 16)}{n.updated_at ? " (edited)" : ""}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-zinc-700 whitespace-pre-wrap">{n.content}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <NoteModal note={n} />
                  <DeleteNoteButton id={n.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Recent Orders"
        action={
          <span className="text-xs text-zinc-400">
            {visible.length > MAX ? `showing latest ${MAX} of ${visible.length}` : `${visible.length} ${label}`}
          </span>
        }
      >
        {visible.length === 0 ? (
          <p className="text-sm text-zinc-500">No matching orders {label}. Use Add Order to log one.</p>
        ) : (
          <OrdersTable orders={visible.slice(0, MAX)} />
        )}
      </Card>
    </div>
  );
}
