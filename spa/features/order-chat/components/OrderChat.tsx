import { useEffect, useRef } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { Button, Card } from '../../../components/ui';
import { useProfile } from '../../../shared/profile/ProfileProvider';
import { useOrderChat } from '../hooks/useOrderChat';
import { OrderChatComposer } from './OrderChatComposer';
import { OrderChatEmptyState } from './OrderChatEmptyState';
import { OrderChatMessage } from './OrderChatMessage';
import { useI18n } from '../../../i18n/I18nProvider';

export const OrderChat = ({ orderId }: { orderId: string }) => {
  const { t } = useI18n();
  const { profile } = useProfile();
  const {
    messages,
    isLoading,
    error,
    retry,
    sendMessage,
    isSending,
    sendError,
    realtimeConnectionState,
    realtimeMessageVersion,
  } = useOrderChat({ orderId, currentUserId: profile?.id });
  const messageArea = useRef<HTMLDivElement>(null);
  const initialScrollOrder = useRef<string | null>(null);
  const isNearBottom = useRef(true);
  const lastRealtimeMessageVersion = useRef(0);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      messageArea.current?.scrollTo({
        top: messageArea.current.scrollHeight,
        behavior,
      });
    });
  };

  useEffect(() => {
    if (!isLoading && !error && initialScrollOrder.current !== orderId) {
      initialScrollOrder.current = orderId;
      scrollToBottom('auto');
    }
  }, [error, isLoading, orderId]);

  useEffect(() => {
    if (
      realtimeMessageVersion > lastRealtimeMessageVersion.current
      && isNearBottom.current
    ) {
      scrollToBottom();
    }
    lastRealtimeMessageVersion.current = realtimeMessageVersion;
  }, [realtimeMessageVersion]);

  const connectionLabel = realtimeConnectionState === 'connected'
    ? t('chat.live')
    : realtimeConnectionState === 'connecting'
      ? t('chat.connecting')
      : realtimeConnectionState === 'error'
        ? t('chat.reconnecting')
        : t('chat.offline');

  return (
    <Card className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/50 px-5 py-4">
        <h3 className="flex items-center gap-2 text-base font-semibold leading-6 text-gray-900">
          <MessageCircle className="h-4 w-4 text-gray-400" />
          {t('chat.title')}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${realtimeConnectionState === 'connected' ? 'text-emerald-600' : 'text-gray-500'}`}>
            {connectionLabel}
          </span>
          {!isLoading && !error && (
            <Button type="button" variant="ghost" size="icon" onClick={() => void retry()} title={t('chat.refresh')} aria-label={t('chat.refresh')}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div
        ref={messageArea}
        onScroll={(event) => {
          const element = event.currentTarget;
          isNearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 80;
        }}
        className="h-80 overflow-y-auto overscroll-contain p-4 sm:p-5"
      >
        {isLoading && (
          <div className="flex h-full min-h-36 items-center justify-center text-sm text-gray-500">{t('chat.loading')}</div>
        )}
        {!isLoading && error && (
          <div className="flex h-full min-h-36 flex-col items-center justify-center px-4 text-center">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => void retry()}>{t('common.retry')}</Button>
          </div>
        )}
        {!isLoading && !error && messages.length === 0 && <OrderChatEmptyState />}
        {!isLoading && !error && messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((message) => (
              <OrderChatMessage key={message.id} message={message} isCurrentUser={message.senderId === profile?.id} />
            ))}
          </div>
        )}
      </div>

      <OrderChatComposer
        onSend={sendMessage}
        isSending={isSending}
        sendError={sendError}
        onSent={() => scrollToBottom()}
      />
    </Card>
  );
};
