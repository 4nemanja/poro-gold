import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Card, Input, Select } from '../../../components/ui';
import type { CreateManualMarketplaceOrderInput } from '../../../shared/types/supabase-orders';
import { sellerService } from '../services/sellerService';
import { supportsBuyerReference } from '../../../shared/utils/orderDisplay';
import type { ManualMarketplacePlatform } from '../types';
import { useI18n } from '../../../i18n/I18nProvider';

interface ManualMarketplaceOrderFormProps {
  onSubmitSuccess: (orderData: CreateManualMarketplaceOrderInput) => Promise<void>;
  onCancel: () => void;
}

const currentLocalDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ManualMarketplaceOrderForm = ({ onSubmitSuccess, onCancel }: ManualMarketplaceOrderFormProps) => {
  const { t } = useI18n();
  const [platforms, setPlatforms] = useState<ManualMarketplacePlatform[]>([]);
  const [platformId, setPlatformId] = useState('');
  const [orderDate, setOrderDate] = useState(currentLocalDate);
  const [productName, setProductName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [price, setPrice] = useState('');
  const [sellerNotes, setSellerNotes] = useState('');
  const [buyerReference, setBuyerReference] = useState('');
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const loadPlatforms = useCallback(async () => {
    setIsLoadingPlatforms(true);
    setPlatformError(null);
    try {
      const supportedPlatforms = await sellerService.getManualMarketplacePlatforms();
      setPlatforms(supportedPlatforms);
      setPlatformId((current) => supportedPlatforms.some((platform) => platform.id === current)
        ? current
        : supportedPlatforms.length === 1 ? supportedPlatforms[0].id : '');
    } catch {
      setPlatforms([]);
      setPlatformError('Unable to load supported marketplace platforms from Supabase.');
    } finally {
      setIsLoadingPlatforms(false);
    }
  }, []);

  useEffect(() => { void loadPlatforms(); }, [loadPlatforms]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setFormError(null);

    const trimmedProductName = productName.trim();
    const trimmedBuyerName = buyerName.trim();
    const numericPrice = Number(price);
    const trimmedBuyerReference = buyerReference.trim();
    if (!platformId) { setFormError('A supported marketplace platform is required.'); return; }
    if (!orderDate) { setFormError('Order date is required.'); return; }
    if (!trimmedProductName) { setFormError('Product name is required.'); return; }
    if (!trimmedBuyerName) { setFormError('Buyer name is required.'); return; }
    if (!price.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      setFormError('Sale price must be a valid positive number.');
      return;
    }
    if (trimmedBuyerReference.length > 100) { setFormError('Buyer Name / Order ID cannot exceed 100 characters.'); return; }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmitSuccess({ platformId, orderDate, productName: trimmedProductName,
        buyerName: trimmedBuyerName, loginEmail: loginEmail.trim(), password,
        sellerNotes: sellerNotes.trim(), buyerReference: trimmedBuyerReference, salePrice: numericPrice });
      setPlatformId(platforms.length === 1 ? platforms[0].id : '');
      setOrderDate(currentLocalDate());
      setProductName('');
      setBuyerName('');
      setLoginEmail('');
      setPassword('');
      setPrice('');
      setSellerNotes('');
      setBuyerReference('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to submit the manual marketplace order.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const noSupportedPlatforms = !isLoadingPlatforms && !platformError && platforms.length === 0;

  return (
    <Card className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900">{t('orders.createNewOrder')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('orders.manualMarketplace')}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {platformError && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{platformError}</p>
            <Button type="button" variant="secondary" className="mt-3" onClick={() => void loadPlatforms()}>{t('common.retry')}</Button>
          </div>
        )}
        {noSupportedPlatforms && <div role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">KupujemProdajem or HaloOglasi must be configured by an Admin first.</div>}
        {formError && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Select label="Platform *" required disabled={isLoadingPlatforms || platforms.length === 0} value={platformId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setPlatformId(event.target.value); setBuyerReference(''); }} options={[{ value: '', label: isLoadingPlatforms ? 'Loading platforms...' : platforms.length ? 'Select Platform' : 'No supported platforms' }, ...platforms.map((platform) => ({ value: platform.id, label: platform.name }))]} />
          <Input label="Date *" required type="date" value={orderDate} onChange={(event: ChangeEvent<HTMLInputElement>) => setOrderDate(event.target.value)} />
        </div>
        {supportsBuyerReference(platforms.find((platform) => platform.id === platformId)?.code) && (
          <Input label="Buyer Name / Order ID (optional)" type="text" maxLength={100} placeholder="e.g. Mimileri — leave blank to auto-generate" value={buyerReference} onChange={(event: ChangeEvent<HTMLInputElement>) => setBuyerReference(event.target.value)} />
        )}
        <Input label={`${t('orders.product')} *`} required type="text" maxLength={200} placeholder="e.g. 2,800 V-Bucks" value={productName} onChange={(event: ChangeEvent<HTMLInputElement>) => setProductName(event.target.value)} />
        <Input label={`${t('orders.buyerName')} *`} required type="text" maxLength={100} placeholder="e.g. Milimeri" value={buyerName} onChange={(event: ChangeEvent<HTMLInputElement>) => setBuyerName(event.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input label={t('orders.accountLogin')} type="text" placeholder="Email, username, or login ID" value={loginEmail} onChange={(event: ChangeEvent<HTMLInputElement>) => setLoginEmail(event.target.value)} />
          <Input label={t('orders.password')} type="password" placeholder="password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input label={`${t('orders.salePrice')} *`} required type="number" step="0.01" value={price} onChange={(event: ChangeEvent<HTMLInputElement>) => setPrice(event.target.value)} />
          <div className="space-y-1"><label className="block text-sm font-medium text-gray-700">Notes</label><textarea rows={3} placeholder="Optional order notes..." value={sellerNotes} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setSellerNotes(event.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
        </div>
        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={isSubmitting || isLoadingPlatforms || platforms.length === 0}>{isSubmitting ? t('orders.submitting') : t('orders.submitOrder')}</Button>
        </div>
      </form>
    </Card>
  );
};
