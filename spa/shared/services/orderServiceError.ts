export type OrderServiceErrorKind = 'authentication' | 'permission' | 'not_found' | 'invalid_input' | 'service';

export class OrderServiceError extends Error {
  readonly kind: OrderServiceErrorKind;

  constructor(kind: OrderServiceErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'OrderServiceError';
  }
}

const errorRecord = (error: unknown): Record<string, unknown> | null =>
  typeof error === 'object' && error !== null ? error as Record<string, unknown> : null;

export const normalizeOrderServiceError = (error: unknown, fallback: string): OrderServiceError => {
  if (error instanceof OrderServiceError) return error;
  const record = errorRecord(error);
  const code = typeof record?.code === 'string' ? record.code : '';
  const status = typeof record?.status === 'number' ? record.status : 0;
  const rawMessage = typeof record?.message === 'string' ? record.message : '';
  const lowerMessage = rawMessage.toLowerCase();

  if (status === 401 || lowerMessage.includes('jwt') || lowerMessage.includes('authenticated'))
    return new OrderServiceError('authentication', 'Authentication is required.');
  if (status === 403 || code === '42501' || lowerMessage.includes('permission'))
    return new OrderServiceError('permission', rawMessage || 'You do not have permission to perform this action.');
  if (code === 'PGRST116' || code === 'P0002' || lowerMessage.includes('not found'))
    return new OrderServiceError('not_found', rawMessage || 'The requested order was not found.');
  if (code === '22023' || code === '23514' || code === '23503')
    return new OrderServiceError('invalid_input', rawMessage || 'The order data is invalid.');
  return new OrderServiceError('service', rawMessage || fallback);
};
