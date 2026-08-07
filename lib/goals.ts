// Monthly profit goals, keyed by "YYYY-MM". Edit this map to set a month's
// target — the Daily Tracker turns it into a per-day profit target and tracks
// pace against it. When a month has no goal here, the tracker falls back to the
// previous month's daily average.
export const MONTHLY_PROFIT_GOALS: Record<string, number> = {
  "2026-08": 1200,
};

export function monthlyProfitGoal(monthKey: string): number | null {
  return MONTHLY_PROFIT_GOALS[monthKey] ?? null;
}
