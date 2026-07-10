import { sumRevenue, sumProfit, sumCost } from "@/lib/data";
import { loadOrders, resolvePeriod, inRange, makeStatusMatch, addDateFor, type ViewParams } from "@/lib/ordersView";
import { isCompleted, isInProgress } from "@/lib/orderStatus";
import { getWorkspace } from "@/lib/workspaces";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { OrderModal } from "@/components/OrderModal";
import { OrdersTable } from "@/components/OrdersTable";
import { PeriodFilter } from "@/components/PeriodFilter";
import { StatusFilter } from "@/components/StatusFilter";
import { WebsiteFilter } from "@/components/WebsiteFilter";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import { ClipboardList, CheckCircle2, Clock, DollarSign } from "lucide-react";

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
  const ws = sp.ws ? getWorkspace(sp.ws) : null;

  const { all } = await loadOrders();
  const visible = all.filter(
    (o) => inRange(o, from, to) && statusMatch(o) && (!ws || o.workspace === ws.slug),
  );
  const completed = visible.filter((o) => isCompleted(o.status));
  const inProgress = visible.filter((o) => isInProgress(o.status));
  const revenue = sumRevenue(visible);
  const profit = sumProfit(visible);
  const spent = sumCost(visible);

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
