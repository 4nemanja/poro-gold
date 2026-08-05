import { ArrowUpRight, ChevronRight, Clock } from 'lucide-react';
import { Card } from '../../../components/ui';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendLabel?: string;
  isPositive?: boolean;
  actionText?: string;
  onAction?: () => void;
}

export const StatsCard = ({
  title,
  value,
  trend,
  trendLabel,
  isPositive = true,
  actionText,
  onAction,
}: StatsCardProps) => (
  <Card className="p-5">
    <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
    <div className="text-2xl font-semibold text-gray-900">{value}</div>
    {trend && (
      <div className={`text-sm mt-2 flex items-center ${isPositive ? 'text-emerald-600' : 'text-gray-500'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <Clock className="w-4 h-4 mr-1" />}
        {trend} {trendLabel}
      </div>
    )}
    {actionText && (
      <button
        type="button"
        className="text-sm text-blue-600 mt-2 flex items-center hover:underline"
        onClick={onAction}
      >
        {actionText} <ChevronRight className="w-4 h-4 ml-1" />
      </button>
    )}
  </Card>
);
