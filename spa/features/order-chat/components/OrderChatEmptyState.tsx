import { MessageCircle } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nProvider';

export const OrderChatEmptyState = () => {
  const { t } = useI18n();
  return <div className="flex min-h-36 flex-col items-center justify-center px-6 py-8 text-center">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
      <MessageCircle className="h-5 w-5" />
    </div>
    <p className="text-sm font-medium text-gray-900">{t('chat.empty')}</p>
  </div>;
};
