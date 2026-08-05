import { useEffect, useRef, useState } from 'react';
import { sellerService } from '../services/sellerService';
import type { CreateManualMarketplaceOrderInput } from '../../../shared/types/supabase-orders';
import { useOrderRealtime } from '../../../shared/realtime/useOrderRealtime';
import type { CreateOrderInput, Order } from '../types';

export function useSellerState(currentUserId: string | null | undefined) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const didLoadOrders = useRef(false);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      setOrders(await sellerService.getCurrentSellerOrdersFromSupabase());
    } catch {
      setOrders([]);
      setOrdersError('Unable to load your orders from Supabase. Please try again.');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const refreshOrdersFromRealtime = async () => {
    try {
      const nextOrders = await sellerService.getCurrentSellerOrdersFromSupabase();
      setOrders(nextOrders);
      setOrdersError(null);
    } catch {
      // Realtime recovery is best-effort; existing data and manual refresh stay usable.
    }
  };

  useOrderRealtime({
    audience: 'seller',
    currentUserId,
    refreshOrders: refreshOrdersFromRealtime,
  });

  useEffect(() => {
    if (didLoadOrders.current) return;
    didLoadOrders.current = true;
    void fetchOrders();
  }, []);

  const addOrder = async (orderData: CreateOrderInput) => {
    const createdOrder = await sellerService.createCurrentSellerOrderInSupabase(orderData);
    await fetchOrders();
    return createdOrder;
  };

  const addManualMarketplaceOrder = async (orderData: CreateManualMarketplaceOrderInput) => {
    const createdOrder = await sellerService.createManualMarketplaceOrder(orderData);
    await fetchOrders();
    return createdOrder;
  };

  return { orders, isLoadingOrders, ordersError, addOrder, addManualMarketplaceOrder, refreshOrders: fetchOrders };
}
