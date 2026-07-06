// Each selling website is a "workspace". GameBoost syncs live from its API;
// G2G is fed by monthly Excel exports; the rest are manual-entry until their
// API/exports are available. "all" is the aggregate overview across every site.

export type Workspace = {
  slug: string;
  name: string;
  short: string;
  source: "api" | "excel" | "manual";
};

export const WORKSPACES: Workspace[] = [
  { slug: "gameboost", name: "GameBoost", short: "GB", source: "api" },
  { slug: "g2g", name: "G2G", short: "G2G", source: "excel" },
  { slug: "igv", name: "iGV", short: "iGV", source: "manual" },
  { slug: "playerok", name: "PlayerOK", short: "POK", source: "manual" },
  { slug: "kupujemprodajem", name: "KupujemProdajem", short: "KP", source: "manual" },
];

export const ALL_SLUG = "all";
export const DEFAULT_ROUTE = `/${ALL_SLUG}`;

export function getWorkspace(slug: string): Workspace | null {
  return WORKSPACES.find((w) => w.slug === slug.toLowerCase()) ?? null;
}

export function isWorkspace(slug: string): boolean {
  return WORKSPACES.some((w) => w.slug === slug.toLowerCase());
}

// Valid top-level route segment: a real workspace or the "all" overview.
export function isValidView(slug: string): boolean {
  return slug === ALL_SLUG || isWorkspace(slug);
}
