"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "3 Months" },
  { key: "all", label: "All" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shift(dateISO: string, delta: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function PeriodFilter({ defaultRange = "today" }: { defaultRange?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const day = sp.get("day");
  const range = sp.get("range") ?? defaultRange;

  function setRange(key: string) {
    const params = new URLSearchParams(sp.toString());
    params.set("range", key);
    params.delete("day");
    router.push(`${pathname}?${params.toString()}`);
  }
  function setDay(d: string) {
    const params = new URLSearchParams(sp.toString());
    if (d) {
      params.set("day", d);
      params.delete("range");
    } else {
      params.delete("day");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // Base date for prev/next stepping: the selected day, or today.
  const baseDay = day ?? todayISO();
  const nextDisabled = baseDay >= todayISO(); // don't step into the future

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
        {PRESETS.map((pr) => {
          const active = !day && range === pr.key;
          return (
            <button
              key={pr.key}
              onClick={() => setRange(pr.key)}
              className={`px-3 py-1.5 text-sm font-medium border-r border-zinc-200 last:border-r-0 transition-colors ${
                active ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {pr.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center rounded-lg border border-zinc-200 overflow-hidden">
        <button
          onClick={() => setDay(shift(baseDay, -1))}
          className="px-2 py-1.5 text-zinc-500 hover:bg-zinc-50 border-r border-zinc-200"
          title="Previous day"
        >
          <ChevronLeft size={16} />
        </button>
        <input
          type="date"
          value={day ?? ""}
          onChange={(e) => setDay(e.target.value)}
          className={`px-2 py-1.5 text-sm outline-none ${day ? "text-zinc-900" : "text-zinc-500"}`}
          title="Jump to a specific day"
        />
        <button
          onClick={() => !nextDisabled && setDay(shift(baseDay, 1))}
          disabled={nextDisabled}
          className="px-2 py-1.5 text-zinc-500 hover:bg-zinc-50 border-l border-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Next day"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
