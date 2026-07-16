export const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

export const formatCurrencyPrecise = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(val);

export const formatNum = (val: number) =>
  new Intl.NumberFormat("en-US").format(val);

// "just now", "30m ago", "5h ago", "3d ago", "2w ago", "4mo ago", "1y ago".
// Accepts a full ISO datetime or a date-only string.
export function timeAgo(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, (nowMs - t) / 1000);
  if (s < 45) return "just now";
  if (s < 90) return "1m ago";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// Full local date/time for tooltips, e.g. "Jul 15, 2026, 11:28".
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const hasTime = /\d{2}:\d{2}/.test(String(iso));
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
