"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, X, NotebookPen } from "lucide-react";
import type { DailyNote } from "@/lib/types";

// Add (no note) or edit (note provided) a daily note. `defaultDate` pre-fills the
// day for a new note (e.g. the day you're currently viewing on the dashboard).
// `compact` renders a small "Add note" link instead of the big button.
export function NoteModal({ note, defaultDate, compact }: { note?: DailyNote; defaultDate?: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!note;
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
    if (isEdit) payload.id = note!.id;
    try {
      const res = await fetch("/api/notes", {
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
        <button onClick={() => setOpen(true)} title="Edit note" className="text-zinc-400 hover:text-sky-600 transition-colors">
          <Pencil size={15} />
        </button>
      ) : compact ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:underline">
          <Plus size={14} /> Add note
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors">
          <NotebookPen size={16} /> Add Note
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">{isEdit ? "Edit Note" : "Add Daily Note"}</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <Field label="Date this note is about">
                <input name="date" type="date" defaultValue={note?.date ?? defaultDate ?? today} className={cls} required />
              </Field>
              <Field label="Note">
                <textarea
                  name="content"
                  defaultValue={note?.content ?? ""}
                  rows={5}
                  placeholder="e.g. Fewer sales — supplier was out of stock all afternoon; listings paused 2–5pm."
                  className={cls}
                  required
                />
              </Field>
              <p className="-mt-2 text-xs text-zinc-400">You can pick a past or future date — e.g. flag a day off before it happens.</p>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60">
                  {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Note"}
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
