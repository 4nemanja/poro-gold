import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { colors } from "@/lib/theme";
import { formatCurrency, formatNum } from "@/lib/format";

export function KPICard({
  title,
  value,
  trend,
  isCurrency = false,
  invertTrend = false,
}: {
  title: string;
  value: number;
  trend?: number;
  isCurrency?: boolean;
  invertTrend?: boolean;
}) {
  const hasTrend = typeof trend === "number";
  const isPositive = (trend ?? 0) > 0;
  const goodColor = invertTrend ? colors.danger : colors.success;
  const badColor = invertTrend ? colors.success : colors.danger;
  const trendColor = isPositive ? goodColor : badColor;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={`${colors.card} ${colors.border} border rounded-xl p-5 flex flex-col justify-between shadow-sm`}
    >
      <span
        className={`text-xs uppercase tracking-wider font-semibold ${colors.textMuted}`}
      >
        {title}
      </span>
      <div className="mt-3 flex items-end justify-between">
        <span
          className={`text-2xl font-semibold tracking-tight ${colors.textMain}`}
        >
          {isCurrency ? formatCurrency(value) : formatNum(value)}
        </span>
        {hasTrend && (
          <div className={`flex items-center text-xs font-medium ${trendColor}`}>
            <Icon size={14} className="mr-0.5" />
            {Math.abs(trend as number)}%
          </div>
        )}
      </div>
    </div>
  );
}
