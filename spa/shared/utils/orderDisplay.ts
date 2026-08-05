import type { OrderEntryMode } from '../types/supabase-orders';

export interface MixedOrderDisplay {
  orderEntryMode?: OrderEntryMode;
  manualProductName?: string;
  buyerName?: string;
  buyerReference?: string;
  orderDate?: string;
  productName?: string;
  packageName?: string;
  product?: string;
  categoryName?: string;
  customer?: string;
  createdAt: string;
}

export const isManualMarketplaceOrder = (order: MixedOrderDisplay) =>
  order.orderEntryMode === 'manual_marketplace';

export const getOrderProductLabel = (order: MixedOrderDisplay, catalogFallback?: string) => {
  if (isManualMarketplaceOrder(order)) {
    return order.manualProductName || order.productName || 'Product not provided';
  }
  return catalogFallback
    || [order.productName, order.packageName].filter(Boolean).join(' - ')
    || order.product
    || 'Product not available';
};

export const getOrderCategoryLabel = (order: MixedOrderDisplay, catalogFallback?: string) =>
  isManualMarketplaceOrder(order) ? 'Manual order' : order.categoryName || catalogFallback || 'Category not available';

export const getOrderBuyerLabel = (order: MixedOrderDisplay) =>
  isManualMarketplaceOrder(order) ? order.buyerName || 'Not provided' : order.customer || 'Not provided';

export const getOrderBuyerReferenceLabel = (order: MixedOrderDisplay) =>
  order.buyerReference?.trim() || 'Not provided';

export const supportsBuyerReference = (platformCode?: string | null) =>
  platformCode === 'gameboost' || platformCode === 'igv' || platformCode === 'playerok';

export const getOrderDisplayDate = (order: MixedOrderDisplay) =>
  isManualMarketplaceOrder(order) && order.orderDate ? order.orderDate : order.createdAt;
