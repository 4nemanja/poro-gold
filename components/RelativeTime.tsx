"use client";

import { useEffect, useState } from "react";
import { timeAgo, formatDateTime } from "@/lib/format";

// Live "30m ago" style timestamp that ticks every 30s. Hover shows the exact
// date/time. `iso` may be a full datetime (manual orders) or a date-only string.
export function RelativeTime({ iso, className = "" }: { iso: string | null | undefined; className?: string }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!iso) return <span className={className}>—</span>;
  return (
    <span className={className} title={formatDateTime(iso)} suppressHydrationWarning>
      {timeAgo(iso, nowMs)}
    </span>
  );
}
