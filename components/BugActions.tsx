"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Trash2 } from "lucide-react";

// Resolve/reopen toggle + delete for one bug row.
export function BugActions({ id, status }: { id: string; status: "open" | "resolved" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/bugs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: status === "open" ? "resolved" : "open" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("Delete this report?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bugs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <button
        onClick={toggle}
        disabled={busy}
        title={status === "open" ? "Mark resolved" : "Reopen"}
        className={`${status === "open" ? "text-zinc-400 hover:text-emerald-600" : "text-zinc-400 hover:text-amber-600"} disabled:opacity-50 transition-colors`}
      >
        {status === "open" ? <Check size={16} /> : <RotateCcw size={15} />}
      </button>
      <button onClick={del} disabled={busy} title="Delete" className="text-zinc-400 hover:text-rose-600 disabled:opacity-50 transition-colors">
        <Trash2 size={15} />
      </button>
    </div>
  );
}
