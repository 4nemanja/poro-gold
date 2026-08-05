import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '../../../components/ui';
import type { CreateManualMarketplaceOrderInput, SellerOrderMode } from '../../../shared/types/supabase-orders';
import { sellerService } from '../services/sellerService';
import type { CreateOrderInput } from '../types';
import { CatalogCreateOrderForm } from './CatalogCreateOrderForm';
import { ManualMarketplaceOrderForm } from './ManualMarketplaceOrderForm';
import { useI18n } from '../../../i18n/I18nProvider';

interface CreateOrderPageProps {
  onSubmitSuccess: (orderData: CreateOrderInput) => Promise<void>;
  onManualSubmitSuccess: (orderData: CreateManualMarketplaceOrderInput) => Promise<void>;
  onCancel: () => void;
}

export const CreateOrderPage = ({ onSubmitSuccess, onManualSubmitSuccess, onCancel }: CreateOrderPageProps) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<SellerOrderMode | null>(null);
  const [isLoadingMode, setIsLoadingMode] = useState(true);
  const [modeError, setModeError] = useState<string | null>(null);

  const loadMode = useCallback(async () => {
    setIsLoadingMode(true);
    setModeError(null);
    try {
      setMode(await sellerService.getCurrentSellerOrderMode());
    } catch {
      setMode(null);
      setModeError('Unable to load your order-entry mode from Supabase.');
    } finally {
      setIsLoadingMode(false);
    }
  }, []);

  useEffect(() => { void loadMode(); }, [loadMode]);

  if (isLoadingMode) {
    return <Card className="max-w-3xl mx-auto p-8 text-center text-sm text-gray-500">{t('common.loading')}</Card>;
  }

  if (modeError || !mode) {
    return (
      <Card className="max-w-3xl mx-auto p-8 text-center">
        <p role="alert" className="text-sm text-red-700">{modeError || 'Your order-entry mode is unavailable.'}</p>
        <Button type="button" variant="secondary" className="mt-4" onClick={() => void loadMode()}>{t('common.retry')}</Button>
      </Card>
    );
  }

  return mode === 'catalog'
    ? <CatalogCreateOrderForm onSubmitSuccess={onSubmitSuccess} onCancel={onCancel} />
    : <ManualMarketplaceOrderForm onSubmitSuccess={onManualSubmitSuccess} onCancel={onCancel} />;
};
