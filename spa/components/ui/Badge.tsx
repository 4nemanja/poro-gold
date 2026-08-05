import type { OrderStatus } from '../../types';
import { STATUS_COLORS } from '../../constants/status-colors';
import { useI18n } from '../../i18n/I18nProvider';
import { getOrderStatusLabel } from '../../i18n/statusLabels';

export const Badge = ({ status }: { status: OrderStatus }) => {
  const { language } = useI18n();
  const config = STATUS_COLORS[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} border-current border-opacity-20 capitalize`}>
      {config.icon}
      {getOrderStatusLabel(status, language)}
    </span>
  );
};
