"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, type WeekRange } from "@/lib/weeks";

// Drives the Weekly Review page via ?month=YYYY-MM&week=N. The month dropdown
// only lists months the business actually traded in, and weeks with no orders
// are shown greyed out rather than hidden, so a quiet week is visible as a
// quiet week instead of silently disappearing.
export function WeekPicker({
  months,
  weeks,
  month,
  week,
  emptyWeeks,
}: {
  months: string[];
  weeks: WeekRange[];
  month: string;
  week: number;
  emptyWeeks: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function go(nextMonth: string, nextWeek: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("month", nextMonth);
    params.set("week", String(nextWeek));
    router.push(`${pathname}?${params.toString()}`);
  }

  const monthIdx = months.indexOf(month);
  const weekIdx = weeks.findIndex((w) => w.index === week);

  // Previous/next step across the month boundary, so you can walk the whole
  // history without touching the dropdown.
  function step(delta: -1 | 1) {
    const target = weekIdx + delta;
    if (target >= 0 && target < weeks.length) return go(month, weeks[target].index);
    // months[] is newest-first, so the *older* month is at a higher index.
    const nextMonthIdx = monthIdx + (delta === -1 ? 1 : -1);
    if (nextMonthIdx < 0 || nextMonthIdx >= months.length) return;
    // Landing week: last week of the older month, or first week of the newer one.
    go(months[nextMonthIdx], delta === -1 ? 5 : 1);
  }

  const atOldest = monthIdx === months.length - 1 && weekIdx === 0;
  const atNewest = monthIdx === 0 && weekIdx === weeks.length - 1;

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <select
        value={month}
        onChange={(e) => go(e.target.value, 1)}
        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        aria-label="Month"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>

      <div className="flex items-center rounded-lg border border-zinc-200 overflow-hidden">
        <button
          onClick={() => step(-1)}
          disabled={atOldest}
          className="px-2 py-1.5 text-zinc-500 hover:bg-zinc-50 border-r border-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Previous week"
        >
          <ChevronLeft size={16} />
        </button>

        {weeks.map((w) => {
          const on = w.index === week;
          const empty = emptyWeeks.includes(w.index);
          return (
            <button
              key={w.index}
              onClick={() => go(month, w.index)}
              title={`${w.rangeLabel}${empty ? " · no orders" : ""}`}
              className={`px-3 py-1.5 text-sm font-medium border-r border-zinc-200 transition-colors ${
                on
                  ? "bg-zinc-900 text-white"
                  : empty
                  ? "bg-white text-zinc-300 hover:bg-zinc-50"
                  : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span>W{w.index}</span>
              <span className={`ml-1.5 text-[11px] ${on ? "text-zinc-300" : "text-zinc-400"}`}>{w.rangeLabel}</span>
            </button>
          );
        })}

        <button
          onClick={() => step(1)}
          disabled={atNewest}
          className="px-2 py-1.5 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Next week"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
