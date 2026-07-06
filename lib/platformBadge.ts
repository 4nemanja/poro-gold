// Color-code each website so it's clear at a glance which marketplace an order
// came from in mixed lists (Main Dashboard recent orders, suppliers, etc.).
const MAP: Record<string, string> = {
  gameboost: "bg-sky-50 text-sky-700",
  g2g: "bg-violet-50 text-violet-700",
  igv: "bg-teal-50 text-teal-700",
  playerok: "bg-amber-50 text-amber-700",
  kupujemprodajem: "bg-rose-50 text-rose-700",
};

export function platformBadgeClass(nameOrSlug: string | null | undefined): string {
  if (!nameOrSlug) return "bg-zinc-100 text-zinc-600";
  const key = nameOrSlug.toLowerCase().replace(/\s+/g, "");
  return MAP[key] ?? "bg-zinc-100 text-zinc-600";
}
