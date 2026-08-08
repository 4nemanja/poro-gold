"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Circle } from "lucide-react";

// Complete-toggle + delete for a single milestone row.
export function MilestoneActions({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/milestones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, done: !done }),
      });
      if (!(await res.json()).ok) throw new Error();
      router.refresh();
    } catch {
      alert("Could not update milestone.");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("Delete this milestone?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/milestones?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!(await res.json()).ok) throw new Error();
      router.refresh();
    } catch {
      alert("Could not delete milestone.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={busy}
        title={done ? "Mark as not done" : "Mark as done"}
        className={`transition-colors disabled:opacity-50 ${done ? "text-emerald-600 hover:text-zinc-400" : "text-zinc-300 hover:text-emerald-600"}`}
      >
        {done ? <Check size={16} /> : <Circle size={16} />}
      </button>
      <button onClick={del} disabled={busy} title="Delete milestone" className="text-zinc-300 hover:text-rose-600 disabled:opacity-50 transition-colors">
        <Trash2 size={15} />
      </button>
    </div>
  );
}
