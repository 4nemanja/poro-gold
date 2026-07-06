"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, X } from "lucide-react";
import type { GiftOrder } from "@/lib/data";

const STATUSES = [
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
];

// Add (no gift) or edit (gift provided) a V-Bucks gift sale.
export function GiftModal({ gift }: { gift?: GiftOrder }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!gift;
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
    if (isEdit) payload.id = gift!.id;
    try {
      const res = await fetch("/api/gifts", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  return (
    <>
      {isEdit ? (
        <button onClick={() => setOpen(true)} title="Edit gift" className="text-zinc-400 hover:text-sky-600 transition-colors">
          <Pencil size={15} />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors">
          <Plus size={16} /> Add Gift
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">{isEdit ? "Edit Gift" : "Add Gift Sale"}</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input name="date" type="date" defaultValue={gift?.date ?? today} className={cls} required />
                </Field>
                <Field label="Customer">
                  <input name="customer" defaultValue={gift?.customer ?? ""} placeholder="name / handle" className={cls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="V-Bucks Amount">
                  <input name="vbucks" type="number" step="1" min="0" defaultValue={gift?.vbucks ?? ""} placeholder="1000" className={cls} required />
                </Field>
                <Field label="Status">
                  <select name="status" defaultValue={gift?.status ?? "in_progress"} className={cls}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sold For ($)">
                  <input name="sold_for" type="number" step="0.01" min="0" defaultValue={gift?.sold_for ?? ""} placeholder="0.00" className={cls} />
                </Field>
                <Field label="Cost ($, optional)">
                  <input name="cost" type="number" step="0.01" min="0" defaultValue={gift?.cost ?? ""} placeholder="0.00" className={cls} />
                </Field>
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60">
                  {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Gift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const cls = "w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">{label}{children}</label>;
}
