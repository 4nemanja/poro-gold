"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, X } from "lucide-react";
import type { SupplierRecord } from "@/lib/types";

// Add (no supplier) or edit (supplier provided) a managed supplier.
export function SupplierModal({ supplier }: { supplier?: SupplierRecord }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [system, setSystem] = useState<"FIXED" | "SPLIT">(supplier?.profit_system ?? "FIXED");

  const isEdit = !!supplier;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
    if (isEdit) payload.original_name = supplier!.name;
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
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
        <button onClick={() => setOpen(true)} title="Edit supplier" className="text-zinc-400 hover:text-sky-600 transition-colors">
          <Pencil size={15} />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors">
          <Plus size={16} /> Add Supplier
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">{isEdit ? "Edit Supplier" : "Add Supplier"}</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <Field label="Name">
                <input name="name" defaultValue={supplier?.name ?? ""} placeholder="e.g. ESLAM" className={cls} required />
              </Field>
              <Field label="Description (what they do)">
                <textarea name="description" defaultValue={supplier?.description ?? ""} placeholder="e.g. V-Bucks via Epic, fast delivery" rows={2} className={cls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Profit System">
                  <select name="profit_system" value={system} onChange={(e) => setSystem(e.target.value as "FIXED" | "SPLIT")} className={cls}>
                    <option value="FIXED">FIXED (you keep all profit)</option>
                    <option value="SPLIT">SPLIT (supplier takes a share)</option>
                  </select>
                </Field>
                <Field label="Supplier Share % (SPLIT)">
                  <input name="share_pct" type="number" step="1" min="0" max="100" defaultValue={supplier?.share_pct ?? ""} placeholder="e.g. 50" disabled={system === "FIXED"} className={`${cls} disabled:bg-zinc-100 disabled:text-zinc-400`} />
                </Field>
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60">
                  {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Supplier"}
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
