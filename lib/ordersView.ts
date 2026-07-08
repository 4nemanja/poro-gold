import { getAllOrders, getWorkspaceOrders } from "./data";
import { WORKSPACES } from "./workspaces";
import { statusCategory } from "./orderStatus";
import type { Order } from "./types";

export type ViewParams = { range?: string; day?: string; status?: string };

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function resolvePeriod(sp?: ViewParams, defaultRange = "today") {
  const day = sp?.day;
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) return { from: day, to: day, label: `on ${day}` };
  const range = sp?.range ?? defaultRange;
  const today = todayISO();
  // "all" = everything since the business started (no upper bound).
  if (range === "all") return { from: "0000-01-01", to: "9999-12-31", label: "all time" };
  if (range === "today") return { from: today, to: today, label: "today" };
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 1;
  const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const labels: Record<string, string> = {
    "7d": "over the last 7 days",
    "30d": "over the last 30 days",
    "90d": "over the last 3 months",
  };
  return { from, to: today, label: labels[range] ?? "today" };
}

export function inRange(o: Order, from: string, to: string) {
  return !!o.date && o.date >= from && o.date <= to;
}

export function makeStatusMatch(sp?: ViewParams) {
  const sel = sp?.status ? sp.status.split(",").filter(Boolean) : null;
  return (o: Order) => !sel || sel.includes(statusCategory(o.status));
}

export function addDateFor(sp?: ViewParams) {
  return sp?.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : todayISO();
}

// Loads all orders + per-workspace slices (already July-1-cutoff filtered).
export async function loadOrders() {
  const [all, ...perWs] = await Promise.all([
    getAllOrders(),
    ...WORKSPACES.map((w) => getWorkspaceOrders(w.slug)),
  ]);
  return { all, perWs };
}
