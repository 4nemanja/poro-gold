"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";

export function RefreshButton({ lastSynced }: { lastSynced?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function refresh() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Sync failed");
      setMsg({ text: `Synced ${data.report.orders} orders`, error: false });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Sync failed", error: true });
    } finally {
      setLoading(false);
    }
  }

  const relative = lastSynced ? timeAgo(lastSynced) : null;

  return (
    <div className="flex items-center gap-3">
      {msg ? (
        <span className={`text-xs ${msg.error ? "text-rose-600" : "text-emerald-600"}`}>{msg.text}</span>
      ) : (
        relative && <span className="text-xs text-zinc-400">Updated {relative}</span>
      )}
      <button
        onClick={refresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-colors"
      >
        <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
