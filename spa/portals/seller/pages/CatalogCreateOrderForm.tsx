import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Card, Input, Select } from '../../../components/ui';
import { sellerService } from '../services/sellerService';
import { supportsBuyerReference } from '../../../shared/utils/orderDisplay';
import type { Category, CreateOrderInput, Platform, SKU } from '../types';
import { useI18n } from '../../../i18n/I18nProvider';

interface CatalogCreateOrderFormProps {
  onSubmitSuccess: (orderData: CreateOrderInput) => Promise<void>;
  onCancel: () => void;
}

export const CatalogCreateOrderForm = ({ onSubmitSuccess, onCancel }: CatalogCreateOrderFormProps) => {
  const { t } = useI18n();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [platformId, setPlatformId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [price, setPrice] = useState('');
  const [sellerNotes, setSellerNotes] = useState('');
  const [buyerReference, setBuyerReference] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSkus, setIsLoadingSkus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    sellerService.getPlatforms().then(setPlatforms).catch(() => setLoadError('Unable to load active platforms.')).finally(() => setIsLoadingPlatforms(false));
  }, []);

  useEffect(() => {
    if (!platformId) { setCategories([]); setIsLoadingCategories(false); return; }
    setIsLoadingCategories(true);
    sellerService.getCategories(platformId).then(setCategories).catch(() => setLoadError('Unable to load categories for this platform.')).finally(() => setIsLoadingCategories(false));
  }, [platformId]);

  useEffect(() => {
    if (!categoryId) { setSkus([]); setIsLoadingSkus(false); return; }
    setIsLoadingSkus(true);
    sellerService.getSKUs(platformId, categoryId).then(setSkus).catch(() => setLoadError('Unable to load active SKUs for this category.')).finally(() => setIsLoadingSkus(false));
  }, [categoryId, platformId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setFormError(null);
    const numericPrice = Number(price);
    const trimmedBuyerReference = buyerReference.trim();
    if (!platformId || !categoryId || !skuId) { setFormError('Platform, category, and SKU are required.'); return; }
    if (!price.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) { setFormError('Sale price must be a valid positive number.'); return; }
    if (trimmedBuyerReference.length > 100) { setFormError('Buyer Name / Order ID cannot exceed 100 characters.'); return; }
    const platform = platforms.find((item) => item.id === platformId);
    const category = categories.find((item) => item.id === categoryId);
    const sku = skus.find((item) => item.id === skuId);
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmitSuccess({ platformId, platformName: platform?.name || '', categoryId, categoryName: category?.name || '', skuId,
        productName: sku?.product || '', packageName: sku?.package || '', loginEmail: email.trim(), password,
        sellerNotes: sellerNotes.trim(), buyerReference: trimmedBuyerReference, salePrice: numericPrice });
      setPlatformId(''); setCategoryId(''); setSkuId(''); setEmail(''); setPassword(''); setPrice(''); setSellerNotes(''); setBuyerReference('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to submit the order. Please try again.');
    } finally { submittingRef.current = false; setIsSubmitting(false); }
  };

  return (
    <Card className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-8"><h2 className="text-xl font-semibold text-gray-900">{t('orders.createNewOrder')}</h2><p className="text-sm text-gray-500 mt-1">{t('orders.catalog')}</p></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {loadError && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>}
        {formError && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Select label="Platform *" required value={platformId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setPlatformId(event.target.value); setCategoryId(''); setSkuId(''); setBuyerReference(''); }} options={[{ value: '', label: isLoadingPlatforms ? 'Loading platforms...' : platforms.length ? 'Select Platform' : 'No active platforms' }, ...platforms.map((platform) => ({ value: platform.id, label: platform.name }))]} />
          <Select label="Category *" required disabled={!platformId || isLoadingCategories} value={categoryId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setCategoryId(event.target.value); setSkuId(''); }} options={[{ value: '', label: isLoadingCategories ? 'Loading categories...' : categories.length ? 'Select Category' : 'No categories available' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} />
          <Select label="SKU / Product *" required disabled={!categoryId || isLoadingSkus} value={skuId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSkuId(event.target.value)} options={[{ value: '', label: isLoadingSkus ? 'Loading products...' : skus.length ? 'Select Product' : 'No active products' }, ...skus.map((sku) => ({ value: sku.id, label: sku.name }))]} />
        </div>
        {supportsBuyerReference(platforms.find((platform) => platform.id === platformId)?.code) && (
          <Input label="Buyer Name / Order ID (optional)" type="text" maxLength={100} placeholder="e.g. Mimileri — leave blank to auto-generate" value={buyerReference} onChange={(event: ChangeEvent<HTMLInputElement>) => setBuyerReference(event.target.value)} />
        )}
        <hr className="border-gray-100" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input label={t('orders.accountLogin')} type="text" placeholder="account@email.com" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} />
          <Input label={t('orders.password')} type="password" placeholder="password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input label={`${t('orders.salePrice')} *`} required type="number" step="0.01" value={price} onChange={(event: ChangeEvent<HTMLInputElement>) => setPrice(event.target.value)} />
          <div className="space-y-1"><label className="block text-sm font-medium text-gray-700">{t('orders.notes')}</label><textarea rows={3} value={sellerNotes} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setSellerNotes(event.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
        </div>
        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>{t('common.cancel')}</Button><Button type="submit" disabled={isSubmitting || isLoadingPlatforms}>{isSubmitting ? t('orders.submitting') : t('orders.submitOrder')}</Button></div>
      </form>
    </Card>
  );
};
