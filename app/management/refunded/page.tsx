import { LEDGER_START, resolveWorkspace } from "@/lib/data";
import { loadOrders } from "@/lib/ordersView";
import { statusCategory } from "@/lib/orderStatus";
import { Card } from "@/components/ui/Card";
import { OrdersTable } from "@/components/OrdersTable";
import { WebsiteFilter } from "@/components/WebsiteFilter";
import { formatCurrencyPrecise } from "@/lib/format";

export const dynamic = "force-dynamic";
const MAX = 100;

export default async function RefundedPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>;
}) {
  const sp = await searchParams;
  const ws = sp.ws ? await resolveWorkspace(sp.ws) : null;

  const { all } = await loadOrders();
  const refunds = all
    .filter(
      (o) =>
        statusCategory(o.status) === "refunded" &&
        (o.refunded_at ?? o.date ?? "") >= LEDGER_START &&
        (!ws || o.workspace === ws.slug),
    )
    .sort((a, b) => (b.refunded_at ?? b.date ?? "").localeCompare(a.refunded_at ?? a.date ?? ""));
  const value = refunds.reduce((acc, o) => acc + (o.sold_for ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Refunded Orders</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Refunds{ws ? ` on ${ws.name}` : ""} from {LEDGER_START} onward, newest first — so a refund on an older order still surfaces here.
          </p>
        </div>
        <WebsiteFilter />
      </div>

      <Card
        title="Refunded Orders"
        action={<span className="text-xs text-zinc-400">{refunds.length} total · {formatCurrencyPrecise(value)}</span>}
      >
        {refunds.length === 0 ? (
          <p className="text-sm text-zinc-500">{ws ? `No refunds on ${ws.name}.` : "No refunds. Nice."}</p>
        ) : (
          <OrdersTable orders={refunds.slice(0, MAX)} lastCol="Refunded On" useRefundDate showRefundReason />
        )}
      </Card>
    </div>
  );
}
