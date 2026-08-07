"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Shift an ISO date (YYYY-MM-DD) by whole days in UTC, matching the server.
function shift(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Prev / next / pick-any date navigator that drives the tracker via ?date=.
export function TrackerDatePicker({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const isToday = date >= today;

  function go(d: string) {
    const params = new URLSearchParams(sp.toString());
    if (!d || d === today) params.delete("date");
    else params.set("date", d);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const btn =
    "flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => go(shift(date, -1))} className={btn} aria-label="Previous day">
        <ChevronLeft size={16} />
      </button>
      <input
        type="date"
        value={date}
        max={today}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <button onClick={() => go(shift(date, 1))} disabled={isToday} className={btn} aria-label="Next day">
        <ChevronRight size={16} />
      </button>
      {!isToday && (
        <button onClick={() => go(today)} className="text-xs text-zinc-400 hover:text-zinc-700 underline ml-1">
          Today
        </button>
      )}
    </div>
  );
}
