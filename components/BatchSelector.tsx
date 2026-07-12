"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";

// Picks which batch to drill into on the Batch Analysis tab (?batch=<id>).
export function BatchSelector({ options }: { options: { id: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get("batch") ?? (options[0]?.id ?? "");

  function pick(id: string) {
    const params = new URLSearchParams(sp.toString());
    params.set("batch", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm">
      <Layers size={15} className="text-zinc-400" />
      <select value={current} onChange={(e) => pick(e.target.value)} className="bg-transparent text-sm font-medium text-zinc-700 outline-none">
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
