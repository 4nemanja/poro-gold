// Calendar-month weeks, the way the business talks about them: "week 1 of August"
// means the 1st to the 7th, not an ISO Mon–Sun week that straddles two months.
//
//   Week 1 = 1st–7th    Week 2 = 8th–14th   Week 3 = 15th–21st
//   Week 4 = 22nd–28th  Week 5 = 29th–end (2–3 days, marked `partial`)
//
// Every month therefore has 4 full weeks plus a short tail, which keeps
// week-over-week comparisons inside a month like-for-like.

export type WeekRange = {
  index: number; // 1-based
  monthKey: string; // "2026-08"
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  days: number; // 1..7
  partial: boolean; // fewer than 7 days (the month ran out)
  label: string; // "Week 4"
  rangeLabel: string; // "Aug 22–28"
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Every week of a month, in order. Always at least 4 entries. */
export function weeksInMonth(monthKey: string): WeekRange[] {
  const total = daysInMonth(monthKey);
  const out: WeekRange[] = [];
  for (let start = 1; start <= total; start += 7) {
    const end = Math.min(start + 6, total);
    const index = out.length + 1;
    const days = end - start + 1;
    out.push({
      index,
      monthKey,
      from: `${monthKey}-${pad(start)}`,
      to: `${monthKey}-${pad(end)}`,
      days,
      partial: days < 7,
      label: `Week ${index}`,
      rangeLabel: `${MONTH_SHORT[Number(monthKey.slice(5, 7)) - 1]} ${start}–${end}`,
    });
  }
  return out;
}

/** The week a given date falls in, or null if the month has no such week. */
export function weekOf(iso: string): WeekRange | null {
  const day = Number(iso.slice(8, 10));
  if (!day) return null;
  return weeksInMonth(monthKeyOf(iso)).find((w) => iso >= w.from && iso <= w.to) ?? null;
}

/** Month keys from `from` to `to` inclusive, newest first. */
export function monthsBetween(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  let [y, m] = [Number(fromISO.slice(0, 4)), Number(fromISO.slice(5, 7))];
  const endKey = monthKeyOf(toISO);
  for (let guard = 0; guard < 600; guard++) {
    const key = `${y}-${pad(m)}`;
    out.push(key);
    if (key >= endKey) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out.reverse();
}

/** Every ISO date from `from` to `to` inclusive. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function shiftDays(iso: string, delta: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + delta * 86400000).toISOString().slice(0, 10);
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayOf(iso: string): string {
  return WEEKDAY[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

/** "Aug 19" — short, unambiguous, no year noise inside a single month. */
export function shortDate(iso: string): string {
  return `${MONTH_SHORT[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
}
