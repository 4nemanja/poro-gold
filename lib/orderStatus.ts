// Maps raw GameBoost order statuses to display labels + tones used across the UI.

export type StatusTone = "submitted" | "progress" | "completed" | "refunded" | "neutral";

const MAP: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: "Submitted", tone: "submitted" },
  in_delivery: { label: "In Progress", tone: "progress" },
  delivered: { label: "Completed", tone: "completed" },
  completed: { label: "Completed", tone: "completed" },
  refunded: { label: "Refunded", tone: "refunded" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function statusLabel(raw: string | null | undefined): string {
  if (!raw) return "—";
  return MAP[raw.toLowerCase()]?.label ?? raw;
}

export function statusTone(raw: string | null | undefined): StatusTone {
  if (!raw) return "neutral";
  return MAP[raw.toLowerCase()]?.tone ?? "neutral";
}

export function statusBadgeClass(raw: string | null | undefined): string {
  switch (statusTone(raw)) {
    case "submitted":
      return "bg-sky-50 text-sky-700";
    case "progress":
      return "bg-amber-50 text-amber-700";
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "refunded":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

export const COMPLETED_STATUSES = ["delivered", "completed"];
export const IN_PROGRESS_STATUSES = ["in_delivery", "pending"];

export function isCompleted(raw: string | null | undefined): boolean {
  return !!raw && COMPLETED_STATUSES.includes(raw.toLowerCase());
}

export function isInProgress(raw: string | null | undefined): boolean {
  return !!raw && IN_PROGRESS_STATUSES.includes(raw.toLowerCase());
}

// Normalize any raw status to one of the filter chip categories, so the
// "Completed" chip also matches GameBoost "delivered", etc.
export function statusCategory(raw: string | null | undefined): string {
  const s = (raw ?? "").toLowerCase();
  if (COMPLETED_STATUSES.includes(s)) return "completed";
  if (IN_PROGRESS_STATUSES.includes(s)) return "in_delivery";
  if (s === "refunded") return "refunded";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "other";
}
