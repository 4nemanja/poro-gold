"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, User, X } from "lucide-react";

// Filter the Notes History by day (?date=) and author (?author=).
export function NotesFilter({ authors }: { authors: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const date = sp.get("date") ?? "";
  const author = sp.get("author") ?? "";

  function set(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const filtering = !!date || !!author;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm">
        <CalendarDays size={15} className="text-zinc-400" />
        <input
          type="date"
          value={date}
          onChange={(e) => set("date", e.target.value)}
          className="bg-transparent text-sm text-zinc-700 outline-none"
        />
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm">
        <User size={15} className="text-zinc-400" />
        <select value={author} onChange={(e) => set("author", e.target.value)} className="bg-transparent text-sm font-medium text-zinc-700 outline-none">
          <option value="">All authors</option>
          {authors.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </label>
      {filtering && (
        <button
          onClick={() => router.push(pathname)}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 underline"
        >
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );
}
