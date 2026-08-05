import type { OrderEntryMode } from '../../../shared/types/supabase-orders';
import type { TemplateClassification } from '../../../shared/types/templates';

export type Page =
  | 'dashboard'
  | 'create-order'
  | 'my-orders'
  | 'order-details'
  | 'wallet'
  | 'notifications'
  | 'settings'
  | 'templates'
  | 'knowledge-base';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Platform {
  id: string;
  name: string;
  code: string | null;
}

export interface ManualMarketplacePlatform extends Platform {
  code: 'kupujemprodajem' | 'halooglasi';
}

export interface Category {
  id: string;
  platformId: string;
  name: string;
}

export interface SKU {
  id: string;
  categoryId: string;
  platformId: string;
  name: string;
  product: string;
  package: string;
}

export type SellerOrderStatus =
  | 'submitted'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'needs_info'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export interface CreateOrderInput {
  platformId: string;
  platformName: string;
  categoryId: string;
  categoryName: string;
  skuId: string;
  productName: string;
  packageName: string;
  loginEmail: string;
  password: string;
  sellerNotes?: string;
  buyerReference?: string;
  salePrice: number;
}

export interface Order {
  id: string;
  databaseId?: string;
  orderNumber?: string;
  source?: 'supabase' | 'local' | 'mock';
  sellerId: string;
  platformId?: string;
  platform: string;
  platformName?: string;
  categoryId?: string | null;
  categoryName?: string;
  skuId: string | null;
  product: string;
  productName?: string;
  orderEntryMode?: OrderEntryMode;
  manualProductName?: string;
  buyerName?: string;
  buyerReference?: string;
  orderDate?: string;
  packageName?: string;
  customer: string;
  status: SellerOrderStatus;
  price: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  deliveryMethod?: string;
  email?: string;
  loginEmail?: string;
  password?: string;
  twoFactorNotes?: string;
  sellerNotes?: string;
  salePrice?: number;
  history?: { status: SellerOrderStatus; timestamp: string; note?: string }[];
}

export interface Template extends TemplateClassification {
  id: string;
  title: string;
  category: string;
  content: string;
}
