import { useEffect, useRef, useState } from 'react';
import {
  createOrderRealtimeChannel,
  createOrderRealtimeInsertFilter,
  createOrderRefreshCoalescer,
  parseOrderRealtimeSignal,
  removeRealtimeChannel,
  subscribeRealtimeChannel,
  type OrderRealtimeAudience,
  type RealtimeConnectionState,
  type RealtimeSubscriptionHandle,
} from './orderRealtimeSubscription';
import { isRealtimeUuid } from './realtimeSubscription';

export interface UseOrderRealtimeOptions {
  audience: OrderRealtimeAudience;
  currentUserId: string | null | undefined;
  refreshOrders: () => Promise<void>;
}

export function useOrderRealtime({
  audience,
  currentUserId,
  refreshOrders,
}: UseOrderRealtimeOptions): RealtimeConnectionState {
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>('disconnected');
  const refreshOrdersRef = useRef(refreshOrders);

  useEffect(() => {
    refreshOrdersRef.current = refreshOrders;
  }, [refreshOrders]);

  useEffect(() => {
    const filter = createOrderRealtimeInsertFilter(audience, currentUserId);
    if (!filter || !isRealtimeUuid(currentUserId)) {
      setConnectionState('disconnected');
      return;
    }

    const authenticatedUserId = currentUserId;
    let cancelled = false;
    let subscription: RealtimeSubscriptionHandle | null = null;
    let pendingChannelCleanup = false;
    const acceptedSignalIds = new Set<string>();
    const refreshCoalescer = createOrderRefreshCoalescer(
      () => refreshOrdersRef.current(),
    );

    const connect = async () => {
      const channel = await createOrderRealtimeChannel(
        audience,
        authenticatedUserId,
      );
      if (!channel) return;
      if (cancelled) {
        await removeRealtimeChannel(channel);
        return;
      }

      channel.on<Record<string, unknown>>(
        'postgres_changes',
        filter,
        (payload) => {
          if (cancelled) return;
          const signal = parseOrderRealtimeSignal(
            payload.new,
            audience === 'seller' ? authenticatedUserId : undefined,
          );
          if (!signal || acceptedSignalIds.has(signal.id)) return;

          if (acceptedSignalIds.size >= 1000) acceptedSignalIds.clear();
          acceptedSignalIds.add(signal.id);
          refreshCoalescer.requestRefresh();
        },
      );

      if (cancelled) {
        await removeRealtimeChannel(channel);
        return;
      }

      subscription = subscribeRealtimeChannel(channel, (status) => {
        if (cancelled) return;
        setConnectionState(status.connectionState);
        if (status.isReconnect) refreshCoalescer.requestRefresh();
      });

      if (pendingChannelCleanup) void subscription.cleanup();
    };

    setConnectionState('connecting');
    void connect().catch(() => {
      if (!cancelled) setConnectionState('error');
    });

    return () => {
      cancelled = true;
      refreshCoalescer.dispose();
      if (subscription) void subscription.cleanup();
      else pendingChannelCleanup = true;
    };
  }, [audience, currentUserId]);

  return connectionState;
}
