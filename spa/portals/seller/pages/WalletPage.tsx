import { Card } from '../../../components/ui';
import type { Order } from '../types';
import { getOrderDisplayDate, getOrderProductLabel } from '../../../shared/utils/orderDisplay';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const isSameDay = (date: Date, now: Date) =>
  date.getFullYear() === now.getFullYear() &&
  date.getMonth() === now.getMonth() &&
  date.getDate() === now.getDate();

const isSameMonth = (date: Date, now: Date) =>
  date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();

const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
  <Card className="p-5">
    <div className="text-sm font-medium text-gray-500">{label}</div>
    <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
  </Card>
);

export const WalletPage = ({ orders }: { orders: Order[] }) => {
  const now = new Date();
  const completedOrders = orders.filter((order) => order.status === 'completed');
  const pendingOrders = orders.filter((order) => ['submitted', 'accepted', 'in_progress'].includes(order.status));
  const actionRequiredOrders = orders.filter((order) => order.status === 'needs_info');
  const totalRevenue = orders.reduce((sum, order) => sum + (order.salePrice ?? order.price), 0);
  const revenueToday = orders.reduce((sum, order) => {
    const createdAt = new Date(getOrderDisplayDate(order));
    return isSameDay(createdAt, now) ? sum + (order.salePrice ?? order.price) : sum;
  }, 0);
  const revenueThisMonth = orders.reduce((sum, order) => {
    const createdAt = new Date(getOrderDisplayDate(order));
    return isSameMonth(createdAt, now) ? sum + (order.salePrice ?? order.price) : sum;
  }, 0);
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const recentCompletedOrders = completedOrders
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Sales" value={orders.length} />
        <MetricCard label="Completed Orders" value={completedOrders.length} />
        <MetricCard label="Pending Orders" value={pendingOrders.length} />
        <MetricCard label="Action Required" value={actionRequiredOrders.length} />
        <MetricCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
        <MetricCard label="Revenue Today" value={formatCurrency(revenueToday)} />
        <MetricCard label="Revenue This Month" value={formatCurrency(revenueThisMonth)} />
        <MetricCard label="Average Order Value" value={formatCurrency(averageOrderValue)} />
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Completed Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
              <tr>
                <th className="px-5 py-4 font-medium">Order ID</th>
                <th className="px-5 py-4 font-medium">Product</th>
                <th className="px-5 py-4 font-medium">Completed</th>
                <th className="px-5 py-4 font-medium text-right">Sale Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentCompletedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4 font-medium text-gray-900">{order.orderNumber || order.id}</td>
                  <td className="px-5 py-4 text-gray-600">{getOrderProductLabel(order)}</td>
                  <td className="px-5 py-4 text-gray-500">{new Date(order.updatedAt).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(order.salePrice ?? order.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentCompletedOrders.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">No completed orders yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
};
