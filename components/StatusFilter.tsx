"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

const STATUSES = [
  { key: "completed", label: "Completed", on: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { key: "in_delivery", label: "In Progress", on: "bg-amber-100 text-amber-800 border-amber-200" },
  { key: "refunded", label: "Refunded", on: "bg-rose-100 text-rose-800 border-rose-200" },
  { key: "cancelled", label: "Cancelled", on: "bg-zinc-200 text-zinc-700 border-zinc-300" },
];
const ALL = STATUSES.map((s) => s.key);

// Filter chips: colored when included, muted when filtered out. No `status`
// param = everything shown. Preserves the period params (range/day) in the URL.
export function StatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const current = sp.get("status");
  const selected = current ? new Set(current.split(",").filter(Boolean)) : new Set(ALL);
  const filtering = selected.size !== ALL.length;

  function apply(next: Set<string>) {
    const params = new URLSearchParams(sp.toString());
    if (next.size === 0 || next.size === ALL.length) params.delete("status");
    else params.set("status", [...next].join(","));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mr-1">
        <SlidersHorizontal size={14} /> Filter
      </span>
      {STATUSES.map((s) => {
        const on = selected.has(s.key);
        return (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              on ? s.on : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300"
            }`}
          >
            {s.label}
          </button>
        );
      })}
      {filtering && (
        <button onClick={() => apply(new Set(ALL))} className="text-xs text-zinc-400 hover:text-zinc-700 underline ml-1">
          Reset
        </button>
      )}
    </div>
  );
}
