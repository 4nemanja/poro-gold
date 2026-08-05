import { ProfileAvatar } from '../../../shared/components/profile/ProfileAvatar';
import { getOrderMessageAvatarUrl } from '../../../shared/services/orderChatService';
import type { OrderMessage } from '../../../shared/types/order-chat';
import { useI18n } from '../../../i18n/I18nProvider';

const formatMessageTime = (value: string, locale: string) => new Intl.DateTimeFormat(locale, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value));

export const OrderChatMessage = ({
  message,
  isCurrentUser,
}: {
  message: OrderMessage;
  isCurrentUser: boolean;
}) => {
  const { t, locale } = useI18n();
  const senderName = message.senderDisplayName || (message.senderType === 'admin' ? 'Admin' : 'Seller');
  const avatarUrl = getOrderMessageAvatarUrl(message.senderAvatarPath);

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex min-w-0 max-w-[96%] items-end gap-2 sm:max-w-[92%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
        <ProfileAvatar name={senderName} email="" url={avatarUrl} className="h-8 w-8" />
        <div className={`min-w-0 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
          <div className={`mb-1 flex flex-wrap items-center gap-1.5 text-xs ${isCurrentUser ? 'justify-end' : ''}`}>
            <span className="font-medium text-gray-900">{senderName}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${message.senderType === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {message.senderType === 'admin' ? t('chat.admin') : t('chat.seller')}
            </span>
            <time className="text-gray-400" dateTime={message.createdAt}>{formatMessageTime(message.createdAt, locale)}</time>
            {message.editedAt && <span className="text-gray-400">{t('chat.edited')}</span>}
          </div>
          <div className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-left text-sm ${isCurrentUser ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-gray-200 bg-gray-100 text-gray-900'}`}>
            {message.message}
          </div>
        </div>
      </div>
    </div>
  );
};
