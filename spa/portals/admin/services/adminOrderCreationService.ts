import { supabase } from '../../../shared/supabase/client';
import { mapAdminOrderRow } from '../../../shared/services/orderMapper';
import { normalizeOrderServiceError } from '../../../shared/services/orderServiceError';
import type {
  AdminCreateCatalogOrderInput,
  AdminCreateCatalogOrderRpcInput,
  AdminCreateManualMarketplaceOrderInput,
  AdminCreateManualMarketplaceOrderRpcInput,
  AdminOrderCreationSellerOption,
  SellerOrderMode,
  SupabaseOrderRow,
} from '../../../shared/types/supabase-orders';
import type { Order } from '../../../types';

interface SellerProfileRow {
  id: string;
  display_name: string;
  email: string | null;
  seller_order_mode: unknown;
  avatar_path: string | null;
}

interface SellerRoleRow {
  user_id: string;
}

const pendingCatalogCreates = new WeakSet<AdminCreateCatalogOrderInput>();
const pendingManualCreates = new WeakSet<AdminCreateManualMarketplaceOrderInput>();

const sellerOrderMode = (value: unknown): SellerOrderMode => {
  if (value === 'catalog' || value === 'manual_marketplace') return value;
  throw normalizeOrderServiceError(
    { code: '22023', message: 'An eligible Seller has an invalid order-entry mode.' },
    'Unable to load eligible Sellers.',
  );
};

const createdOrderRow = (data: unknown, fallback: string): SupabaseOrderRow => {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== 'object' || !('id' in value)) {
    throw normalizeOrderServiceError({ message: fallback }, fallback);
  }
  return value as SupabaseOrderRow;
};

const mapCatalogInput = (
  input: AdminCreateCatalogOrderInput,
): AdminCreateCatalogOrderRpcInput => ({
  p_seller_id: input.sellerId,
  p_platform_id: input.platformId,
  p_category_id: input.categoryId,
  p_sku_id: input.skuId,
  p_login_email: input.loginEmail.trim(),
  p_account_password: input.password,
  p_seller_notes: input.sellerNotes?.trim() || '',
  p_buyer_reference: input.buyerReference?.trim() || '',
  p_sale_price: input.salePrice,
});

const mapManualInput = (
  input: AdminCreateManualMarketplaceOrderInput,
): AdminCreateManualMarketplaceOrderRpcInput => ({
  p_seller_id: input.sellerId,
  p_platform_id: input.platformId,
  p_order_date: input.orderDate,
  p_product_name: input.productName.trim(),
  p_buyer_name: input.buyerName.trim(),
  p_login_email: input.loginEmail.trim(),
  p_account_password: input.password,
  p_seller_notes: input.sellerNotes?.trim() || '',
  p_buyer_reference: input.buyerReference?.trim() || '',
  p_sale_price: input.salePrice,
});

export const adminOrderCreationService = {
  async getActiveSellerOrderCreationOptions(): Promise<AdminOrderCreationSellerOption[]> {
    const [profilesResult, rolesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, email, seller_order_mode, avatar_path')
        .eq('status', 'active')
        .order('display_name'),
      supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'seller'),
    ]);

    if (profilesResult.error) {
      throw normalizeOrderServiceError(profilesResult.error, 'Unable to load eligible Sellers.');
    }
    if (rolesResult.error) {
      throw normalizeOrderServiceError(rolesResult.error, 'Unable to load eligible Seller roles.');
    }

    const sellerIds = new Set(
      ((rolesResult.data || []) as SellerRoleRow[]).map((role) => role.user_id),
    );
    return ((profilesResult.data || []) as SellerProfileRow[])
      .filter((profile) => sellerIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email || '',
        sellerOrderMode: sellerOrderMode(profile.seller_order_mode),
        avatarPath: profile.avatar_path,
      }));
  },

  async createCatalogOrderForSeller(input: AdminCreateCatalogOrderInput): Promise<Order> {
    if (pendingCatalogCreates.has(input)) {
      throw normalizeOrderServiceError(
        { code: '22023', message: 'This Catalog order is already being submitted.' },
        'This Catalog order is already being submitted.',
      );
    }

    pendingCatalogCreates.add(input);
    try {
      const { data, error } = await supabase.rpc(
        'admin_create_catalog_order',
        mapCatalogInput(input),
      );
      if (error) {
        throw normalizeOrderServiceError(error, 'Unable to create the Catalog order for this Seller.');
      }
      return mapAdminOrderRow(createdOrderRow(data, 'Catalog order creation returned no result.'));
    } finally {
      pendingCatalogCreates.delete(input);
    }
  },

  async createManualMarketplaceOrderForSeller(
    input: AdminCreateManualMarketplaceOrderInput,
  ): Promise<Order> {
    if (pendingManualCreates.has(input)) {
      throw normalizeOrderServiceError(
        { code: '22023', message: 'This Manual Marketplace order is already being submitted.' },
        'This Manual Marketplace order is already being submitted.',
      );
    }

    pendingManualCreates.add(input);
    try {
      const { data, error } = await supabase.rpc(
        'admin_create_manual_marketplace_order',
        mapManualInput(input),
      );
      if (error) {
        throw normalizeOrderServiceError(error, 'Unable to create the Manual Marketplace order for this Seller.');
      }
      return mapAdminOrderRow(createdOrderRow(data, 'Manual Marketplace order creation returned no result.'));
    } finally {
      pendingManualCreates.delete(input);
    }
  },
};
