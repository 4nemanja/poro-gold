import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button, Card } from '../../../components/ui';
import type { Notification } from '../../../shared/types/notifications';
import type { UseNotificationsResult } from '../hooks/useNotifications';
import { NotificationCard } from '../components/NotificationCard';
import { NotificationEmptyState } from '../components/NotificationEmptyState';
import { useI18n } from '../../../i18n/I18nProvider';

export interface NotificationsPageProps {
  state: UseNotificationsResult;
  onOpenOrder: (orderId: string) => Promise<boolean> | boolean;
}

export const NotificationsPage = ({ state, onOpenOrder }: NotificationsPageProps) => {
  const { t } = useI18n();
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const handleOpen = async (notification: Notification) => {
    setNavigationError(null);
    try {
      await state.markRead(notification.id);
    } catch {
      return;
    }
    if (!notification.orderId) {
      setNavigationError(t('orders.orderUnavailable'));
      return;
    }
    try {
      const opened = await onOpenOrder(notification.orderId);
      if (!opened) setNavigationError(t('orders.orderUnavailable'));
    } catch {
      setNavigationError(t('orders.openOrderFailed'));
    }
  };

  const connectionLabel = state.realtimeConnectionState === 'connected'
    ? t('orders.live')
    : state.realtimeConnectionState === 'connecting'
      ? t('orders.connecting')
      : state.realtimeConnectionState === 'error'
        ? t('orders.reconnecting')
        : t('orders.offline');

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('navigation.notifications')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('orders.notificationsDescription')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs ${state.realtimeConnectionState === 'connected' ? 'text-emerald-600' : 'text-gray-500'}`}>
              {connectionLabel}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={() => void state.refresh()} disabled={state.isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${state.isLoading ? 'animate-spin' : ''}`} /> {t('orders.refresh')}
            </Button>
            {state.unreadCount > 0 && (
              <Button type="button" size="sm" onClick={() => void state.markAllRead()} disabled={state.isMarkingAllRead}>
                {state.isMarkingAllRead ? t('orders.marking') : t('orders.markAllRead')}
              </Button>
            )}
          </div>
        </div>

        {state.actionError && <div role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{state.actionError}</div>}
        {navigationError && <div role="alert" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700">{navigationError}</div>}

        {state.isLoading && state.notifications.length === 0 && (
          <div className="px-6 py-14 text-center text-sm text-gray-500">{t('common.loading')}</div>
        )}
        {!state.isLoading && state.error && state.notifications.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p role="alert" className="text-sm text-red-700">{state.error}</p>
            <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => void state.refresh()}>{t('common.retry')}</Button>
          </div>
        )}
        {!state.isLoading && !state.error && state.notifications.length === 0 && <NotificationEmptyState />}
        {state.notifications.length > 0 && (
          <div>
            {state.error && <div role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{state.error}</div>}
            {state.notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onOpen={() => void handleOpen(notification)}
                isOpening={state.isMarkingRead}
              />
            ))}
          </div>
        )}

        {state.hasMore && state.notifications.length > 0 && (
          <div className="border-t border-gray-200 p-4 text-center">
            <Button type="button" variant="secondary" size="sm" onClick={() => void state.loadMore()} disabled={state.isLoadingMore}>
              {state.isLoadingMore ? t('common.loading') : t('orders.loadMore')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
