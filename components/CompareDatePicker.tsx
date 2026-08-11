"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";

// Two date pickers that drive the Compare Dates page via ?a=&b=. Date A vs Date B.
export function CompareDatePicker({ a, b, max }: { a: string; b: string; max?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function set(key: "a" | "b", value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mr-1">
        <CalendarRange size={14} /> Date A
      </span>
      <input
        type="date"
        value={a}
        max={max || undefined}
        onChange={(e) => set("a", e.target.value)}
        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <span className="text-xs font-semibold text-zinc-400 px-1">VS</span>
      <span className="text-xs font-medium text-zinc-500 mr-1">Date B</span>
      <input
        type="date"
        value={b}
        max={max || undefined}
        onChange={(e) => set("b", e.target.value)}
        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
    </div>
  );
}
