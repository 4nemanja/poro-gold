import type { OrderStatus } from '../../types';

export type SellerOrderMode = 'catalog' | 'manual_marketplace';
export type OrderEntryMode = 'catalog' | 'manual_marketplace';

/** Complete database row available only to authorized Admin data access. */
export interface SupabaseOrderRow {
  id: string;
  order_number: string;
  seller_id: string | null;
  supplier_id: string | null;
  platform_id: string | null;
  category_id: string | null;
  sku_id: string | null;
  platform_name: string | null;
  category_name: string | null;
  product_name: string | null;
  package_label: string | null;
  customer_username: string | null;
  delivery_method: string | null;
  login_email: string | null;
  account_password: string | null;
  two_factor_notes: string | null;
  seller_notes: string | null;
  internal_notes: string | null;
  status: OrderStatus;
  sale_price: number;
  supplier_cost: number;
  selling_fee_percent: number;
  selling_fee_amount: number;
  withdrawal_fee_percent: number;
  withdrawal_fixed_fee: number;
  withdrawal_fee_amount: number;
  net_revenue: number;
  profit: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  order_entry_mode: OrderEntryMode;
  manual_product_name: string | null;
  buyer_name: string | null;
  order_date: string | null;
  buyer_reference: string | null;
  refund_type: 'full' | 'partial' | null;
  refund_reason: string | null;
  refunded_amount: number | null;
  refunded_at: string | null;
  refunded_by: string | null;
}

/** Seller-safe RPC shape; protected financial and supplier fields are omitted. */
export type SellerSafeOrderRow = Pick<
  SupabaseOrderRow,
  | 'id' | 'order_number' | 'seller_id' | 'platform_id' | 'category_id' | 'sku_id'
  | 'platform_name' | 'category_name' | 'product_name' | 'package_label'
  | 'customer_username' | 'delivery_method' | 'login_email' | 'account_password'
  | 'two_factor_notes' | 'seller_notes' | 'status' | 'sale_price'
  | 'created_at' | 'updated_at' | 'order_entry_mode' | 'manual_product_name'
  | 'buyer_name' | 'order_date' | 'buyer_reference'
>;

export interface CreateSellerOrderRpcInput {
  p_platform_id: string;
  p_category_id: string;
  p_sku_id: string;
  p_login_email: string;
  p_account_password: string;
  p_seller_notes: string;
  p_buyer_reference: string;
  p_sale_price: number;
}

export interface CreateManualMarketplaceOrderInput {
  platformId: string;
  orderDate: string;
  productName: string;
  buyerName: string;
  buyerReference?: string;
  loginEmail: string;
  password: string;
  sellerNotes?: string;
  salePrice: number;
}

export interface CreateManualMarketplaceOrderRpcInput {
  p_platform_id: string;
  p_order_date: string;
  p_product_name: string;
  p_buyer_name: string;
  p_login_email: string;
  p_account_password: string;
  p_seller_notes: string;
  p_buyer_reference: string;
  p_sale_price: number;
}

export interface AdminCreateCatalogOrderInput {
  sellerId: string;
  platformId: string;
  categoryId: string;
  skuId: string;
  loginEmail: string;
  password: string;
  sellerNotes?: string;
  buyerReference?: string;
  salePrice: number;
}

export interface AdminCreateCatalogOrderRpcInput extends CreateSellerOrderRpcInput {
  p_seller_id: string;
}

export interface AdminCreateManualMarketplaceOrderInput extends CreateManualMarketplaceOrderInput {
  sellerId: string;
}

export interface AdminCreateManualMarketplaceOrderRpcInput extends CreateManualMarketplaceOrderRpcInput {
  p_seller_id: string;
}

export interface AdminOrderCreationSellerOption {
  id: string;
  displayName: string;
  email: string;
  sellerOrderMode: SellerOrderMode;
  avatarPath: string | null;
}

export interface SupabaseOrderIdentity {
  source: 'supabase';
  databaseId: string;
  orderNumber: string;
}

export interface SupabaseOrderHistoryRow {
  order_id: string;
  status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}
