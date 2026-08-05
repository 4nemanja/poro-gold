import { supabase } from '../../../shared/supabase/client';
import { mapCreateOrderInputToRpc, mapManualMarketplaceOrderInputToRpc, mapSellerSafeOrderRow } from '../../../shared/services/orderMapper';
import { normalizeOrderServiceError } from '../../../shared/services/orderServiceError';
import type { CreateManualMarketplaceOrderInput, SellerOrderMode, SellerSafeOrderRow } from '../../../shared/types/supabase-orders';
import { isTemplateLanguage } from '../../../shared/types/templates';
import type { Category, CreateOrderInput, ManualMarketplacePlatform, Order, Platform, SKU, Template } from '../types';

const pendingSupabaseCreates = new WeakSet<CreateOrderInput>();
const pendingManualMarketplaceCreates = new WeakSet<CreateManualMarketplaceOrderInput>();

interface SellerTemplateRow {
  id: string;
  title: string;
  category: string;
  content: string;
  platform_id: string | null;
  language: string;
  platforms: { name: string } | null;
}

export const sellerService = {
  getCurrentSellerOrderMode: async (): Promise<SellerOrderMode> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error(userError?.message || 'No authenticated user.');
    const { data, error } = await supabase.from('profiles')
      .select('seller_order_mode')
      .eq('id', userData.user.id)
      .single();
    if (error) throw new Error(error.message);
    if (data.seller_order_mode !== 'catalog' && data.seller_order_mode !== 'manual_marketplace') {
      throw new Error('The Seller order mode is invalid.');
    }
    return data.seller_order_mode;
  },
  getPlatforms: async (): Promise<Platform[]> => {
    const { data, error } = await supabase.from('platforms').select('id, name, code').eq('status', 'Active').order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },
  getManualMarketplacePlatforms: async (): Promise<ManualMarketplacePlatform[]> => {
    const { data, error } = await supabase.from('platforms')
      .select('id, name, code')
      .eq('status', 'Active')
      .in('code', ['kupujemprodajem', 'halooglasi'])
      .order('name');
    if (error) throw new Error(error.message);
    return (data || []).filter(
      (row): row is ManualMarketplacePlatform =>
        row.code === 'kupujemprodajem' || row.code === 'halooglasi',
    );
  },
  getCategories: async (platformId: string): Promise<Category[]> => {
    const { data, error } = await supabase.from('platform_categories').select('id, platform_id, category_name').eq('platform_id', platformId).order('category_name');
    if (error) throw new Error(error.message);
    return (data || []).map((row) => ({ id: row.id, platformId: row.platform_id, name: row.category_name }));
  },
  getSKUs: async (platformId: string, categoryId: string): Promise<SKU[]> => {
    const { data, error } = await supabase.from('skus').select('id, platform_id, category_id, product_name, package_label')
      .eq('platform_id', platformId).eq('category_id', categoryId).eq('status', 'Active').order('product_name');
    if (error) throw new Error(error.message);
    return (data || []).map((row) => ({ id: row.id, platformId: row.platform_id, categoryId: row.category_id,
      name: `${row.product_name} - ${row.package_label}`, product: row.product_name, package: row.package_label }));
  },
  getTemplates: async (): Promise<Template[]> => {
    const { data, error } = await supabase.from('templates')
      .select('id, title, category, content, platform_id, language, platforms(name)')
      .eq('status', 'Active')
      .order('title');
    if (error) throw new Error(error.message);
    return ((data || []) as unknown as SellerTemplateRow[]).map((row) => {
      if (!isTemplateLanguage(row.language)) throw new Error('Template language is invalid.');
      return {
        id: row.id,
        title: row.title,
        category: row.category,
        content: row.content,
        platformId: row.platform_id,
        platformName: row.platforms?.name ?? null,
        language: row.language,
      };
    });
  },
  getCurrentSellerOrdersFromSupabase: async (): Promise<Order[]> => {
    const { data, error } = await supabase.rpc('get_seller_orders');
    if (error) throw normalizeOrderServiceError(error, 'Unable to load seller orders.');
    return ((data || []) as SellerSafeOrderRow[]).map(mapSellerSafeOrderRow);
  },

  getCurrentSellerOrderById: async (databaseId: string): Promise<Order> => {
    const orders = await sellerService.getCurrentSellerOrdersFromSupabase();
    const order = orders.find((candidate) => candidate.databaseId === databaseId);
    if (!order) {
      throw normalizeOrderServiceError(
        { code: 'P0002', message: 'Order not found.' },
        'Order not found.',
      );
    }
    return order;
  },

  createCurrentSellerOrderInSupabase: async (orderData: CreateOrderInput): Promise<Order> => {
    if (pendingSupabaseCreates.has(orderData)) {
      throw normalizeOrderServiceError(
        { code: '22023', message: 'This order is already being submitted.' },
        'This order is already being submitted.',
      );
    }

    pendingSupabaseCreates.add(orderData);
    try {
      const { data, error } = await supabase.rpc(
        'create_seller_order',
        mapCreateOrderInputToRpc(orderData),
      );
      if (error) throw normalizeOrderServiceError(error, 'Unable to create the order.');
      const row = ((data || []) as SellerSafeOrderRow[])[0];
      if (!row) {
        throw normalizeOrderServiceError(
          { message: 'Order creation returned no result.' },
          'Order creation returned no result.',
        );
      }
      return mapSellerSafeOrderRow(row);
    } finally {
      pendingSupabaseCreates.delete(orderData);
    }
  },

  createManualMarketplaceOrder: async (input: CreateManualMarketplaceOrderInput): Promise<Order> => {
    if (pendingManualMarketplaceCreates.has(input)) {
      throw normalizeOrderServiceError(
        { code: '22023', message: 'This order is already being submitted.' },
        'This order is already being submitted.',
      );
    }

    pendingManualMarketplaceCreates.add(input);
    try {
      const { data, error } = await supabase.rpc(
        'create_manual_marketplace_order',
        mapManualMarketplaceOrderInputToRpc(input),
      );
      if (error) throw normalizeOrderServiceError(error, 'Unable to create the manual marketplace order.');
      const row = ((data || []) as SellerSafeOrderRow[])[0];
      if (!row) {
        throw normalizeOrderServiceError(
          { message: 'Manual marketplace order creation returned no result.' },
          'Manual marketplace order creation returned no result.',
        );
      }
      return mapSellerSafeOrderRow(row);
    } finally {
      pendingManualMarketplaceCreates.delete(input);
    }
  },
};
