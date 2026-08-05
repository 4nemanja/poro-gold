import { useMemo, useState, type ChangeEvent } from 'react';
import { Search } from 'lucide-react';
import { Button, Card, Select } from '../../../components/ui';
import type { Order, Page, SellerOrderStatus } from '../types';
import { Pill, type PillVariant } from '../components/SharedUI';
import { getOrderBuyerLabel, getOrderBuyerReferenceLabel, getOrderDisplayDate, getOrderProductLabel } from '../../../shared/utils/orderDisplay';
import { useI18n } from '../../../i18n/I18nProvider';
import { getOrderStatusLabel } from '../../../i18n/statusLabels';

type StatusFilter =
  | 'all'
  | 'submitted'
  | 'pending'
  | 'in_progress'
  | 'needs_info'
  | 'completed'
  | 'failed'
  | 'cancelled';

const getStatusVariant = (status: Order['status']): PillVariant => {
  if (status === 'completed') return 'green';
  if (status === 'needs_info' || status === 'failed' || status === 'disputed') return 'red';
  if (status === 'in_progress' || status === 'accepted') return 'blue';
  return 'yellow';
};

const matchesStatusFilter = (status: SellerOrderStatus, filter: StatusFilter) => {
  if (filter === 'all') return true;
  if (filter === 'pending') return status === 'submitted' || status === 'accepted';
  if (filter === 'needs_info') return status === 'needs_info' || status === 'disputed';
  return status === filter;
};

export const OrdersPage = ({
  orders,
  onNavigate,
}: {
  orders: Order[];
  onNavigate: (page: Page, id?: string) => void;
}) => {
  const { t, language, format } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          order.id,
          order.orderNumber,
          order.platformName || order.platform,
          getOrderProductLabel(order),
          getOrderBuyerLabel(order),
          getOrderBuyerReferenceLabel(order),
        ]
          .some((value) => value?.toLowerCase().includes(normalizedSearch) ?? false);

      return matchesSearch && matchesStatusFilter(order.status, statusFilter);
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('navigation.myOrders')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('orders.management')}</p>
        </div>
        <Button type="button" onClick={() => onNavigate('create-order')}>
          {t('orders.createOrder')}
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('orders.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatusFilter(event.target.value as StatusFilter)}
            options={[
              { value: 'all', label: t('orders.allStatuses') },
              { value: 'submitted', label: getOrderStatusLabel('submitted', language) },
              { value: 'pending', label: getOrderStatusLabel('submitted', language) },
              { value: 'in_progress', label: getOrderStatusLabel('in_progress', language) },
              { value: 'needs_info', label: getOrderStatusLabel('needs_info', language) },
              { value: 'completed', label: getOrderStatusLabel('completed', language) },
              { value: 'failed', label: getOrderStatusLabel('failed', language) },
              { value: 'cancelled', label: getOrderStatusLabel('cancelled', language) },
            ]}
          />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">{t('navigation.orders')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.platform')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.skuProduct')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.buyer')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.buyerReference')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.status')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.salePrice')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.created')}</th>
                <th className="px-5 py-3 font-medium text-right">{t('common.view')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{order.orderNumber || order.id}</td>
                  <td className="px-5 py-4 text-gray-600">{order.platformName || order.platform}</td>
                  <td className="px-5 py-4 text-gray-900">{getOrderProductLabel(order)}</td>
                  <td className="px-5 py-4 text-gray-600">{getOrderBuyerLabel(order)}</td>
                  <td className="px-5 py-4 text-gray-600">{getOrderBuyerReferenceLabel(order)}</td>
                  <td className="px-5 py-4">
                    <Pill variant={getStatusVariant(order.status)}>{getOrderStatusLabel(order.status, language)}</Pill>
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {format.formatLocalizedCurrency(order.salePrice ?? order.price, 'USD', language)}
                  </td>
                  <td className="px-5 py-4 text-gray-500">{format.formatLocalizedDate(getOrderDisplayDate(order), language)}</td>
                  <td className="px-5 py-4 text-right">
                    <Button type="button" variant="secondary" size="sm" onClick={() => onNavigate('order-details', order.databaseId || order.id)}>
                      {t('common.view')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">{orders.length === 0 ? t('orders.noOrdersYet') : t('common.noResults')}</div>
          )}
        </div>
      </Card>
    </div>
  );
};
