export type GiftStatus =
  | 'waiting_for_selection'
  | 'selection_submitted'
  | 'in_progress'
  | 'completed'
  | 'refunded'
  | 'cancelled';

export interface GiftMagicLinkSummary {
  id: string;
  expiresAt: string;
  openedAt: string | null;
  lastOpenedAt: string | null;
  consumedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface GiftOrder {
  id: string;
  publicId: string;
  date: string;
  customer: string;
  externalOrderId: string | null;
  source: string | null;
  epicUsername: string | null;
  notes: string | null;
  purchasedVbucks: number;
  soldFor: number;
  cost: number;
  feePercent: number;
  status: GiftStatus;
  selectedOfferId: string | null;
  selectedItemName: string | null;
  selectedItemPrice: number | null;
  selectedItemImageUrl: string | null;
  remainingVbucks: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  links: GiftMagicLinkSummary[];
}

export interface GiftOrderInput {
  date: string;
  customer: string;
  purchasedVbucks: number;
  status: GiftStatus;
  soldFor: number;
  epicUsername?: string;
}

export interface PublicGiftOrder {
  publicId: string;
  customer: string;
  purchasedVbucks: number;
  remainingVbucks: number;
  status: GiftStatus;
  expiresAt: string;
  selectedOfferId: string | null;
  selectedItemName: string | null;
  selectedItemPrice: number | null;
  selectedItemImageUrl: string | null;
}

export interface FortniteOffer {
  offerId: string;
  name: string;
  description: string;
  type: string;
  rarity?: string;
  section: {
    id: string;
    sourceName: string;
    displayName: string;
  };
  image: string | null;
  finalPrice: number;
  regularPrice: number;
}

export const GIFT_STATUSES: Array<{ value: GiftStatus; label: string }> = [
  { value: 'waiting_for_selection', label: 'Waiting for Selection' },
  { value: 'selection_submitted', label: 'Selection Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const giftStatusLabel = (status: GiftStatus) =>
  GIFT_STATUSES.find((candidate) => candidate.value === status)?.label || status;
