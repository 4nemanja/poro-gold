import { supabase } from '../../shared/supabase/client';
import type { FortniteOffer, GiftMagicLinkSummary, GiftOrder, GiftOrderInput, PublicGiftOrder } from './types';

const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gift-service`;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

export type GiftServiceErrorCode =
  | 'invalid_token' | 'expired_token' | 'revoked_token' | 'consumed_token'
  | 'cancelled_order' | 'rate_limited' | 'function_unavailable'
  | 'authentication_required' | 'admin_required' | 'invalid_request'
  | 'selection_conflict' | 'allowance_exceeded' | 'unexpected_server_error';

const publicErrorMessages: Record<GiftServiceErrorCode, string> = {
  invalid_token: 'This gift link is invalid.',
  expired_token: 'This gift link has expired.',
  revoked_token: 'This gift link has been revoked.',
  consumed_token: 'This gift link has already been used.',
  cancelled_order: 'This gift order is no longer active.',
  rate_limited: 'Too many requests. Please wait a moment and try again.',
  function_unavailable: 'Gift Service is temporarily unavailable. Please try again shortly.',
  authentication_required: 'Authentication is required.',
  admin_required: 'Admin access is required.',
  invalid_request: 'The Gift Service request was invalid.',
  selection_conflict: 'A gift selection has already been confirmed or is no longer available.',
  allowance_exceeded: 'That item exceeds the remaining V-Bucks allowance.',
  unexpected_server_error: 'Gift Service encountered an unexpected error. Please try again.',
};

export class GiftServiceRequestError extends Error {
  status: number;
  code: GiftServiceErrorCode;
  constructor(status: number, code: GiftServiceErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const numberValue = (value: unknown) => Number(value || 0);
interface GiftLinkRow {
  id: string; expires_at: string; opened_at: string | null; last_opened_at: string | null;
  consumed_at: string | null; revoked_at: string | null; created_at: string;
}
interface GiftOrderRow {
  id: string; public_id: string; order_date: string; customer: string;
  external_order_id: string | null; source: string | null; epic_username: string | null;
  notes: string | null; purchased_vbucks: number; sold_for: number | string;
  cost: number | string; fee_percent: number | string; status: GiftOrder['status'];
  selected_offer_id: string | null; selected_item_name: string | null;
  selected_item_price: number | null; selected_item_image_url: string | null;
  remaining_vbucks: number; created_at: string; updated_at: string;
  completed_at: string | null; cancelled_at: string | null; gift_magic_links?: GiftLinkRow[];
}
interface PublicOrderRow {
  public_id: string; customer: string; purchased_vbucks: number; remaining_vbucks: number;
  status: PublicGiftOrder['status']; expires_at: string; selected_offer_id: string | null;
  selected_item_name: string | null; selected_item_price: number | null;
  selected_item_image_url: string | null;
}
interface SelectionRow {
  public_id: string; selected_item_name: string; selected_item_price: number;
  selected_item_image_url: string | null; remaining_vbucks: number;
  status: PublicGiftOrder['status'];
}

const mapLink = (row: GiftLinkRow): GiftMagicLinkSummary => ({
  id: row.id,
  expiresAt: row.expires_at,
  openedAt: row.opened_at,
  lastOpenedAt: row.last_opened_at,
  consumedAt: row.consumed_at,
  revokedAt: row.revoked_at,
  createdAt: row.created_at,
});

const mapOrder = (row: GiftOrderRow): GiftOrder => ({
  id: row.id,
  publicId: row.public_id,
  date: row.order_date,
  customer: row.customer,
  externalOrderId: row.external_order_id,
  source: row.source,
  epicUsername: row.epic_username,
  notes: row.notes,
  purchasedVbucks: row.purchased_vbucks,
  soldFor: numberValue(row.sold_for),
  cost: numberValue(row.cost),
  feePercent: numberValue(row.fee_percent),
  status: row.status,
  selectedOfferId: row.selected_offer_id,
  selectedItemName: row.selected_item_name,
  selectedItemPrice: row.selected_item_price,
  selectedItemImageUrl: row.selected_item_image_url,
  remainingVbucks: row.remaining_vbucks,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
  cancelledAt: row.cancelled_at,
  links: (row.gift_magic_links || []).map(mapLink),
});

const mapPublicOrder = (row: PublicOrderRow): PublicGiftOrder => ({
  publicId: row.public_id,
  customer: row.customer,
  purchasedVbucks: row.purchased_vbucks,
  remainingVbucks: row.remaining_vbucks,
  status: row.status,
  expiresAt: row.expires_at,
  selectedOfferId: row.selected_offer_id,
  selectedItemName: row.selected_item_name,
  selectedItemPrice: row.selected_item_price,
  selectedItemImageUrl: row.selected_item_image_url,
});

const callFunction = async <T>(action: string, options: { method?: string; body?: unknown; admin?: boolean } = {}): Promise<T> => {
  const query = new URLSearchParams({ action });
  const headers: Record<string, string> = { apikey: publishableKey, 'Content-Type': 'application/json' };
  if (options.admin) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Authentication is required.');
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(`${functionUrl}?${query}`, {
    method: options.method || 'GET', headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const serverCode = typeof payload.code === 'string' ? payload.code : '';
    const knownCode = serverCode in publicErrorMessages ? serverCode as GiftServiceErrorCode
      : response.status === 429 ? 'rate_limited'
      : response.status === 401 || response.status === 403 ? (options.admin ? 'authentication_required' : 'function_unavailable')
      : response.status >= 500 ? 'function_unavailable' : 'unexpected_server_error';
    const serverMessage = typeof payload.error === 'string' ? payload.error : '';
    const safeMessage = options.admin && serverMessage ? serverMessage : publicErrorMessages[knownCode];
    if ((process.env.NODE_ENV !== 'production')) console.error('Gift Service request failed', { status: response.status, code: knownCode, message: safeMessage });
    throw new GiftServiceRequestError(response.status, knownCode, safeMessage);
  }
  return payload as T;
};

export const giftService = {
  async list(): Promise<GiftOrder[]> {
    const { data, error } = await supabase.from('gift_orders').select(`
      *, gift_magic_links(id, expires_at, opened_at, last_opened_at, consumed_at, revoked_at, created_at)
    `).order('order_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw new Error(error.message || 'Unable to load gift orders.');
    return (data || []).map((row) => mapOrder(row as unknown as GiftOrderRow));
  },

  async create(input: GiftOrderInput) {
    return callFunction<{ order: unknown; magicUrl: string; expiresAt: string }>('admin-create', {
      method: 'POST', body: {
        ...input,
        epicUsername: input.epicUsername?.trim() || null,
        cost: 0,
        feePercent: 0,
        externalOrderId: null,
        source: null,
        notes: null,
      }, admin: true,
    });
  },

  async update(id: string, input: GiftOrderInput, selectedOfferId: string | null) {
    const completedAt = input.status === 'completed' ? new Date().toISOString() : null;
    const cancelledAt = input.status === 'cancelled' ? new Date().toISOString() : null;
    const changes: Record<string, unknown> = {
      order_date: input.date, customer: input.customer.trim(),
      epic_username: input.epicUsername?.trim() || null,
      purchased_vbucks: input.purchasedVbucks, sold_for: input.soldFor,
      status: input.status, completed_at: completedAt, cancelled_at: cancelledAt,
    };
    if (!selectedOfferId) changes.remaining_vbucks = input.purchasedVbucks;
    const { error } = await supabase.from('gift_orders').update(changes).eq('id', id);
    if (error) throw new Error(error.message || 'Unable to update the gift order.');
  },

  async regenerate(giftOrderId: string) {
    return callFunction<{ magicUrl: string; expiresAt: string }>('admin-regenerate', {
      method: 'POST', body: { giftOrderId }, admin: true,
    });
  },

  async revoke(giftOrderId: string) {
    await callFunction('admin-revoke', { method: 'POST', body: { giftOrderId }, admin: true });
  },

  async remove(giftOrderId: string) {
    const { error } = await supabase.rpc('delete_gift_order_as_owner', { p_gift_order_id: giftOrderId });
    if (error) throw new Error(error.message || 'Unable to delete the gift order.');
  },

  async getPublicOrder(token: string) {
    const payload = await callFunction<{ order: unknown }>('order', { method: 'POST', body: { token } });
    return mapPublicOrder(payload.order as PublicOrderRow);
  },

  async getPublicShop(token: string) {
    const payload = await callFunction<{ order: unknown; offers: FortniteOffer[]; fetchedAt: string | null }>('shop', { method: 'POST', body: { token } });
    return { order: mapPublicOrder(payload.order as PublicOrderRow), offers: payload.offers, fetchedAt: payload.fetchedAt };
  },

  async select(token: string, offerId: string) {
    const payload = await callFunction<{ selection: SelectionRow }>('select', {
      method: 'POST', body: { token, offerId },
    });
    return {
      publicId: payload.selection.public_id,
      selectedItemName: payload.selection.selected_item_name,
      selectedItemPrice: payload.selection.selected_item_price,
      selectedItemImageUrl: payload.selection.selected_item_image_url,
      remainingVbucks: payload.selection.remaining_vbucks,
      status: payload.selection.status,
    };
  },
};
