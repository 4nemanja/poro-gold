"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, X } from "lucide-react";
import type { BugReport } from "@/lib/types";

// Add (no bug) or edit (bug provided) a bug report / feature request.
export function BugModal({ bug }: { bug?: BugReport }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!bug;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
    if (isEdit) payload.id = bug!.id;
    try {
      const res = await fetch("/api/bugs", {
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
        <button onClick={() => setOpen(true)} title="Edit" className="text-zinc-400 hover:text-sky-600 transition-colors">
          <Pencil size={15} />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors">
          <Plus size={16} /> Report Something
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">{isEdit ? "Edit Report" : "Report a Bug or Request"}</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <select name="type" defaultValue={bug?.type ?? "bug"} className={cls}>
                    <option value="bug">Bug</option>
                    <option value="request">Request / To add</option>
                  </select>
                </Field>
                {isEdit && (
                  <Field label="Status">
                    <select name="status" defaultValue={bug?.status ?? "open"} className={cls}>
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </Field>
                )}
              </div>
              <Field label="Title">
                <input name="title" defaultValue={bug?.title ?? ""} placeholder="e.g. Profit on GB-312195 is wrong" className={cls} required />
              </Field>
              <Field label="Details">
                <textarea name="description" defaultValue={bug?.description ?? ""} rows={3} placeholder="What's wrong / what to add. Be specific." className={cls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount (optional)">
                  <input name="amount" type="number" step="0.01" defaultValue={bug?.amount ?? ""} placeholder="e.g. 5" className={cls} />
                </Field>
                <Field label="Unit">
                  <select name="amount_unit" defaultValue={bug?.amount_unit ?? "$"} className={cls}>
                    <option value="$">$ (dollars)</option>
                    <option value="%">% (percent)</option>
                  </select>
                </Field>
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60">
                  {saving ? "Saving..." : isEdit ? "Save Changes" : "Submit"}
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
