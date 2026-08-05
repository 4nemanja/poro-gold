import { ChevronRight, MessageCircle } from 'lucide-react';
import { ProfileAvatar } from '../../../shared/components/profile/ProfileAvatar';
import { getNotificationActorAvatarUrl } from '../../../shared/services/notificationService';
import type { Notification } from '../../../shared/types/notifications';
import { useI18n } from '../../../i18n/I18nProvider';

const formatNotificationTime = (value: string, locale: string) => new Intl.DateTimeFormat(locale, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value));

export const NotificationCard = ({
  notification,
  onOpen,
  isOpening,
}: {
  notification: Notification;
  onOpen: () => void;
  isOpening: boolean;
}) => {
  const { t, locale } = useI18n();
  const isUnread = notification.readAt === null;
  const actorName = notification.actorDisplayName || 'POROGOLD User';
  const orderLabel = notification.orderNumber || notification.orderId || t('orders.orderUnavailable');

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={isOpening}
      className={`group flex w-full items-start gap-3 border-b border-gray-200 px-4 py-4 text-left transition-colors last:border-b-0 sm:px-5 ${isUnread ? 'bg-blue-50/30 hover:bg-blue-50' : 'bg-white hover:bg-gray-50'} disabled:cursor-wait disabled:opacity-70`}
      aria-label={`${t('common.open')}: ${notification.title}`}
    >
      <ProfileAvatar
        name={actorName}
        email=""
        url={getNotificationActorAvatarUrl(notification.actorAvatarPath)}
        className="h-10 w-10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-2">
            {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label={t('navigation.notifications')} />}
            <h3 className={`truncate text-sm text-gray-900 ${isUnread ? 'font-semibold' : 'font-medium'}`}>{notification.title}</h3>
          </div>
          <time className="shrink-0 text-xs text-gray-500" dateTime={notification.createdAt}>
            {formatNotificationTime(notification.createdAt, locale)}
          </time>
        </div>
        <p className={`mt-1 whitespace-pre-wrap break-words text-sm ${isUnread ? 'text-gray-700' : 'text-gray-500'}`}>{notification.message}</p>
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-700">
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="truncate">{orderLabel}</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
};
