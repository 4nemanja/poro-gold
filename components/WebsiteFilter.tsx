"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { WORKSPACES, type Workspace } from "@/lib/workspaces";

// Main-dashboard website selector: "All Websites" or a single site. Works like
// the By Website tab, but lets you also see everything at once. Sets ?ws=<slug>.
export function WebsiteFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get("ws") ?? "all";
  const [websites, setWebsites] = useState<Workspace[]>(WORKSPACES);

  useEffect(() => {
    let alive = true;
    fetch("/api/websites")
      .then((r) => r.json())
      .then((d) => { if (alive && d.ok) setWebsites(d.websites); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  function pick(slug: string) {
    const params = new URLSearchParams(sp.toString());
    if (slug === "all") params.delete("ws");
    else params.set("ws", slug);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm">
      <Globe size={15} className="text-zinc-400" />
      <select
        value={current}
        onChange={(e) => pick(e.target.value)}
        className="bg-transparent text-sm font-medium text-zinc-700 outline-none"
      >
        <option value="all">All Websites</option>
        {websites.map((w) => (
          <option key={w.slug} value={w.slug}>{w.name}</option>
        ))}
      </select>
    </label>
  );
}
