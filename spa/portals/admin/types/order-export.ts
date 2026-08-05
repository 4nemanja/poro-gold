import type { Order } from '../../../types';
import {
  getOrderBuyerLabel,
  getOrderDisplayDate,
  getOrderProductLabel,
  isManualMarketplaceOrder,
} from '../../../shared/utils/orderDisplay';

export interface AdminOrderExportRow {
  orderNumber: string;
  orderDate: string;
  createdAt: string;
  website: string;
  orderType: 'Catalog' | 'Manual Marketplace';
  seller: string;
  supplier: string;
  product: string;
  buyer: string;
  buyerReference: string;
  status: string;
  salePrice: number;
  supplierCost: number | null;
  sellingFee: number | null;
  withdrawalFee: number | null;
  netRevenue: number | null;
  profit: number | null;
  notes: string;
}

export interface AdminOrderExportContext {
  sellerName?: string;
  supplierName?: string;
  websiteFallback?: string;
  catalogProductFallback?: string;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Keeps database `date` values literal and converts timestamps to the browser's
 * local calendar date. This avoids parsing a date-only value as UTC and moving
 * it to the previous day in western time zones.
 */
export const normalizeOrderCalendarDate = (value?: string): string => {
  if (!value) return '';
  if (DATE_ONLY_PATTERN.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatStatus = (status: Order['status']): string =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const mapOrderToExportRow = (
  order: Order,
  context: AdminOrderExportContext = {},
): AdminOrderExportRow => {
  const isManual = isManualMarketplaceOrder(order);

  return {
    orderNumber: order.orderNumber || '',
    orderDate: normalizeOrderCalendarDate(getOrderDisplayDate(order)),
    createdAt: order.createdAt,
    website: order.platformName || context.websiteFallback || 'Not available',
    orderType: isManual ? 'Manual Marketplace' : 'Catalog',
    seller: context.sellerName || 'Unknown',
    supplier: context.supplierName || 'Unassigned',
    product: getOrderProductLabel(order, context.catalogProductFallback),
    buyer: getOrderBuyerLabel(order),
    buyerReference: order.buyerReference?.trim() || 'Not provided',
    status: formatStatus(order.status),
    salePrice: order.salePrice ?? order.value,
    supplierCost: isManual ? null : order.supplierCost ?? order.cost,
    sellingFee: isManual ? null : order.sellingFeeAmount ?? null,
    withdrawalFee: isManual ? null : order.withdrawalFeeAmount ?? null,
    netRevenue: isManual ? null : order.netRevenue ?? null,
    profit: isManual ? null : order.profit ?? null,
    notes: order.sellerNotes?.trim() || '',
  };
};
