export const OWNER_EMAIL = 'admin@porogold.com';

export const canPermanentlyDeleteOrders = (authenticatedEmail?: string | null) =>
  authenticatedEmail?.trim().toLowerCase() === OWNER_EMAIL;
