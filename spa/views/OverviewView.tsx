import type { Order, User } from '../types';
import { Badge, Card, Button } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getOrderDisplayDate, getOrderProductLabel } from '../shared/utils/orderDisplay';

interface OverviewViewProps {
  state: {
    orders: Order[];
    users: User[];
    isLoadingOrders: boolean;
    ordersError: string | null;
  };
  navigate: (view: string, orderId?: string) => void;
  refreshOrders: () => Promise<void>;
}

export const OverviewView = ({ state, navigate, refreshOrders }: OverviewViewProps) => {
  const activeOrders = state.orders.filter((o: Order) => ['submitted', 'accepted', 'in_progress'].includes(o.status)).length;
  const completedOrders = state.orders.filter((o: Order) => o.status === 'completed').length;
  const grossVolume = state.orders.reduce((sum: number, o: Order) => sum + o.value, 0);
  const activeSuppliers = state.users.filter((u: User) => u.role === 'Supplier' && u.status === 'Active').length;
  const orderMetricValue = (value: string | number) => state.isLoadingOrders || state.ordersError ? '—' : value;

  const kpis = [
    { title: 'Total Volume', value: orderMetricValue(formatCurrency(grossVolume)) },
    { title: 'Active Orders', value: orderMetricValue(activeOrders) },
    { title: 'Completed (30d)', value: orderMetricValue(completedOrders) },
    { title: 'Active Suppliers', value: activeSuppliers },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Platform performance and current active operations.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">{kpi.title}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{kpi.value}</dd>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Orders</h3>
          <Button variant="secondary" size="sm" onClick={() => navigate('orders')}>View all</Button>
        </div>
        <div className="overflow-x-auto">
          {state.isLoadingOrders && <div className="p-8 text-center text-sm text-gray-500">Loading orders...</div>}
          {!state.isLoadingOrders && state.ordersError && <div className="p-8 text-center"><p role="alert" className="text-sm text-red-700">{state.ordersError}</p><Button variant="secondary" size="sm" className="mt-4" onClick={() => void refreshOrders()}>Retry</Button></div>}
          {!state.isLoadingOrders && !state.ordersError && state.orders.length === 0 && <div className="p-8 text-center text-sm text-gray-500">No orders yet.</div>}
          {!state.isLoadingOrders && !state.ordersError && state.orders.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Website', 'Seller', 'Product', 'Status', 'Value', 'Created', 'View'].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {state.orders.slice(0, 5).map((order: Order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.platformName || 'Not available'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{state.users.find((u: User) => u.id === order.sellerId)?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getOrderProductLabel(order)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><Badge status={order.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(order.value)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(getOrderDisplayDate(order))}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => navigate('order_details', order.databaseId || order.id)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </Card>
    </div>
  );
};
