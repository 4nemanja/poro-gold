import { useRef, useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useI18n } from '../../../i18n/I18nProvider';

const MAX_MESSAGE_LENGTH = 5000;

export const OrderChatComposer = ({
  onSend,
  isSending,
  sendError,
  onSent,
}: {
  onSend: (message: string) => Promise<void>;
  isSending: boolean;
  sendError: string | null;
  onSent: () => void;
}) => {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const submitting = useRef(false);
  const normalizedDraft = draft.trim();
  const isTooLong = normalizedDraft.length > MAX_MESSAGE_LENGTH;
  const canSend = Boolean(normalizedDraft) && !isTooLong && !isSending;

  const submit = async () => {
    if (!canSend || submitting.current) return;
    submitting.current = true;
    try {
      await onSend(draft);
      setDraft('');
      onSent();
    } catch {
      // The hook exposes a safe error while the draft remains intact.
    } finally {
      submitting.current = false;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="space-y-2 border-t border-gray-200 bg-white p-3">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder={t('chat.input')}
        aria-label={t('chat.title')}
        className="block w-full resize-y rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        disabled={isSending}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {sendError && <p role="alert" className="text-xs text-red-700">{sendError}</p>}
          {!sendError && isTooLong && <p role="alert" className="text-xs text-red-700">{t('chat.tooLong')}</p>}
          {!sendError && !isTooLong && <p className="text-xs text-gray-500">{t('chat.hint')}</p>}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3">
          {(normalizedDraft.length >= 4500 || isTooLong) && (
            <span className={`text-xs ${isTooLong ? 'text-red-700' : 'text-gray-500'}`}>{normalizedDraft.length}/5000</span>
          )}
          <Button type="button" size="sm" onClick={() => void submit()} disabled={!canSend}>
            {isSending ? t('chat.sending') : t('chat.send')}
            {!isSending && <Send className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
