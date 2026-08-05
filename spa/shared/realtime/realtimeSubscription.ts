import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
  type RealtimeRemoveChannelResponse,
} from '@supabase/supabase-js';
import { supabase } from '../supabase/client';

export type RealtimeConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface RealtimeStatusUpdate {
  status: REALTIME_SUBSCRIBE_STATES | null;
  connectionState: RealtimeConnectionState;
  error: Error | null;
  isReconnect: boolean;
}

export type RealtimeStatusHandler = (update: RealtimeStatusUpdate) => void;

export interface RealtimeSubscriptionHandle {
  channel: RealtimeChannel;
  cleanup: () => Promise<RealtimeRemoveChannelResponse>;
}

export interface RealtimePostgresChangesFilter {
  event: 'INSERT' | 'UPDATE';
  schema: 'public';
  table: 'order_messages' | 'notifications' | 'order_change_events';
  filter: string;
}

export type RealtimeChannelScope =
  | 'order-chat'
  | 'notifications'
  | 'orders:admin'
  | 'orders:seller';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clientInstanceId =
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

const activeChannels = new Map<string, RealtimeChannel>();

function normalizedUuid(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && UUID_PATTERN.test(normalized) ? normalized : null;
}

export function isRealtimeUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function createScopedRealtimeChannelName(
  scope: RealtimeChannelScope,
  identifiers: Array<string | null | undefined>,
): string | null {
  const normalizedIdentifiers = identifiers.map(normalizedUuid);
  if (
    normalizedIdentifiers.length === 0
    || normalizedIdentifiers.some((identifier) => identifier === null)
  ) {
    return null;
  }

  return `${scope}:${normalizedIdentifiers.join(':')}:${clientInstanceId}`;
}

export function createOrderChatChannelName(
  userId: string | null | undefined,
  orderId: string | null | undefined,
): string | null {
  return createScopedRealtimeChannelName('order-chat', [userId, orderId]);
}

export function createNotificationsChannelName(
  userId: string | null | undefined,
): string | null {
  return createScopedRealtimeChannelName('notifications', [userId]);
}

export function createOrderMessageInsertFilter(
  orderId: string | null | undefined,
): RealtimePostgresChangesFilter | null {
  const normalizedOrderId = normalizedUuid(orderId);
  if (!normalizedOrderId) return null;

  return {
    event: 'INSERT',
    schema: 'public',
    table: 'order_messages',
    filter: `order_id=eq.${normalizedOrderId}`,
  };
}

export function createNotificationFilter(
  userId: string | null | undefined,
  event: 'INSERT' | 'UPDATE',
): RealtimePostgresChangesFilter | null {
  const normalizedUserId = normalizedUuid(userId);
  if (!normalizedUserId) return null;

  return {
    event,
    schema: 'public',
    table: 'notifications',
    filter: `recipient_id=eq.${normalizedUserId}`,
  };
}

export function isRealtimeSubscribedStatus(
  status: REALTIME_SUBSCRIBE_STATES,
): boolean {
  return status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED;
}

export function getRealtimeConnectionState(
  status: REALTIME_SUBSCRIBE_STATES,
): RealtimeConnectionState {
  if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) return 'connected';
  if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) return 'disconnected';
  return 'error';
}

export function normalizeRealtimeSubscriptionError(
  status: REALTIME_SUBSCRIBE_STATES,
  error?: Error,
): Error | null {
  if (error) return error;
  if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
    return new Error('The Realtime subscription timed out.');
  }
  if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
    return new Error('The Realtime channel encountered an error.');
  }
  return null;
}

export async function removeRealtimeChannel(
  channel: RealtimeChannel | null | undefined,
): Promise<RealtimeRemoveChannelResponse> {
  if (!channel) return 'ok';

  for (const [name, activeChannel] of activeChannels) {
    if (activeChannel === channel) activeChannels.delete(name);
  }

  try {
    return await supabase.removeChannel(channel);
  } catch {
    return 'error';
  }
}

export async function createRealtimeChannel(
  channelName: string | null | undefined,
): Promise<RealtimeChannel | null> {
  if (!channelName) return null;

  const existingChannel = activeChannels.get(channelName);
  if (existingChannel) await removeRealtimeChannel(existingChannel);

  const channel = supabase.channel(channelName);
  activeChannels.set(channelName, channel);
  return channel;
}

export function subscribeRealtimeChannel(
  channel: RealtimeChannel,
  onStatus: RealtimeStatusHandler,
): RealtimeSubscriptionHandle {
  let active = true;
  let hasConnected = false;
  let connectionWasInterrupted = false;

  onStatus({
    status: null,
    connectionState: 'connecting',
    error: null,
    isReconnect: false,
  });

  channel.subscribe((status, error) => {
    if (!active) return;

    const connected = isRealtimeSubscribedStatus(status);
    const isReconnect = connected && hasConnected && connectionWasInterrupted;
    if (connected) {
      hasConnected = true;
      connectionWasInterrupted = false;
    } else if (hasConnected) {
      connectionWasInterrupted = true;
    }

    onStatus({
      status,
      connectionState: getRealtimeConnectionState(status),
      error: normalizeRealtimeSubscriptionError(status, error),
      isReconnect,
    });
  });

  return {
    channel,
    cleanup: async () => {
      active = false;
      return removeRealtimeChannel(channel);
    },
  };
}
