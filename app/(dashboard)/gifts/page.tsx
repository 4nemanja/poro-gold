import { getGiftConfig, getGiftOrders, getGiftFlaggedOrders, type GiftOrder } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { GiftModal } from "@/components/GiftModal";
import { GiftConfigModal } from "@/components/GiftConfigModal";
import { DeleteGiftButton } from "@/components/DeleteGiftButton";
import { OrderRowActions } from "@/components/OrderRowActions";
import { GiftStatusFilter } from "@/components/GiftStatusFilter";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import { statusLabel, statusBadgeClass, statusCategory } from "@/lib/orderStatus";
import type { Order } from "@/lib/types";
import { Gift, Wallet, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

type ViewParams = { gstatus?: string };

// One display row for either a legacy gift (gift_orders) or a gift-flagged order.
type Row = {
  key: string;
  date: string;
  ref: string; // customer / buyer / order id
  vbucks: number;
  bucket: "in_progress" | "completed" | "refunded" | "cancelled" | "other";
  rawStatus: string;
  sold_for: number | null;
  gift?: GiftOrder;
  order?: Order;
};

// Both a gift's "in_progress" and an order's "in_delivery"/"pending" mean the
// same thing here, so map everything to one set of buckets.
function bucketOf(status: string | null | undefined): Row["bucket"] {
  const s = (status ?? "").toLowerCase();
  if (s === "in_progress") return "in_progress";
  const c = statusCategory(s);
  if (c === "completed") return "completed";
  if (c === "in_delivery") return "in_progress";
  if (c === "refunded") return "refunded";
  if (c === "cancelled") return "cancelled";
  return "other";
}

export default async function GiftSystemPage({
  searchParams,
}: {
  searchParams: Promise<ViewParams>;
}) {
  const sp = await searchParams;
  const sel = sp.gstatus ? new Set(sp.gstatus.split(",").filter(Boolean)) : null;

  const [cfg, gifts, flagged] = await Promise.all([
    getGiftConfig(),
    getGiftOrders(),
    getGiftFlaggedOrders(),
  ]);

  const rows: Row[] = [
    ...gifts.map((g) => ({
      key: `g:${g.id}`,
      date: g.date ?? "",
      ref: g.customer ?? "—",
      vbucks: g.vbucks || 0,
      bucket: bucketOf(g.status),
      rawStatus: g.status,
      sold_for: g.sold_for,
      gift: g,
    })),
    ...flagged.map((o) => ({
      key: `o:${o.order_id}`,
      date: o.date ?? "",
      ref: o.order_id,
      vbucks: o.vbucks || 0,
      bucket: bucketOf(o.status),
      rawStatus: o.status ?? "",
      sold_for: o.sold_for,
      order: o,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // Inventory + revenue use ALL rows (a true stock figure); the filter narrows
  // only the list below.
  const sumVb = (bucket: Row["bucket"]) => rows.filter((r) => r.bucket === bucket).reduce((a, r) => a + r.vbucks, 0);
  const consumed = sumVb("completed");
  const reserved = sumVb("in_progress");
  const refundedVb = sumVb("refunded");
  const available = cfg.vbucks_stock - consumed - reserved - refundedVb;
  const revenue = rows.filter((r) => r.bucket === "completed").reduce((a, r) => a + (r.sold_for ?? 0), 0);

  const visible = sel ? rows.filter((r) => sel.has(r.bucket)) : rows;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gift System</h1>
          <p className="text-sm text-zinc-500 mt-1">
            V-Bucks gifts. Add here, or tick “Gift Order” on the Main Dashboard — those show in both places and stay in sync.
          </p>
        </div>
        <GiftModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <span className="text-sm text-zinc-500">Invested</span>
            <GiftConfigModal config={cfg} />
          </div>
          <div className="mt-3 text-3xl font-bold text-zinc-900">{formatCurrencyPrecise(cfg.invested_usd)}</div>
          {cfg.note && <div className="text-xs text-zinc-400 mt-1">{cfg.note}</div>}
        </Card>
        <StatCard label="Available Balance" value={`${formatNum(available)} VBs`} icon={<Wallet size={18} />} iconClass="bg-sky-50 text-sky-600" />
        <StatCard label="In Use" value={`${formatNum(reserved)} VBs`} icon={<Clock size={18} />} iconClass="bg-amber-50 text-amber-600" />
        <StatCard label="Revenue" value={formatCurrencyPrecise(revenue)} icon={<Gift size={18} />} iconClass="bg-emerald-50 text-emerald-600" />
      </div>

      <GiftStatusFilter />

      <Card title="Gift Sales" action={<span className="text-xs text-zinc-400">stock {formatNum(cfg.vbucks_stock)} VBs · {visible.length} of {rows.length}</span>}>
        {visible.length === 0 ? (
          <p className="text-sm text-zinc-500">No gifts in this view. Use Add Gift, or tick “Gift Order” on the Main Dashboard.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Customer / Order</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">V-Bucks</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Source</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Sold For</th>
                <th className="pb-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {visible.map((r) => (
                <tr key={r.key} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3.5 text-sm text-zinc-500">{r.date || "—"}</td>
                  <td className="py-3.5 text-sm text-zinc-700 max-w-xs truncate">{r.ref}</td>
                  <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">{r.vbucks ? formatNum(r.vbucks) : "—"}</td>
                  <td className="py-3.5 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(r.rawStatus)}`}>
                      {statusLabel(r.rawStatus)}
                    </span>
                  </td>
                  <td className="py-3.5 text-sm">
                    {r.order ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700">{r.order.platform ?? "Order"}</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">Gift</span>
                    )}
                  </td>
                  <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">
                    {typeof r.sold_for === "number" ? formatCurrencyPrecise(r.sold_for) : "—"}
                  </td>
                  <td className="py-3.5 text-right">
                    {r.gift ? (
                      <div className="flex items-center justify-end gap-3">
                        <GiftModal gift={r.gift} />
                        <DeleteGiftButton id={r.gift.id} />
                      </div>
                    ) : (
                      <OrderRowActions order={r.order!} />
                    )}
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
