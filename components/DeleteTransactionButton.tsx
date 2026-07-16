"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteTransactionButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm("Delete this transaction?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={del} disabled={busy} title="Delete transaction" className="text-zinc-400 hover:text-rose-600 disabled:opacity-50 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}
