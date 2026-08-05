type ErrorRecord = Record<string, unknown>;

const asRecord = (value: unknown): ErrorRecord =>
  typeof value === 'object' && value !== null ? value as ErrorRecord : {};

export const normalizeKnowledgeBaseServiceError = (
  error: unknown,
  fallback: string,
): Error => {
  const value = asRecord(error);
  const message = typeof value.message === 'string' ? value.message : fallback;

  if (message.toLowerCase().includes('jwt')) return new Error('Authentication is required.');
  if (value.code === '42501') return new Error('Knowledge Base access denied.');
  if (value.code === '23505') return new Error('That Knowledge Base item already exists.');
  if (value.code === '23503') return new Error(message || 'This item is still referenced.');
  if (value.code === 'P0002') return new Error('Knowledge Base item not found.');
  return new Error(message);
};
