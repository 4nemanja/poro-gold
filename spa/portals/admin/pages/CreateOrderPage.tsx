import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { UserRound } from 'lucide-react';
import { Button, Card, Select } from '../../../components/ui';
import { ProfileAvatar } from '../../../shared/components/profile/ProfileAvatar';
import type {
  AdminOrderCreationSellerOption,
  CreateManualMarketplaceOrderInput,
} from '../../../shared/types/supabase-orders';
import type { Order } from '../../../types';
import { CatalogCreateOrderForm } from '../../seller/pages/CatalogCreateOrderForm';
import { ManualMarketplaceOrderForm } from '../../seller/pages/ManualMarketplaceOrderForm';
import type { CreateOrderInput } from '../../seller/types';
import { adminOrderCreationService } from '../services/adminOrderCreationService';
import { useI18n } from '../../../i18n/I18nProvider';

interface AdminCreateOrderPageProps {
  onOrderCreated: (order: Order) => Promise<void>;
  onCancel: () => void;
}

const modeLabel = (seller: AdminOrderCreationSellerOption): string =>
  seller.sellerOrderMode === 'catalog' ? 'Catalog' : 'Manual Marketplace';

export const CreateOrderPage = ({ onOrderCreated, onCancel }: AdminCreateOrderPageProps) => {
  const { t } = useI18n();
  const [sellers, setSellers] = useState<AdminOrderCreationSellerOption[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<AdminOrderCreationSellerOption | null>(null);
  const [isLoadingSellers, setIsLoadingSellers] = useState(true);
  const [sellerError, setSellerError] = useState<string | null>(null);

  const loadSellers = useCallback(async () => {
    setIsLoadingSellers(true);
    setSellerError(null);
    try {
      setSellers(await adminOrderCreationService.getActiveSellerOrderCreationOptions());
    } catch (error) {
      setSellerError(error instanceof Error ? error.message : 'Unable to load active Sellers.');
    } finally {
      setIsLoadingSellers(false);
    }
  }, []);

  useEffect(() => { void loadSellers(); }, [loadSellers]);

  const selectableSellers = useMemo(() => {
    if (!selectedSeller || sellers.some((seller) => seller.id === selectedSeller.id)) return sellers;
    return [selectedSeller, ...sellers];
  }, [selectedSeller, sellers]);

  const handleSellerChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const seller = sellers.find((candidate) => candidate.id === event.target.value) || null;
    setSelectedSeller(seller);
  };

  const submitCatalogOrder = async (input: CreateOrderInput) => {
    if (!selectedSeller) throw new Error('Select a Seller before submitting the order.');
    try {
      const createdOrder = await adminOrderCreationService.createCatalogOrderForSeller({
        sellerId: selectedSeller.id,
        platformId: input.platformId,
        categoryId: input.categoryId,
        skuId: input.skuId,
        loginEmail: input.loginEmail,
        password: input.password,
        sellerNotes: input.sellerNotes,
        buyerReference: input.buyerReference,
        salePrice: input.salePrice,
      });
      await onOrderCreated(createdOrder);
    } catch (error) {
      void loadSellers();
      throw error;
    }
  };

  const submitManualOrder = async (input: CreateManualMarketplaceOrderInput) => {
    if (!selectedSeller) throw new Error('Select a Seller before submitting the order.');
    try {
      const createdOrder = await adminOrderCreationService.createManualMarketplaceOrderForSeller({
        ...input,
        sellerId: selectedSeller.id,
      });
      await onOrderCreated(createdOrder);
    } catch (error) {
      void loadSellers();
      throw error;
    }
  };

  const selectedSellerIsStillEligible = selectedSeller
    ? sellers.some((seller) => seller.id === selectedSeller.id)
    : false;
  const refreshedSelectedSeller = selectedSeller
    ? sellers.find((seller) => seller.id === selectedSeller.id) || null
    : null;
  const selectedSellerConfigurationChanged = Boolean(
    selectedSeller
    && refreshedSelectedSeller
    && refreshedSelectedSeller.sellerOrderMode !== selectedSeller.sellerOrderMode,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.createNewOrder')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('orders.createOrder')}</p>
      </div>

      <Card className="mx-auto max-w-3xl p-6">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">{t('orders.selectSeller')}</h2>
        </div>
        <div className="mt-4">
          <Select
            label={`${t('orders.seller')} *`}
            value={selectedSeller?.id || ''}
            disabled={isLoadingSellers && sellers.length === 0}
            onChange={handleSellerChange}
            options={[
              {
                value: '',
                label: isLoadingSellers
                  ? 'Loading Sellers...'
                  : sellers.length ? t('orders.selectSeller') : t('common.noData'),
              },
              ...selectableSellers.map((seller) => ({
                value: seller.id,
                label: `${seller.displayName} — ${seller.email || 'No email'} — ${modeLabel(seller)}${
                  sellers.some((candidate) => candidate.id === seller.id) ? '' : ' — no longer eligible'
                }`,
              })),
            ]}
          />
        </div>
        {sellerError && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p role="alert">{sellerError}</p>
            <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => void loadSellers()}>{t('common.retry')}</Button>
          </div>
        )}
        {!isLoadingSellers && !sellerError && sellers.length === 0 && !selectedSeller && (
          <p className="mt-4 text-sm text-gray-500">No active Sellers are available.</p>
        )}

        {selectedSeller ? (
          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center">
            <ProfileAvatar name={selectedSeller.displayName} email={selectedSeller.email} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium text-gray-900">{selectedSeller.displayName}</p>
              <p className="break-all text-sm text-gray-500">{selectedSeller.email || 'No email available'}</p>
            </div>
            <span className="self-start rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 sm:self-center">
              {modeLabel(selectedSeller)}
            </span>
          </div>
        ) : (
          !isLoadingSellers && <p className="mt-5 text-sm text-gray-500">Select a Seller to continue.</p>
        )}
        {selectedSeller && !selectedSellerIsStillEligible && (
          <p role="alert" className="mt-3 text-sm text-amber-700">
            This Seller is no longer an eligible creation target. Your form values are preserved; select another Seller or retry after correcting the profile.
          </p>
        )}
        {selectedSellerConfigurationChanged && refreshedSelectedSeller && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            <p role="alert">This Seller&apos;s order-entry mode changed after selection. Existing form values remain preserved.</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => setSelectedSeller(refreshedSelectedSeller)}
            >
              Load updated Seller workflow
            </Button>
          </div>
        )}
        {selectedSeller && (
          <p className="mt-3 text-xs text-gray-500">
            The order will belong to the selected Seller. Your Admin account will be recorded as the creation actor.
          </p>
        )}
      </Card>

      {selectedSeller?.sellerOrderMode === 'catalog' && (
        <CatalogCreateOrderForm
          key={`${selectedSeller.id}:catalog`}
          onSubmitSuccess={submitCatalogOrder}
          onCancel={onCancel}
        />
      )}
      {selectedSeller?.sellerOrderMode === 'manual_marketplace' && (
        <ManualMarketplaceOrderForm
          key={`${selectedSeller.id}:manual_marketplace`}
          onSubmitSuccess={submitManualOrder}
          onCancel={onCancel}
        />
      )}
    </div>
  );
};
