import { supabase } from '../../../shared/supabase/client';
import type { Order, OrderStatus, RefundOrderInput, ReverseOrderRefundInput, UpdateOrderRefundDetailsInput } from '../../../types';
import { mapAdminOrderRow } from '../../../shared/services/orderMapper';
import { normalizeOrderServiceError } from '../../../shared/services/orderServiceError';
import type { SupabaseOrderHistoryRow, SupabaseOrderRow } from '../../../shared/types/supabase-orders';

export interface DeletedOrder {
  id: string;
  orderNumber: string;
}

interface DeleteOrderRpcRow {
  deleted_order_id: string;
  deleted_order_number: string;
}

export const adminOrderService = {
  async getAdminOrders(): Promise<Order[]> {
    const [ordersResult, historyResult] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('order_history').select('order_id, status, note, changed_by, created_at').order('created_at'),
    ]);
    if (ordersResult.error) throw normalizeOrderServiceError(ordersResult.error, 'Unable to load orders.');
    if (historyResult.error) throw normalizeOrderServiceError(historyResult.error, 'Unable to load order history.');
    const rows = ordersResult.data as SupabaseOrderRow[];
    const history = historyResult.data as SupabaseOrderHistoryRow[];
    return rows.map((row) => mapAdminOrderRow(row, history));
  },

  async getAdminOrderById(databaseId: string): Promise<Order> {
    const [orderResult, historyResult] = await Promise.all([
      supabase.from('orders').select('*').eq('id', databaseId).maybeSingle(),
      supabase.from('order_history').select('order_id, status, note, changed_by, created_at').eq('order_id', databaseId).order('created_at'),
    ]);
    if (orderResult.error) throw normalizeOrderServiceError(orderResult.error, 'Unable to load the order.');
    if (!orderResult.data) throw normalizeOrderServiceError({ code: 'P0002', message: 'Order not found.' }, 'Order not found.');
    if (historyResult.error) throw normalizeOrderServiceError(historyResult.error, 'Unable to load order history.');
    return mapAdminOrderRow(orderResult.data as SupabaseOrderRow, historyResult.data as SupabaseOrderHistoryRow[]);
  },

  async updateAdminOrderStatus(databaseId: string, status: OrderStatus): Promise<Order> {
    const { error } = await supabase.rpc('admin_update_order_status', {
      p_order_id: databaseId,
      p_status: status,
      p_note: null,
    });
    if (error) throw normalizeOrderServiceError(error, 'Unable to update order status.');
    return this.getAdminOrderById(databaseId);
  },
  async refundOrder(input: RefundOrderInput): Promise<Order> { const { error } = await supabase.rpc('admin_refund_order', { p_order_id: input.orderId, p_refund_type: input.type, p_refund_reason: input.reason, p_refunded_amount: input.amount ?? null }); if (error) throw normalizeOrderServiceError(error, 'Unable to record the refund.'); return this.getAdminOrderById(input.orderId); },
  async updateOrderRefundDetails(input: UpdateOrderRefundDetailsInput): Promise<Order> { const { error } = await supabase.rpc('admin_update_order_refund_details', { p_order_id: input.orderId, p_refund_type: input.type, p_refund_reason: input.reason, p_refunded_amount: input.amount ?? null }); if (error) throw normalizeOrderServiceError(error, 'Unable to update refund details.'); return this.getAdminOrderById(input.orderId); },
  async reverseOrderRefund(input: ReverseOrderRefundInput): Promise<Order> { const { error } = await supabase.rpc('admin_reverse_order_refund', { p_order_id: input.orderId, p_status: input.status }); if (error) throw normalizeOrderServiceError(error, 'Unable to reverse the refund.'); return this.getAdminOrderById(input.orderId); },

  async assignSupplier(databaseId: string, supplierId: string | null): Promise<Order> {
    if (!supplierId) throw normalizeOrderServiceError({ code: '22023', message: 'A supplier is required.' }, 'A supplier is required.');
    const { error } = await supabase.rpc('admin_assign_order_supplier', {
      p_order_id: databaseId,
      p_supplier_id: supplierId,
    });
    if (error) throw normalizeOrderServiceError(error, 'Unable to assign supplier.');
    return this.getAdminOrderById(databaseId);
  },

  async updateInternalNotes(databaseId: string, notes: string): Promise<Order> {
    const { error } = await supabase.rpc('admin_update_order_internal_notes', {
      p_order_id: databaseId,
      p_notes: notes,
    });
    if (error) throw normalizeOrderServiceError(error, 'Unable to update internal notes.');
    return this.getAdminOrderById(databaseId);
  },

  async recordCredentialAccess(databaseId: string): Promise<void> {
    const { error } = await supabase.rpc('admin_record_credential_access', {
      p_order_id: databaseId,
    });
    if (error) throw normalizeOrderServiceError(error, 'Unable to record credential access.');
  },

  async deleteOrder(orderId: string): Promise<DeletedOrder> {
    let databaseOrderId = orderId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);

    if (!isUuid) {
      const { data: order, error: lookupError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderId)
        .maybeSingle();
      if (lookupError) throw normalizeOrderServiceError(lookupError, 'Unable to find the database order.');
      if (!order) throw normalizeOrderServiceError({ code: 'P0002', message: `Order ${orderId} was not found in Supabase.` }, 'Order not found.');
      databaseOrderId = order.id;
    }

    const { data, error } = await supabase.rpc('delete_order_as_owner', {
      p_order_id: databaseOrderId,
    });

    if (error) throw normalizeOrderServiceError(error, 'Unable to permanently delete the order.');

    const row = (data as DeleteOrderRpcRow[] | null)?.[0];
    if (!row) throw new Error('The order deletion returned no result.');

    return { id: row.deleted_order_id, orderNumber: row.deleted_order_number };
  },

  async deleteOrderAsOwner(databaseId: string): Promise<DeletedOrder> {
    return this.deleteOrder(databaseId);
  },
};
