"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Flag } from "lucide-react";

// "Add milestone" button + modal. Title and a due date are both required.
export function MilestoneModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: fd.get("title"), due_date: fd.get("due_date") }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const cls = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:underline">
        <Plus size={14} /> Add milestone
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Flag size={15} className="text-emerald-600" /> Add Milestone
              </h3>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Milestone</label>
                <input name="title" type="text" placeholder="e.g. All V-Bucks orders in PlayerOK" className={cls} required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Due date</label>
                <input name="due_date" type="date" className={cls} required />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50">
                  {saving ? "Adding…" : "Add milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
