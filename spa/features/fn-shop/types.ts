export type FnShopAction =
  | 'verify-license'
  | 'category-list'
  | 'accounts-list'
  | 'accounts-data'
  | 'inventory'
  | 'groups-status';

export interface FnShopBaseResponse {
  result: true;
  code: string;
  description: string;
  checkedAt: string;
}

export interface FnShopConnection {
  plan: string | null;
  userId: string | null;
}

export interface FnShopCategory {
  slug: string;
  name: string;
  accountCount: number;
  isDefault: boolean;
}

export interface FnShopInventoryRow {
  category: string;
  accountCount: number;
  totalVbucks: number;
  freeGiftSlots: number;
}

export interface FnShopAccount {
  id: string;
  displayName: string;
  category: string;
  vbucks: number | null;
  giftsUsed: number | null;
  giftLimit: number | null;
  freeGiftSlots: number | null;
  status: string;
}

export type FnShopConnectionResponse = FnShopBaseResponse & { connection: FnShopConnection };
export type FnShopCategoriesResponse = FnShopBaseResponse & { categories: FnShopCategory[] };
export type FnShopInventoryResponse = FnShopBaseResponse & { inventory: FnShopInventoryRow[] };
export type FnShopAccountsResponse = FnShopBaseResponse & { accounts: FnShopAccount[] };

export interface FnShopRequest {
  action: FnShopAction;
  category?: string;
  live?: boolean;
}
