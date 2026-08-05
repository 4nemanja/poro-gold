import { Button, Card } from '../../../components/ui';
import type { Order, Page } from '../types';
import { Pill, type PillVariant } from '../components/SharedUI';
import { StatsCard } from '../components/StatsCard';
import { getOrderBuyerLabel, getOrderBuyerReferenceLabel, getOrderDisplayDate, getOrderProductLabel } from '../../../shared/utils/orderDisplay';

const isSameDay = (date: Date, now: Date) =>
  date.getFullYear() === now.getFullYear() &&
  date.getMonth() === now.getMonth() &&
  date.getDate() === now.getDate();

const getStatusVariant = (status: Order['status']): PillVariant => {
  if (status === 'completed') return 'green';
  if (status === 'needs_info' || status === 'failed' || status === 'disputed') return 'red';
  if (status === 'in_progress' || status === 'accepted') return 'blue';
  return 'yellow';
};

const formatStatus = (status: Order['status']) =>
  status.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value: string) => new Date(value).toLocaleDateString();

const getAverageCompletionTime = (orders: Order[]) => {
  const completionDurations = orders
    .filter((order) => order.status === 'completed')
    .map((order) => {
      const completedEvent = order.history
        ?.slice()
        .reverse()
        .find((event) => event.status === 'completed');
      const completedAt = completedEvent?.timestamp || order.updatedAt;
      return new Date(completedAt).getTime() - new Date(order.createdAt).getTime();
    })
    .filter((duration) => Number.isFinite(duration) && duration >= 0);

  if (completionDurations.length === 0) return 'N/A';

  const averageHours =
    completionDurations.reduce((total, duration) => total + duration, 0) /
    completionDurations.length /
    (1000 * 60 * 60);

  if (averageHours < 1) return `${Math.round(averageHours * 60)}m`;
  if (averageHours < 24) return `${averageHours.toFixed(1)}h`;
  return `${(averageHours / 24).toFixed(1)}d`;
};

export const DashboardPage = ({
  orders,
  onNavigate,
}: {
  orders: Order[];
  onNavigate: (page: Page, id?: string) => void;
}) => {
  const now = new Date();
  const ordersToday = orders.filter((order) => isSameDay(new Date(getOrderDisplayDate(order)), now)).length;
  const inProgressOrders = orders.filter((order) => order.status === 'in_progress' || order.status === 'accepted').length;
  const completedOrders = orders.filter((order) => order.status === 'completed').length;
  const recentOrders = orders
    .slice()
    .sort((a, b) => new Date(getOrderDisplayDate(b)).getTime() - new Date(getOrderDisplayDate(a)).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Orders Today" value={ordersToday} />
        <StatsCard title="In Progress" value={inProgressOrders} />
        <StatsCard title="Completed" value={completedOrders} />
        <StatsCard title="Average Completion Time" value={getAverageCompletionTime(orders)} />
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <button
            type="button"
            onClick={() => onNavigate('my-orders')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Order ID</th>
                <th className="px-5 py-3 font-medium">Platform</th>
                <th className="px-5 py-3 font-medium">Product / SKU</th>
                <th className="px-5 py-3 font-medium">Buyer / Customer</th>
                <th className="px-5 py-3 font-medium">Buyer Name / Order ID</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{order.orderNumber || order.id}</td>
                  <td className="px-5 py-4 text-gray-600">{order.platformName || order.platform}</td>
                  <td className="px-5 py-4 text-gray-900">{getOrderProductLabel(order)}</td>
                  <td className="px-5 py-4 text-gray-600">{getOrderBuyerLabel(order)}</td>
                  <td className="px-5 py-4 text-gray-600">{getOrderBuyerReferenceLabel(order)}</td>
                  <td className="px-5 py-4">
                    <Pill variant={getStatusVariant(order.status)}>{formatStatus(order.status)}</Pill>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(getOrderDisplayDate(order))}</td>
                  <td className="px-5 py-4 text-right">
                    <Button type="button" variant="secondary" size="sm" onClick={() => onNavigate('order-details', order.databaseId || order.id)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentOrders.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">No orders yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
};
