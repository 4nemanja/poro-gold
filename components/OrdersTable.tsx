import { OrderRowActions } from "@/components/OrderRowActions";
import { formatCurrencyPrecise } from "@/lib/format";
import { statusLabel, statusBadgeClass, statusCategory } from "@/lib/orderStatus";
import { platformBadgeClass } from "@/lib/platformBadge";
import type { Order } from "@/lib/types";

// A refunded or cancelled order earned nothing, so it never shows a profit.
function profitOf(o: Order): number | null {
  const c = statusCategory(o.status);
  if (c === "refunded" || c === "cancelled") return null;
  return typeof o.profit === "number" ? o.profit : null;
}

// Shared order table used by Recent Orders and Refunded. `lastCol` controls the
// final date column (order date vs refund date).
export function OrdersTable({
  orders,
  lastCol = "Date",
  useRefundDate = false,
}: {
  orders: Order[];
  lastCol?: string;
  useRefundDate?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse min-w-[900px]">
      <thead>
        <tr className="border-b border-zinc-200">
          <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Order</th>
          <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Website</th>
          <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Product</th>
          <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Supplier</th>
          <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
          <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Sold</th>
          <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Supplier Cost</th>
          <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Profit</th>
          <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">{lastCol}</th>
          <th className="pb-3 w-16"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200">
        {orders.map((o) => {
          const profit = profitOf(o);
          return (
          <tr key={o.order_id} className="hover:bg-zinc-50 transition-colors">
            <td className="py-3.5 text-sm font-mono text-zinc-500">{o.order_id}</td>
            <td className="py-3.5 text-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${platformBadgeClass(o.platform)}`}>
                {o.platform ?? "—"}
              </span>
            </td>
            <td className="py-3.5 text-sm text-zinc-700 max-w-xs truncate">{o.product ?? "—"}</td>
            <td className="py-3.5 text-sm text-zinc-500">{o.supplier ?? "—"}</td>
            <td className="py-3.5 text-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(o.status)}`}>
                {statusLabel(o.status)}
              </span>
            </td>
            <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">
              {typeof o.sold_for === "number" ? formatCurrencyPrecise(o.sold_for) : "—"}
            </td>
            <td className="py-3.5 text-sm font-mono text-rose-600 text-right">
              {typeof o.cost === "number" ? formatCurrencyPrecise(o.cost) : "—"}
            </td>
            <td className={`py-3.5 text-sm font-mono text-right ${profit == null ? "text-zinc-400" : profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {profit == null ? "—" : formatCurrencyPrecise(profit)}
            </td>
            <td className="py-3.5 text-sm text-zinc-500 text-right">
              {(useRefundDate ? (o.refunded_at ?? o.date) : o.date) ?? "—"}
            </td>
            <td className="py-3.5 text-right"><OrderRowActions order={o} /></td>
          </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
