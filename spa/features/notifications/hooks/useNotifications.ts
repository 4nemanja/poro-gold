import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createNotificationFilter,
  createNotificationsChannelName,
  createRealtimeChannel,
  isRealtimeUuid,
  removeRealtimeChannel,
  subscribeRealtimeChannel,
  type RealtimeConnectionState,
  type RealtimeSubscriptionHandle,
} from '../../../shared/realtime/realtimeSubscription';
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../shared/services/notificationService';
import type { Notification } from '../../../shared/types/notifications';

const MAX_BATCH_SIZE = 100;

const messageFromError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const deduplicateAndSortNotifications = (
  notifications: Notification[],
): Notification[] => {
  const notificationsById = new Map<string, Notification>();
  for (const notification of notifications) {
    notificationsById.set(notification.id, notification);
  }

  return [...notificationsById.values()].sort((left, right) => {
    const timestampDifference = right.createdAt.localeCompare(left.createdAt);
    return timestampDifference || right.id.localeCompare(left.id);
  });
};

const getNotificationWindow = async (targetCount: number) => {
  const requestedCount = targetCount + 1;
  const collected: Notification[] = [];
  let offset = 0;

  while (collected.length < requestedCount) {
    const limit = Math.min(MAX_BATCH_SIZE, requestedCount - collected.length);
    const result = await getMyNotifications({ limit, offset });
    collected.push(...result.notifications);
    offset += result.notifications.length;
    if (result.notifications.length < limit) break;
  }

  const normalized = deduplicateAndSortNotifications(collected);
  return {
    notifications: normalized.slice(0, targetCount),
    hasMore: normalized.length > targetCount,
  };
};

export interface UseNotificationsOptions {
  currentUserId: string | null | undefined;
  pageSize?: number;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  actionError: string | null;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  isMarkingRead: boolean;
  markingNotificationId: string | null;
  isMarkingAllRead: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
  realtimeConnectionState: RealtimeConnectionState;
}

export const useNotifications = ({
  currentUserId,
  pageSize = 20,
}: UseNotificationsOptions): UseNotificationsResult => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [realtimeConnectionState, setRealtimeConnectionState] =
    useState<RealtimeConnectionState>('disconnected');
  const mounted = useRef(true);
  const requestSequence = useRef(0);
  const loadMoreInProgress = useRef(false);
  const notificationsRef = useRef<Notification[]>([]);
  const hasMoreRef = useRef(false);

  const applyNotifications = useCallback((nextNotifications: Notification[]) => {
    notificationsRef.current = nextNotifications;
    setNotifications(nextNotifications);
  }, []);

  const applyHasMore = useCallback((nextHasMore: boolean) => {
    hasMoreRef.current = nextHasMore;
    setHasMore(nextHasMore);
  }, []);

  const loadNotificationState = useCallback(async (
    targetCount: number,
    showLoading: boolean,
    surfaceError: boolean,
  ): Promise<boolean> => {
    const requestId = surfaceError
      ? ++requestSequence.current
      : requestSequence.current;
    if (showLoading) setIsLoading(true);
    if (surfaceError) setError(null);

    try {
      const [windowResult, countResult] = await Promise.all([
        getNotificationWindow(targetCount),
        getMyUnreadNotificationCount(),
      ]);
      if (!mounted.current || requestId !== requestSequence.current) return false;

      const existingNotifications = notificationsRef.current;
      const fetchedIds = new Set(windowResult.notifications.map((item) => item.id));
      const concurrentlyLoaded = showLoading
        ? []
        : existingNotifications.filter((item) => !fetchedIds.has(item.id));
      const nextNotifications = deduplicateAndSortNotifications([
        ...windowResult.notifications,
        ...concurrentlyLoaded,
      ]);

      applyNotifications(nextNotifications);
      setUnreadCount(countResult.count);
      applyHasMore(windowResult.hasMore || (
        concurrentlyLoaded.length > 0 && hasMoreRef.current
      ));
      setError(null);
      return true;
    } catch (loadError) {
      if (!mounted.current || requestId !== requestSequence.current) return false;
      if (surfaceError) {
        setError(messageFromError(loadError, 'Unable to load notifications.'));
      }
      return false;
    } finally {
      if (showLoading && mounted.current && requestId === requestSequence.current) {
        setIsLoading(false);
      }
    }
  }, [applyHasMore, applyNotifications]);

  const refresh = useCallback(async () => {
    await loadNotificationState(pageSize, true, true);
  }, [loadNotificationState, pageSize]);

  useEffect(() => {
    mounted.current = true;
    if (!isRealtimeUuid(currentUserId)) {
      applyNotifications([]);
      setUnreadCount(0);
      applyHasMore(false);
      setIsLoading(false);
      return () => {
        mounted.current = false;
        requestSequence.current += 1;
      };
    }

    setIsLoading(true);
    void refresh();
    return () => {
      mounted.current = false;
      requestSequence.current += 1;
    };
  }, [applyHasMore, applyNotifications, currentUserId, refresh]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadMoreInProgress.current) return;
    loadMoreInProgress.current = true;
    setIsLoadingMore(true);
    setActionError(null);
    const offset = notificationsRef.current.length;

    try {
      const result = await getMyNotifications({ limit: pageSize, offset });
      if (!mounted.current) return;
      const nextNotifications = deduplicateAndSortNotifications([
        ...notificationsRef.current,
        ...result.notifications,
      ]);
      applyNotifications(nextNotifications);
      applyHasMore(result.notifications.length === pageSize);
    } catch (loadError) {
      if (mounted.current) {
        setActionError(messageFromError(loadError, 'Unable to load more notifications.'));
      }
    } finally {
      loadMoreInProgress.current = false;
      if (mounted.current) setIsLoadingMore(false);
    }
  }, [applyHasMore, applyNotifications, pageSize]);

  const markRead = useCallback(async (notificationId: string) => {
    const notification = notificationsRef.current.find((item) => item.id === notificationId);
    if (!notification || notification.readAt || markingNotificationId) return;
    setMarkingNotificationId(notificationId);
    setActionError(null);

    try {
      const readAt = await markNotificationRead(notificationId);
      if (!mounted.current) return;
      applyNotifications(notificationsRef.current.map((item) =>
        item.id === notificationId ? { ...item, readAt } : item));
      setUnreadCount((current) => Math.max(0, current - 1));

      try {
        const result = await getMyUnreadNotificationCount();
        if (mounted.current) setUnreadCount(result.count);
      } catch (countError) {
        if (mounted.current) {
          setActionError(messageFromError(countError, 'Unable to refresh the unread count.'));
        }
      }
    } catch (readError) {
      if (mounted.current) {
        setActionError(messageFromError(readError, 'Unable to mark the notification as read.'));
      }
      throw readError;
    } finally {
      if (mounted.current) setMarkingNotificationId(null);
    }
  }, [applyNotifications, markingNotificationId]);

  const markAllRead = useCallback(async () => {
    if (isMarkingAllRead || unreadCount === 0) return;
    setIsMarkingAllRead(true);
    setActionError(null);
    try {
      await markAllNotificationsRead();
      if (!mounted.current) return;
      await refresh();
    } catch (readError) {
      if (mounted.current) {
        setActionError(messageFromError(readError, 'Unable to mark notifications as read.'));
      }
    } finally {
      if (mounted.current) setIsMarkingAllRead(false);
    }
  }, [isMarkingAllRead, refresh, unreadCount]);

  useEffect(() => {
    const channelName = createNotificationsChannelName(currentUserId);
    const insertFilter = createNotificationFilter(currentUserId, 'INSERT');
    const updateFilter = createNotificationFilter(currentUserId, 'UPDATE');
    if (!channelName || !insertFilter || !updateFilter) {
      setRealtimeConnectionState('disconnected');
      return;
    }

    let cancelled = false;
    let subscription: RealtimeSubscriptionHandle | null = null;
    let pendingChannelCleanup = false;
    let refreshInFlight = false;
    let refreshQueued = false;
    let pendingInsertedItems = 0;
    let reconnectRecoveryRequested = false;
    const pendingInsertIds = new Set<string>();

    const queueAuthoritativeRefresh = (reason: 'insert' | 'update' | 'reconnect') => {
      if (cancelled) return;
      if (reason === 'insert') pendingInsertedItems += 1;
      if (reason === 'reconnect') reconnectRecoveryRequested = true;

      if (refreshInFlight) {
        refreshQueued = true;
        return;
      }

      refreshInFlight = true;
      void (async () => {
        do {
          refreshQueued = false;
          const additionalItems = reconnectRecoveryRequested
            ? Math.max(pageSize, pendingInsertedItems)
            : pendingInsertedItems;
          pendingInsertedItems = 0;
          reconnectRecoveryRequested = false;
          const targetCount = Math.max(
            pageSize,
            notificationsRef.current.length + additionalItems,
          );
          await loadNotificationState(targetCount, false, false);
          pendingInsertIds.clear();
        } while (!cancelled && refreshQueued);
        refreshInFlight = false;
      })();
    };

    const acceptsPayload = (payload: Record<string, unknown>) => {
      const notificationId = payload.id;
      const recipientId = payload.recipient_id;
      return isRealtimeUuid(notificationId)
        && isRealtimeUuid(recipientId)
        && recipientId.toLowerCase() === currentUserId?.toLowerCase();
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
          schema: insertFilter.schema,
          table: insertFilter.table,
          filter: insertFilter.filter,
        },
        (payload) => {
          if (cancelled || !acceptsPayload(payload.new)) return;
          const notificationId = payload.new.id as string;
          if (
            pendingInsertIds.has(notificationId)
            || notificationsRef.current.some((item) => item.id === notificationId)
          ) {
            return;
          }
          pendingInsertIds.add(notificationId);
          queueAuthoritativeRefresh('insert');
        },
      );

      channel.on<Record<string, unknown>>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: updateFilter.schema,
          table: updateFilter.table,
          filter: updateFilter.filter,
        },
        (payload) => {
          if (cancelled || !acceptsPayload(payload.new)) return;
          queueAuthoritativeRefresh('update');
        },
      );

      if (cancelled) {
        await removeRealtimeChannel(channel);
        return;
      }

      subscription = subscribeRealtimeChannel(channel, (status) => {
        if (cancelled) return;
        setRealtimeConnectionState(status.connectionState);
        if (status.isReconnect) queueAuthoritativeRefresh('reconnect');
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
  }, [currentUserId, loadNotificationState, pageSize]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    actionError,
    refresh,
    markRead,
    markAllRead,
    isMarkingRead: markingNotificationId !== null,
    markingNotificationId,
    isMarkingAllRead,
    hasMore,
    isLoadingMore,
    loadMore,
    realtimeConnectionState,
  };
};
