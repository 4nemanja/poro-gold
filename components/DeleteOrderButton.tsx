"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteOrderButton({
  orderId,
  redirectTo,
}: {
  orderId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm("Delete this manually-added order? This can't be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      title="Delete order"
      className="text-zinc-400 hover:text-rose-600 disabled:opacity-50 transition-colors"
    >
      <Trash2 size={15} />
    </button>
  );
}
