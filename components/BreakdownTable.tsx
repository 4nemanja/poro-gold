"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { formatCurrencyPrecise, formatNum } from "@/lib/format";
import type { Ranked } from "@/lib/batches";

type Key = "name" | "count" | "revenue" | "profit" | "marginPct";
type Dir = "asc" | "desc";

// Sortable "By Product" / "By Supplier" table. Click a header to sort by it;
// click again to flip direction. Numbers default to highest-first.
export function BreakdownTable({ rows, firstCol }: { rows: Ranked[]; firstCol: string }) {
  const [key, setKey] = useState<Key>("profit");
  const [dir, setDir] = useState<Dir>("desc");

  if (rows.length === 0) return <p className="text-sm text-zinc-500">No {firstCol.toLowerCase()} data for this batch.</p>;

  const cols: { key: Key; label: string; align: "left" | "right" }[] = [
    { key: "name", label: firstCol, align: "left" },
    { key: "count", label: "Orders", align: "right" },
    { key: "revenue", label: "Revenue", align: "right" },
    { key: "profit", label: "Profit", align: "right" },
    { key: "marginPct", label: "Margin", align: "right" },
  ];

  function onSort(k: Key) {
    if (k === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setKey(k);
      setDir(k === "name" ? "asc" : "desc"); // numbers highest-first, names A→Z
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp: number;
    if (key === "name") cmp = a.name.localeCompare(b.name);
    else cmp = (a[key] as number) - (b[key] as number);
    return dir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-200">
            {cols.map((c) => {
              const active = c.key === key;
              return (
                <th key={c.key} className="pb-3 text-xs font-medium text-zinc-500 uppercase">
                  <button
                    onClick={() => onSort(c.key)}
                    className={`inline-flex items-center gap-1 hover:text-zinc-800 transition-colors ${c.align === "right" ? "flex-row-reverse w-full justify-start" : ""} ${active ? "text-zinc-800" : ""}`}
                  >
                    {c.label}
                    {active ? (
                      dir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ChevronsUpDown size={13} className="text-zinc-300" />
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {sorted.map((r) => (
            <tr key={r.name} className="hover:bg-zinc-50 transition-colors">
              <td className="py-3 text-sm text-zinc-700">{r.name}</td>
              <td className="py-3 text-sm font-mono text-zinc-700 text-right">{formatNum(r.count)}</td>
              <td className="py-3 text-sm font-mono text-zinc-700 text-right">{formatCurrencyPrecise(r.revenue)}</td>
              <td className="py-3 text-sm font-mono text-emerald-600 text-right">{formatCurrencyPrecise(r.profit)}</td>
              <td className="py-3 text-sm font-mono text-zinc-500 text-right">{r.revenue > 0 ? `${r.marginPct}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
