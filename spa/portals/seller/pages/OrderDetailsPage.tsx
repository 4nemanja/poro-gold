import { useState } from 'react';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button, Card } from '../../../components/ui';
import type { Order, SellerOrderStatus } from '../types';
import { Pill, type PillVariant } from '../components/SharedUI';
import { getOrderBuyerLabel, getOrderDisplayDate, getOrderProductLabel, isManualMarketplaceOrder } from '../../../shared/utils/orderDisplay';
import { OrderChat } from '../../../features/order-chat/components/OrderChat';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatDate = (value?: string) => {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
};

const formatStatus = (status: SellerOrderStatus) =>
  status.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStatusVariant = (status: SellerOrderStatus): PillVariant => {
  if (status === 'completed') return 'green';
  if (status === 'needs_info' || status === 'failed' || status === 'disputed') return 'red';
  if (status === 'accepted' || status === 'in_progress') return 'blue';
  return 'yellow';
};

const DetailItem = ({ label, value }: { label: string; value?: string | number }) => (
  <div>
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 break-words text-sm text-gray-900">{value || 'Not provided'}</dd>
  </div>
);

export const OrderDetailsPage = ({
  order,
  onBack,
}: {
  order?: Order;
  onBack: () => void;
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  if (!order) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center font-medium transition-colors"
        >
          <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Orders
        </button>
        <Card className="p-8 text-center text-gray-500">Order not found.</Card>
      </div>
    );
  }

  const password = order.password || '';
  const isManualOrder = isManualMarketplaceOrder(order);
  const maskedPassword = password ? '*'.repeat(Math.max(password.length, 8)) : 'Not provided';
  const timeline = order.history || [{ status: order.status, timestamp: order.createdAt }];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-gray-900 flex items-center font-medium transition-colors"
      >
        <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Orders
      </button>

      <Card>
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{order.orderNumber || order.id}</h2>
            <p className="text-sm text-gray-500 mt-1">Created {formatDate(order.createdAt)}</p>
          </div>
          <Pill variant={getStatusVariant(order.status)}>{formatStatus(order.status)}</Pill>
        </div>

        <dl className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailItem label="Platform" value={order.platformName || order.platform} />
          {isManualOrder && <DetailItem label="Order Type" value="Manual Marketplace" />}
          {!isManualOrder && order.categoryName && <DetailItem label="Category" value={order.categoryName} />}
          <DetailItem label={isManualOrder ? 'Product Name' : 'SKU / Product'} value={getOrderProductLabel(order)} />
          {isManualOrder && <DetailItem label="Buyer Name" value={getOrderBuyerLabel(order)} />}
          {!isManualOrder && order.deliveryMethod && <DetailItem label="Delivery Method" value={order.deliveryMethod} />}
          {!isManualOrder && order.customer && <DetailItem label="Customer Username / Gamertag" value={order.customer} />}
          {(!isManualOrder || order.loginEmail || order.email) && <DetailItem label={isManualOrder ? 'Account Login' : 'Login / Email'} value={order.loginEmail || order.email} />}
          <DetailItem label="Sale Price" value={formatCurrency(order.salePrice ?? order.price)} />
          {isManualOrder && <DetailItem label="Order Date" value={formatDate(getOrderDisplayDate(order))} />}
          <DetailItem label="Created At" value={formatDate(order.createdAt)} />
          <DetailItem label="Updated At" value={formatDate(order.updatedAt)} />
        </dl>
      </Card>

      {order.databaseId ? (
        <OrderChat orderId={order.databaseId} />
      ) : (
        <Card className="p-5 text-sm text-red-700">Order chat requires a database-backed order.</Card>
      )}

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
        </div>
        <div className="p-5 space-y-5">
          {(!isManualOrder || password) && <div>
            <dt className="text-sm font-medium text-gray-500">Password</dt>
            <dd className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-900">
                {isPasswordVisible ? password || 'Not provided' : maskedPassword}
              </code>
              {password && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsPasswordVisible((visible) => !visible)}>
                  {isPasswordVisible ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {isPasswordVisible ? 'Hide' : 'Reveal'}
                </Button>
              )}
            </dd>
          </div>}
          {!isManualOrder && order.twoFactorNotes && <DetailItem label="2FA Notes" value={order.twoFactorNotes} />}
          {(!isManualOrder || order.sellerNotes) && <DetailItem label={isManualOrder ? 'Notes' : 'Seller Notes'} value={order.sellerNotes} />}
          {!order.loginEmail && !order.email && !password && <p className="text-sm text-gray-500">No account credentials provided.</p>}
        </div>
      </Card>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Status Timeline</h3>
        </div>
        <div className="p-5">
          <ol className="space-y-4">
            {timeline.map((event, index) => (
              <li key={`${event.status}-${event.timestamp}-${index}`} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-gray-900" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{formatStatus(event.status)}</div>
                  <div className="text-sm text-gray-500">{formatDate(event.timestamp)}</div>
                  {event.note && <div className="text-sm text-gray-600 mt-1">{event.note}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Card>
    </div>
  );
};
