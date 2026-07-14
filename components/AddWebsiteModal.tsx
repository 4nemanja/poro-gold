"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

// Add a custom website (marketplace). Orders/revenue are always computed from
// orders — only the name, source and optional fees are entered here.
export function AddWebsiteModal() {
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
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fd.entries())),
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
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 transition-colors">
        <Plus size={15} /> Add Website
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">Add Website</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <Field label="Website Name">
                <input name="name" placeholder="e.g. Eldorado" className={cls} required />
              </Field>
              <Field label="Source">
                <select name="source" defaultValue="manual" className={cls}>
                  <option value="manual">Manual</option>
                  <option value="live api">Live API</option>
                  <option value="excel export">Excel Export</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Selling Fee % (optional)">
                  <input name="selling_fee" type="number" step="0.01" min="0" max="100" placeholder="—" className={cls} />
                </Field>
                <Field label="Withdrawal Fee % (optional)">
                  <input name="withdrawal_fee" type="number" step="0.01" min="0" max="100" placeholder="—" className={cls} />
                </Field>
              </div>
              <p className="-mt-2 text-xs text-zinc-400">Orders, completed and revenue are calculated automatically from orders on this website.</p>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60">
                  {saving ? "Adding..." : "Add Website"}
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
