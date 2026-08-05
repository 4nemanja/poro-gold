import type { OrderEntryMode, SellerOrderMode } from '../shared/types/supabase-orders';
import type { TemplateClassification, TemplateMutationInput } from '../shared/types/templates';

export type Role = 'Admin' | 'Seller' | 'Supplier' | 'Management';
export type OrderStatus = 'submitted' | 'accepted' | 'in_progress' | 'completed' | 'needs_info' | 'failed' | 'cancelled' | 'refunded' | 'disputed';
export type OrderRefundType = 'full' | 'partial';
export interface OrderRefundDetails { type: OrderRefundType; reason: string; amount: number; currency: 'USD'; refundedAt: string; refundedBy: string | null; }
export interface RefundOrderInput { orderId: string; type: OrderRefundType; reason: string; amount?: number; }
export type UpdateOrderRefundDetailsInput = RefundOrderInput;
export interface ReverseOrderRefundInput { orderId: string; status: Exclude<OrderStatus, 'refunded'>; }
export type OrderMethod = 'Xbox' | 'Epic' | 'PSN';
export type OrderSource = 'supabase' | 'local' | 'mock';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  roles?: Role[];
  status: 'Active' | 'Inactive' | 'Suspended';
  sellerOrderMode?: SellerOrderMode;
  walletBalance?: number;
  totalOrders?: number;
  completedOrders?: number;
  earnings?: number;
  rating?: number;
  verificationStatus?: 'Verified' | 'Pending' | 'Unverified';
  lastActive?: string;
}

export interface AdminUser extends User {
  sellerOrderMode: SellerOrderMode;
}

export interface SKU {
  id: string;
  platformId?: string;
  categoryId?: string;
  supplierId?: string;
  platformName: string;
  category: string;
  product: string;
  package: string;
  amount: number;
  supplierCost: number;
  supplierName: string;
  status: 'Active' | 'Inactive';
}

export interface Template extends TemplateClassification {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'Active' | 'Inactive';
}

export type TemplateInput = TemplateMutationInput;

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  details: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  role: Role;
  text: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  databaseId?: string;
  source?: OrderSource;
  sellerId: string;
  supplierId: string;
  platformId?: string;
  platformName?: string;
  categoryId?: string | null;
  categoryName?: string;
  method: OrderMethod;
  skuId: string | null;
  productName?: string;
  orderEntryMode?: OrderEntryMode;
  manualProductName?: string;
  buyerName?: string;
  buyerReference?: string;
  orderDate?: string;
  packageName?: string;
  deliveryMethod?: string;
  customer?: string;
  loginEmail?: string;
  twoFactorNotes?: string;
  sellerNotes?: string;
  internalNotes?: string;
  salePrice?: number;
  supplierCost?: number;
  sellingFeeAmount?: number;
  withdrawalFeeAmount?: number;
  netRevenue?: number;
  profit?: number;
  refundDetails?: OrderRefundDetails | null;
  status: OrderStatus;
  value: number;
  cost: number;
  createdAt: string;
  updatedAt: string;
  credentials: {
    username: string;
    password: string;
    twoFactor?: string;
    gamertag?: string;
  };
  chat: ChatMessage[];
  history: { status: OrderStatus; timestamp: string; note?: string; changedBy?: string | null }[];
}

export interface PlatformCategory {
  id: string;
  platformId?: string;
  categoryName: string;
  sellingFeePercent: number;
}

export interface Platform {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
  withdrawalFeePercent: number;
  withdrawalFixedFee: number;
  categories: PlatformCategory[];
}
