"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";

// Inline-editable withdrawal fee (%) for one platform. Click the pencil to edit,
// type a new %, save. Persists to app_config via /api/withdrawal-fees.
export function WithdrawalFeeCell({ slug, pct }: { slug: string; pct: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(pct));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/withdrawal-fees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: slug, pct: value === "" ? 0 : Number(value) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setEditing(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="font-mono text-zinc-700">{pct ? `${pct}%` : "—"}</span>
        <button onClick={() => setEditing(true)} title="Edit withdrawal fee" className="text-zinc-400 hover:text-sky-600">
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        autoFocus
        type="number"
        step="0.01"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className={`w-16 rounded border px-1.5 py-1 text-right text-sm ${error ? "border-rose-400" : "border-zinc-300"}`}
      />
      <span className="text-xs text-zinc-400">%</span>
      <button onClick={save} disabled={saving} title="Save" className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
        <Check size={15} />
      </button>
      <button onClick={() => { setEditing(false); setValue(String(pct)); }} title="Cancel" className="text-zinc-400 hover:text-zinc-700">
        <X size={15} />
      </button>
    </div>
  );
}
