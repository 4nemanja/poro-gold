import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  OrderChangeEventDatabaseType,
  OrderChangeEventRow,
  OrderRealtimeEventType,
  OrderRealtimeSignal,
} from '../types/order-realtime';
import {
  createRealtimeChannel,
  createScopedRealtimeChannelName,
  isRealtimeUuid,
} from './realtimeSubscription';

export type OrderRealtimeAudience = 'admin' | 'seller';

export interface OrderRealtimeInsertFilter {
  event: 'INSERT';
  schema: 'public';
  table: 'order_change_events';
  filter?: string;
}

export interface OrderRefreshCoalescer {
  requestRefresh: () => void;
  dispose: () => void;
  isRefreshInFlight: () => boolean;
}

const DATABASE_EVENT_MAP: Record<
  OrderChangeEventDatabaseType,
  OrderRealtimeEventType
> = {
  inserted: 'INSERT',
  updated: 'UPDATE',
  deleted: 'DELETE',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDatabaseEventType = (
  value: unknown,
): value is OrderChangeEventDatabaseType =>
  value === 'inserted' || value === 'updated' || value === 'deleted';

export function createOrderRealtimeChannelName(
  audience: OrderRealtimeAudience,
  currentUserId: string | null | undefined,
): string | null {
  return createScopedRealtimeChannelName(`orders:${audience}`, [currentUserId]);
}

export async function createOrderRealtimeChannel(
  audience: OrderRealtimeAudience,
  currentUserId: string | null | undefined,
): Promise<RealtimeChannel | null> {
  return createRealtimeChannel(
    createOrderRealtimeChannelName(audience, currentUserId),
  );
}

export function createOrderRealtimeInsertFilter(
  audience: OrderRealtimeAudience,
  currentUserId: string | null | undefined,
): OrderRealtimeInsertFilter | null {
  if (!isRealtimeUuid(currentUserId)) return null;

  return {
    event: 'INSERT',
    schema: 'public',
    table: 'order_change_events',
    ...(audience === 'seller'
      ? { filter: `seller_id=eq.${currentUserId.toLowerCase()}` }
      : {}),
  };
}

export function parseOrderRealtimeSignal(
  value: unknown,
  expectedSellerId?: string | null,
): OrderRealtimeSignal | null {
  if (!isRecord(value)) return null;

  const { id, order_id: orderId, seller_id: sellerId, event_type: eventType,
    created_at: occurredAt } = value;
  if (
    !isRealtimeUuid(id)
    || !isRealtimeUuid(orderId)
    || (sellerId !== null && !isRealtimeUuid(sellerId))
    || !isDatabaseEventType(eventType)
    || typeof occurredAt !== 'string'
    || Number.isNaN(Date.parse(occurredAt))
  ) {
    return null;
  }

  if (
    expectedSellerId !== undefined
    && (
      !isRealtimeUuid(expectedSellerId)
      || sellerId === null
      || sellerId.toLowerCase() !== expectedSellerId.toLowerCase()
    )
  ) {
    return null;
  }

  const row: OrderChangeEventRow = {
    id,
    order_id: orderId,
    seller_id: sellerId,
    event_type: eventType,
    created_at: occurredAt,
  };

  return {
    id: row.id,
    eventType: DATABASE_EVENT_MAP[row.event_type],
    orderId: row.order_id,
    sellerId: row.seller_id,
    occurredAt: row.created_at,
  };
}

export function createOrderRefreshCoalescer(
  refresh: () => Promise<void>,
  onError?: (error: unknown) => void,
): OrderRefreshCoalescer {
  let disposed = false;
  let refreshInFlight = false;
  let refreshQueued = false;

  const run = async () => {
    if (disposed) return;
    if (refreshInFlight) {
      refreshQueued = true;
      return;
    }

    refreshInFlight = true;
    try {
      do {
        refreshQueued = false;
        try {
          await refresh();
        } catch (error) {
          onError?.(error);
        }
      } while (!disposed && refreshQueued);
    } finally {
      refreshInFlight = false;
    }
  };

  return {
    requestRefresh: () => {
      void run();
    },
    dispose: () => {
      disposed = true;
      refreshQueued = false;
    },
    isRefreshInFlight: () => refreshInFlight,
  };
}

export {
  removeRealtimeChannel,
  subscribeRealtimeChannel,
  type RealtimeConnectionState,
  type RealtimeSubscriptionHandle,
  type RealtimeStatusUpdate,
} from './realtimeSubscription';
