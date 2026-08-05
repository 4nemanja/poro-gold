import { supabase } from '../../shared/supabase/client';
import type {
  FnShopAccountsResponse,
  FnShopCategoriesResponse,
  FnShopConnectionResponse,
  FnShopInventoryResponse,
  FnShopRequest,
} from './types';

interface FnShopErrorPayload {
  result?: boolean;
  message?: string;
}

const invoke = async <T>(request: FnShopRequest): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('fn-shop-service', { body: request });
  if (error) {
    const response = error.context as Response | undefined;
    const payload = response
      ? await response.clone().json().catch(() => null) as FnShopErrorPayload | null
      : null;
    throw new Error(payload?.message || 'Unable to contact the FN Shop service.');
  }
  const payload = data as FnShopErrorPayload | null;
  if (!payload || payload.result !== true) {
    throw new Error(payload?.message || 'FN Shop returned an unexpected response.');
  }
  return data as T;
};

export const fnShopService = {
  verifyLicense: () => invoke<FnShopConnectionResponse>({ action: 'verify-license' }),
  listCategories: () => invoke<FnShopCategoriesResponse>({ action: 'category-list' }),
  listAccounts: (category?: string) => invoke<FnShopAccountsResponse>({
    action: 'accounts-list',
    ...(category ? { category } : {}),
  }),
  refreshAccountData: () => invoke<FnShopAccountsResponse>({ action: 'accounts-data' }),
  getInventory: () => invoke<FnShopInventoryResponse>({ action: 'inventory' }),
  getGroupsStatus: (live: boolean) => invoke<FnShopAccountsResponse>({ action: 'groups-status', live }),
};
