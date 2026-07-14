// Color-code each website so it's clear at a glance which marketplace an order
// came from in mixed lists (Main Dashboard recent orders, suppliers, etc.).
const MAP: Record<string, string> = {
  gameboost: "bg-sky-50 text-sky-700",
  g2g: "bg-violet-50 text-violet-700",
  igv: "bg-teal-50 text-teal-700",
  playerok: "bg-amber-50 text-amber-700",
  kupujemprodajem: "bg-rose-50 text-rose-700",
};

// Palette for custom (user-added) websites — a stable color is picked from the
// name so each site keeps the same badge color everywhere.
const PALETTE = [
  "bg-indigo-50 text-indigo-700",
  "bg-emerald-50 text-emerald-700",
  "bg-cyan-50 text-cyan-700",
  "bg-fuchsia-50 text-fuchsia-700",
  "bg-lime-50 text-lime-700",
  "bg-orange-50 text-orange-700",
  "bg-pink-50 text-pink-700",
  "bg-blue-50 text-blue-700",
];

export function platformBadgeClass(nameOrSlug: string | null | undefined): string {
  if (!nameOrSlug) return "bg-zinc-100 text-zinc-600";
  const key = nameOrSlug.toLowerCase().replace(/\s+/g, "");
  if (MAP[key]) return MAP[key];
  // Deterministic color from the string for custom websites.
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
