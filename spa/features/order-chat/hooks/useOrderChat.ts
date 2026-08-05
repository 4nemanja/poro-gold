import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getOrderMessages,
  markOrderMessagesRead,
  sendOrderMessage as sendOrderMessageRequest,
} from '../../../shared/services/orderChatService';
import {
  createOrderChatChannelName,
  createOrderMessageInsertFilter,
  createRealtimeChannel,
  isRealtimeUuid,
  removeRealtimeChannel,
  subscribeRealtimeChannel,
  type RealtimeConnectionState,
  type RealtimeSubscriptionHandle,
} from '../../../shared/realtime/realtimeSubscription';
import type { OrderMessage } from '../../../shared/types/order-chat';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export interface UseOrderChatResult {
  messages: OrderMessage[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  isSending: boolean;
  sendError: string | null;
  markRead: () => Promise<void>;
  realtimeConnectionState: RealtimeConnectionState;
  realtimeMessageVersion: number;
}

export interface UseOrderChatOptions {
  orderId: string;
  currentUserId: string | null | undefined;
}

const deduplicateAndSortMessages = (messages: OrderMessage[]): OrderMessage[] => {
  const messagesById = new Map<string, OrderMessage>();
  for (const message of messages) messagesById.set(message.id, message);

  return [...messagesById.values()].sort((left, right) => {
    const timestampDifference = left.createdAt.localeCompare(right.createdAt);
    return timestampDifference || left.id.localeCompare(right.id);
  });
};

export const useOrderChat = ({
  orderId,
  currentUserId,
}: UseOrderChatOptions): UseOrderChatResult => {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [realtimeConnectionState, setRealtimeConnectionState] =
    useState<RealtimeConnectionState>('disconnected');
  const [realtimeMessageVersion, setRealtimeMessageVersion] = useState(0);
  const requestSequence = useRef(0);
  const mounted = useRef(true);
  const sendInProgress = useRef(false);
  const messagesRef = useRef<OrderMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const markRead = useCallback(async () => {
    try {
      await markOrderMessagesRead(orderId);
    } catch {
      // Read receipts are best-effort and must never block reading or sending.
    }
  }, [orderId]);

  const loadMessages = useCallback(async (
    showLoading: boolean,
    surfaceError: boolean,
  ): Promise<boolean> => {
    const requestId = ++requestSequence.current;
    if (showLoading) setIsLoading(true);
    if (surfaceError) setError(null);

    try {
      const nextMessages = await getOrderMessages(orderId);
      if (!mounted.current || requestId !== requestSequence.current) return false;
      const normalizedMessages = deduplicateAndSortMessages(nextMessages);
      messagesRef.current = normalizedMessages;
      setMessages(normalizedMessages);
      setError(null);
      void markRead();
      return true;
    } catch (loadError) {
      if (!mounted.current || requestId !== requestSequence.current) return false;
      if (surfaceError) {
        setError(errorMessage(loadError, 'Unable to load order messages.'));
      }
      return false;
    } finally {
      if (mounted.current && requestId === requestSequence.current) setIsLoading(false);
    }
  }, [markRead, orderId]);

  useEffect(() => {
    mounted.current = true;
    setMessages([]);
    messagesRef.current = [];
    void loadMessages(true, true);
    return () => {
      mounted.current = false;
      requestSequence.current += 1;
    };
  }, [loadMessages]);

  const refresh = useCallback(async () => {
    await loadMessages(true, true);
  }, [loadMessages]);

  useEffect(() => {
    const channelName = createOrderChatChannelName(currentUserId, orderId);
    const filter = createOrderMessageInsertFilter(orderId);
    if (!channelName || !filter) {
      setRealtimeConnectionState('disconnected');
      return;
    }

    let cancelled = false;
    let subscription: RealtimeSubscriptionHandle | null = null;
    let pendingChannelCleanup = false;
    let refreshInFlight = false;
    let refreshQueued = false;
    let notifyAfterRefresh = false;

    const queueAuthoritativeRefresh = (receivedNewMessage: boolean) => {
      if (cancelled) return;
      if (receivedNewMessage) notifyAfterRefresh = true;

      if (refreshInFlight) {
        refreshQueued = true;
        return;
      }

      refreshInFlight = true;
      void (async () => {
        do {
          refreshQueued = false;
          const shouldNotify = notifyAfterRefresh;
          notifyAfterRefresh = false;
          const loaded = await loadMessages(false, false);
          if (!cancelled && loaded && shouldNotify) {
            setRealtimeMessageVersion((current) => current + 1);
          }
        } while (!cancelled && refreshQueued);
        refreshInFlight = false;
      })();
    };

    const connect = async () => {
      const channel = await createRealtimeChannel(channelName);
      if (!channel) return;
      if (cancelled) {
        await removeRealtimeChannel(channel);
        return;
      }

      channel.on<Record<string, unknown>>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: filter.schema,
          table: filter.table,
          filter: filter.filter,
        },
        (payload) => {
          if (cancelled) return;
          const messageId = payload.new.id;
          const eventOrderId = payload.new.order_id;
          if (
            !isRealtimeUuid(messageId)
            || !isRealtimeUuid(eventOrderId)
            || eventOrderId.toLowerCase() !== orderId.toLowerCase()
            || messagesRef.current.some((message) => message.id === messageId)
          ) {
            return;
          }

          queueAuthoritativeRefresh(true);
        },
      );

      if (cancelled) {
        await removeRealtimeChannel(channel);
        return;
      }

      subscription = subscribeRealtimeChannel(channel, (status) => {
        if (cancelled) return;
        setRealtimeConnectionState(status.connectionState);
        if (status.isReconnect) queueAuthoritativeRefresh(false);
      });

      if (pendingChannelCleanup) void subscription.cleanup();
    };

    setRealtimeConnectionState('connecting');
    void connect().catch(() => {
      if (!cancelled) setRealtimeConnectionState('error');
    });

    return () => {
      cancelled = true;
      if (subscription) void subscription.cleanup();
      else pendingChannelCleanup = true;
    };
  }, [currentUserId, loadMessages, orderId]);

  const sendMessage = useCallback(async (message: string) => {
    if (sendInProgress.current) return;
    sendInProgress.current = true;
    setIsSending(true);
    setSendError(null);

    try {
      const createdMessage = await sendOrderMessageRequest(orderId, message);
      if (mounted.current) {
        setMessages((current) => {
          const nextMessages = current.some((item) => item.id === createdMessage.id)
            ? current
            : deduplicateAndSortMessages([...current, createdMessage]);
          messagesRef.current = nextMessages;
          return nextMessages;
        });
      }
      await loadMessages(false, false);
    } catch (sendFailure) {
      const messageText = errorMessage(sendFailure, 'Unable to send the order message.');
      if (mounted.current) setSendError(messageText);
      throw sendFailure;
    } finally {
      sendInProgress.current = false;
      if (mounted.current) setIsSending(false);
    }
  }, [loadMessages, orderId]);

  return {
    messages,
    isLoading,
    error,
    refresh,
    retry: refresh,
    sendMessage,
    isSending,
    sendError,
    markRead,
    realtimeConnectionState,
    realtimeMessageVersion,
  };
};
