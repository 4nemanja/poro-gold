import { useId, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'sm:max-w-lg' }: ModalProps) => {
  const titleId = useId();
  const { t } = useI18n();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain" role="presentation">
      <div className="flex min-h-full items-center justify-center p-3 text-center sm:p-6">
        <button type="button" className="fixed inset-0 cursor-default bg-slate-900/45 backdrop-blur-sm transition-opacity" onClick={onClose} aria-label={t('common.close')} />
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`relative w-full max-h-[calc(100dvh-1.5rem)] transform overflow-y-auto rounded-xl bg-white text-left shadow-2xl border border-gray-200 transition-all sm:max-h-[calc(100dvh-3rem)] ${maxWidth}`}>
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
            <div className="sm:flex sm:items-start">
              <div className="w-full min-w-0 text-left">
                <h3 id={titleId} className="text-lg font-semibold leading-6 text-gray-900 mb-4">{title}</h3>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
