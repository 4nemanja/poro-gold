import { getGiftConfig, getGiftOrders } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { GiftModal } from "@/components/GiftModal";
import { GiftConfigModal } from "@/components/GiftConfigModal";
import { DeleteGiftButton } from "@/components/DeleteGiftButton";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import { statusLabel, statusBadgeClass } from "@/lib/orderStatus";
import { Gift, Wallet, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GiftSystemPage() {
  const cfg = await getGiftConfig();
  const gifts = (await getGiftOrders()).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const vb = (g: { status: string; vbucks: number }) => g.vbucks || 0;
  const consumed = gifts.filter((g) => g.status === "completed").reduce((a, g) => a + vb(g), 0);
  const reserved = gifts.filter((g) => g.status === "in_progress").reduce((a, g) => a + vb(g), 0);
  const refundedVb = gifts.filter((g) => g.status === "refunded").reduce((a, g) => a + vb(g), 0);
  const available = cfg.vbucks_stock - consumed - reserved - refundedVb;
  const revenue = gifts.filter((g) => g.status === "completed").reduce((a, g) => a + (g.sold_for ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gift System</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Buy V-Bucks from suppliers, gift them to customers from your accounts.
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

      <Card title="Gift Sales" action={<span className="text-xs text-zinc-400">stock {formatNum(cfg.vbucks_stock)} VBs · {gifts.length} gifts</span>}>
        {gifts.length === 0 ? (
          <p className="text-sm text-zinc-500">No gifts yet. Use Add Gift to log a sale.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Customer</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">V-Bucks</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Sold For</th>
                <th className="pb-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {gifts.map((g) => (
                <tr key={g.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3.5 text-sm text-zinc-500">{g.date}</td>
                  <td className="py-3.5 text-sm text-zinc-700">{g.customer ?? "—"}</td>
                  <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">{formatNum(g.vbucks)}</td>
                  <td className="py-3.5 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(g.status)}`}>
                      {statusLabel(g.status)}
                    </span>
                  </td>
                  <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">
                    {typeof g.sold_for === "number" ? formatCurrencyPrecise(g.sold_for) : "—"}
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <GiftModal gift={g} />
                      <DeleteGiftButton id={g.id} />
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
