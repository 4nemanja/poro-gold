import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Search } from 'lucide-react';
import type { Order, SKU, User } from '../types';
import { Badge, Card, Button, Input, Select } from '../components/ui';
import {
  getOrderBuyerLabel,
  getOrderBuyerReferenceLabel,
  getOrderCategoryLabel,
  getOrderDisplayDate,
  getOrderProductLabel,
} from '../shared/utils/orderDisplay';
import {
  mapOrderToExportRow,
  normalizeOrderCalendarDate,
} from '../portals/admin/types/order-export';
import { exportOrdersToExcel } from '../portals/admin/reporting/exportOrdersToExcel';
import { useI18n } from '../i18n/I18nProvider';
import { getOrderStatusLabel } from '../i18n/statusLabels';

interface OrdersViewProps {
  state: {
    orders: Order[];
    users: User[];
    skus: SKU[];
    isLoadingOrders: boolean;
    ordersError: string | null;
  };
  navigate: (view: string, orderId?: string) => void;
  refreshOrders: () => Promise<void>;
}

export const OrdersView = ({ state, navigate, refreshOrders }: OrdersViewProps) => {
  const { t, language, format } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportInProgressRef = useRef(false);

  const { orders, users, skus } = state;

  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const skusById = useMemo(
    () => new Map(skus.map((sku) => [sku.id, sku])),
    [skus],
  );

  const hasInvalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const hasActiveFilters = Boolean(searchTerm || statusFilter !== 'all' || dateFrom || dateTo);

  const filteredOrders = useMemo(() => {
    if (hasInvalidDateRange) return [];

    const query = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      if (!order?.id) return false;

      const seller = usersById.get(order.sellerId);
      const supplier = usersById.get(order.supplierId);
      const sku = order.skuId ? skusById.get(order.skuId) : undefined;
      const catalogProduct = sku ? `${sku.product} - ${sku.package} (${sku.amount})` : undefined;
      const matchesSearch = !query || [
        order.id,
        order.orderNumber,
        order.platformName,
        sku?.platformName,
        getOrderProductLabel(order, catalogProduct),
        getOrderBuyerLabel(order),
        getOrderBuyerReferenceLabel(order),
        seller?.name,
        supplier?.name,
        sku?.supplierName,
      ].some((value) => value?.toLowerCase().includes(query) ?? false);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const businessDate = normalizeOrderCalendarDate(getOrderDisplayDate(order));
      const matchesDateFrom = !dateFrom || (businessDate !== '' && businessDate >= dateFrom);
      const matchesDateTo = !dateTo || (businessDate !== '' && businessDate <= dateTo);

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [dateFrom, dateTo, hasInvalidDateRange, orders, searchTerm, skusById, statusFilter, usersById]);

  const exportRows = useMemo(
    () => filteredOrders.map((order) => {
      const seller = usersById.get(order.sellerId);
      const supplier = usersById.get(order.supplierId);
      const sku = order.skuId ? skusById.get(order.skuId) : undefined;
      const catalogProduct = sku ? `${sku.product} - ${sku.package} (${sku.amount})` : undefined;

      return mapOrderToExportRow(order, {
        sellerName: seller?.name,
        supplierName: supplier?.name || sku?.supplierName,
        websiteFallback: sku?.platformName,
        catalogProductFallback: catalogProduct,
      });
    }),
    [filteredOrders, skusById, usersById],
  );

  const filteredKpis = useMemo(() => {
    const storedAmount = (value: number | undefined): number =>
      typeof value === 'number' && Number.isFinite(value) ? value : 0;

    return filteredOrders.reduce((summary, order) => ({
      orders: summary.orders + 1,
      inProgress: summary.inProgress + (order.status === 'in_progress' ? 1 : 0),
      completed: summary.completed + (order.status === 'completed' ? 1 : 0),
      revenue: summary.revenue + storedAmount(order.salePrice),
      supplierSpend: summary.supplierSpend + storedAmount(order.supplierCost),
      profit: summary.profit + storedAmount(order.profit),
    }), {
      orders: 0,
      inProgress: 0,
      completed: 0,
      revenue: 0,
      supplierSpend: 0,
      profit: 0,
    });
  }, [filteredOrders]);

  const kpiValue = (value: string | number): string | number =>
    state.isLoadingOrders || state.ordersError ? '—' : value;
  const kpis = [
    { title: t('navigation.orders'), value: kpiValue(filteredKpis.orders) },
    { title: getOrderStatusLabel('in_progress', language), value: kpiValue(filteredKpis.inProgress) },
    { title: getOrderStatusLabel('completed', language), value: kpiValue(filteredKpis.completed) },
    { title: t('orders.revenue'), value: kpiValue(format.formatLocalizedCurrency(filteredKpis.revenue, 'USD', language)) },
    { title: t('orders.spentOnSuppliers'), value: kpiValue(format.formatLocalizedCurrency(filteredKpis.supplierSpend, 'USD', language)) },
    { title: 'Profit', value: kpiValue(format.formatLocalizedCurrency(filteredKpis.profit, 'USD', language)) },
  ];

  const canExport = !state.isLoadingOrders
    && !state.ordersError
    && !hasInvalidDateRange
    && exportRows.length > 0
    && !isExporting;
  const exportTitle = isExporting
    ? 'Generating the Excel workbook.'
    : state.isLoadingOrders
    ? 'Wait for orders to finish loading.'
    : state.ordersError
      ? 'Resolve the order loading error before exporting.'
    : hasInvalidDateRange
      ? 'Choose a valid date range before exporting.'
      : exportRows.length === 0
        ? 'There are no filtered orders to export.'
        : 'Export the currently filtered orders to Excel.';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setExportError(null);
  };

  const handleExport = async () => {
    if (!canExport || exportInProgressRef.current) return;

    exportInProgressRef.current = true;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportOrdersToExcel({ rows: exportRows, dateFrom, dateTo });
    } catch {
      setExportError('Unable to generate the Excel export. Please try again.');
    } finally {
      exportInProgressRef.current = false;
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('navigation.orders')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('orders.management')}</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 min-[390px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="p-4 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">{kpi.title}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{kpi.value}</dd>
          </Card>
        ))}
      </dl>

      <Card>
        <div className="border-b border-gray-200 bg-gray-50/50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_12rem_10rem_10rem_auto_auto] xl:items-end">
            <div className="space-y-1">
              <label htmlFor="admin-orders-search" className="block text-sm font-medium text-gray-700">{t('orders.searchOrders')}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="admin-orders-search"
                  type="search"
                  placeholder={t('orders.searchPlaceholder')}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <Select
              label={t('orders.status')}
              options={[
                { value: 'all', label: t('orders.allStatuses') },
                { value: 'submitted', label: getOrderStatusLabel('submitted', language) },
                { value: 'in_progress', label: getOrderStatusLabel('in_progress', language) },
                { value: 'completed', label: getOrderStatusLabel('completed', language) },
                { value: 'needs_info', label: getOrderStatusLabel('needs_info', language) },
              ]}
              value={statusFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatusFilter(event.target.value)}
            />
            <Input
              label={t('orders.dateFrom')}
              type="date"
              value={dateFrom}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDateFrom(event.target.value)}
            />
            <Input
              label={t('orders.dateTo')}
              type="date"
              value={dateTo}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDateTo(event.target.value)}
            />
            <Button
              variant="secondary"
              className="w-full disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
            >
              {t('orders.clearFilters')}
            </Button>
            <span className="w-full xl:w-auto" title={exportTitle}>
              <Button
                className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canExport}
                onClick={() => void handleExport()}
                aria-label={`${t('orders.exportExcel')}. ${exportTitle}`}
              >
                {isExporting ? t('orders.exporting') : t('orders.exportExcel')}
              </Button>
            </span>
          </div>
          {hasInvalidDateRange && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {t('orders.invalidDateRange')}
            </p>
          )}
          {exportError && (
            <p role="alert" className="mt-3 text-sm text-red-700">{exportError}</p>
          )}
        </div>

        {!state.isLoadingOrders && !state.ordersError && orders.length > 0 && (
          <div className="border-b border-gray-200 px-4 py-3 text-sm text-gray-500">
            {t('orders.showing')} <span className="font-medium text-gray-900">{filteredOrders.length}</span> {t('orders.of')} {orders.length} {t('navigation.orders').toLowerCase()}
          </div>
        )}

        <div className="overflow-x-auto">
          {state.isLoadingOrders && <div className="p-8 text-center text-sm text-gray-500">{t('orders.loadingOrders')}</div>}
          {!state.isLoadingOrders && state.ordersError && (
            <div className="p-8 text-center">
              <p role="alert" className="text-sm text-red-700">{state.ordersError}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refreshOrders()}>{t('common.retry')}</Button>
            </div>
          )}
          {!state.isLoadingOrders && !state.ordersError && orders.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">{t('orders.noOrdersYet')}</div>
          )}
          {!state.isLoadingOrders && !state.ordersError && orders.length > 0 && filteredOrders.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">{t('orders.noOrdersMatch')}</div>
          )}
          {!state.isLoadingOrders && !state.ordersError && filteredOrders.length > 0 && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[t('orders.website'), t('orders.product'), t('orders.buyer'), t('orders.buyerReference'), t('orders.seller'), t('orders.supplier'), t('orders.status'), t('orders.value'), t('orders.created'), t('orders.viewDetails')].map((heading) => (
                    <th key={heading} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const sku = order.skuId ? skusById.get(order.skuId) : undefined;
                  const seller = usersById.get(order.sellerId);
                  const supplier = usersById.get(order.supplierId);
                  const catalogProduct = sku ? `${sku.product} - ${sku.package} (${sku.amount})` : undefined;
                  const packageLabel = getOrderProductLabel(order, catalogProduct);
                  const platformLabel = order.platformName || sku?.platformName || t('orders.notAvailable');
                  const categoryLabel = getOrderCategoryLabel(order, sku?.category);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{platformLabel}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-gray-900">{packageLabel}</div>
                        <div className="text-xs text-gray-500">{categoryLabel}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getOrderBuyerLabel(order)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getOrderBuyerReferenceLabel(order)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller?.name || order.sellerId || t('orders.unknown')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier?.name || sku?.supplierName || t('orders.unassigned')}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><Badge status={order.status} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{format.formatLocalizedCurrency(order.value || 0, 'USD', language)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format.formatLocalizedDate(getOrderDisplayDate(order), language)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="secondary" size="sm" onClick={() => navigate('order_details', order.databaseId || order.id)}>{t('orders.viewDetails')}</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};
