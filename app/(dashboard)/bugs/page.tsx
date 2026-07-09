import { getBugs } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { BugModal } from "@/components/BugModal";
import { BugActions } from "@/components/BugActions";
import { formatNum } from "@/lib/format";
import { Bug, CircleDot, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtAmount(amount: number | null, unit: string | null): string {
  if (amount == null) return "—";
  return unit === "%" ? `${amount}%` : `$${amount.toFixed(2)}`;
}

export default async function BugsPage() {
  const bugs = (await getBugs()).sort((a, b) => {
    // Open first, then newest.
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
  const open = bugs.filter((b) => b.status === "open").length;
  const resolved = bugs.length - open;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bugs &amp; Requests</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Anything broken or to add — logged by the team, with an optional $ or % attached.
          </p>
        </div>
        <BugModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Open" value={formatNum(open)} icon={<CircleDot size={18} />} iconClass="bg-amber-50 text-amber-600" />
        <StatCard label="Resolved" value={formatNum(resolved)} icon={<CheckCircle2 size={18} />} iconClass="bg-emerald-50 text-emerald-600" />
        <StatCard label="Total" value={formatNum(bugs.length)} icon={<Bug size={18} />} iconClass="bg-sky-50 text-sky-600" />
      </div>

      <Card title="Reports" action={<span className="text-xs text-zinc-400">{open} open · {resolved} resolved</span>}>
        {bugs.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing logged yet. Use “Report Something” to add a bug or a request.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Report</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase text-right">Amount</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Reported By</th>
                  <th className="pb-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                  <th className="pb-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {bugs.map((b) => (
                  <tr key={b.id} className={`hover:bg-zinc-50 transition-colors ${b.status === "resolved" ? "opacity-60" : ""}`}>
                    <td className="py-3.5 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.status === "open" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {b.status === "open" ? "Open" : "Resolved"}
                      </span>
                    </td>
                    <td className="py-3.5 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.type === "bug" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`}>
                        {b.type === "bug" ? "Bug" : "Request"}
                      </span>
                    </td>
                    <td className="py-3.5 text-sm text-zinc-700 max-w-md">
                      <div className={`font-medium text-zinc-900 ${b.status === "resolved" ? "line-through" : ""}`}>{b.title}</div>
                      {b.description && <div className="text-xs text-zinc-500 mt-0.5 whitespace-pre-wrap">{b.description}</div>}
                    </td>
                    <td className="py-3.5 text-sm font-mono text-zinc-700 text-right">{fmtAmount(b.amount, b.amount_unit)}</td>
                    <td className="py-3.5 text-sm text-zinc-500">{b.reporter ?? "—"}</td>
                    <td className="py-3.5 text-sm text-zinc-500">{(b.created_at ?? "").slice(0, 10)}</td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <BugModal bug={b} />
                        <BugActions id={b.id} status={b.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
