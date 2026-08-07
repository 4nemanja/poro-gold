"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";

// From/To date pickers that drive the custom Profit & Costs window via ?from=&to=.
export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function set(key: "from" | "to", value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function reset() {
    const params = new URLSearchParams(sp.toString());
    params.delete("from");
    params.delete("to");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mr-1">
        <CalendarRange size={14} /> Range
      </span>
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => set("from", e.target.value)}
        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <span className="text-xs text-zinc-400">→</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => set("to", e.target.value)}
        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <button onClick={reset} className="text-xs text-zinc-400 hover:text-zinc-700 underline ml-1">
        Reset
      </button>
    </div>
  );
}
