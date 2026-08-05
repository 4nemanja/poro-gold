import { supabase } from '../supabase/client';
import type {
  OrderMessage,
  OrderMessageRpcRow,
  SendOrderMessageInput,
} from '../types/order-chat';
import { normalizeOrderServiceError } from './orderServiceError';

const mapOrderMessage = (row: OrderMessageRpcRow): OrderMessage => ({
  id: row.id,
  orderId: row.order_id,
  senderId: row.sender_id,
  senderDisplayName: row.sender_display_name,
  senderAvatarPath: row.sender_avatar_path,
  senderType: row.sender_type,
  message: row.message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  editedAt: row.edited_at,
  readAt: row.read_at,
});

export const getOrderMessageAvatarUrl = (avatarPath: string | null): string | null => {
  if (!avatarPath) return null;
  return supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl;
};

const validateMessage = (message: string): string => {
  const normalized = message.trim();
  if (!normalized) {
    throw normalizeOrderServiceError(
      { code: '22023', message: 'Message cannot be empty' },
      'Message cannot be empty.',
    );
  }
  if (normalized.length > 5000) {
    throw normalizeOrderServiceError(
      { code: '22023', message: 'Message cannot exceed 5000 characters' },
      'Message cannot exceed 5000 characters.',
    );
  }
  return normalized;
};

export async function getOrderMessages(orderId: string): Promise<OrderMessage[]> {
  const { data, error } = await supabase.rpc('get_order_messages', {
    p_order_id: orderId,
  });

  if (error) {
    throw normalizeOrderServiceError(error, 'Unable to load order messages.');
  }

  return ((data ?? []) as OrderMessageRpcRow[])
    .map(mapOrderMessage)
    .sort((left, right) => {
      const timestampDifference = left.createdAt.localeCompare(right.createdAt);
      return timestampDifference || left.id.localeCompare(right.id);
    });
}

export async function sendOrderMessage(
  orderId: string,
  message: string,
): Promise<OrderMessage> {
  const input: SendOrderMessageInput = {
    orderId,
    message: validateMessage(message),
  };
  const { data, error } = await supabase.rpc('send_order_message', {
    p_order_id: input.orderId,
    p_message: input.message,
  });

  if (error) {
    throw normalizeOrderServiceError(error, 'Unable to send the order message.');
  }

  const row = (data as OrderMessageRpcRow[] | null)?.[0];
  if (!row) {
    throw normalizeOrderServiceError(
      { code: 'P0002', message: 'The sent message was not returned' },
      'The sent message was not returned.',
    );
  }

  return mapOrderMessage(row);
}

export async function markOrderMessagesRead(orderId: string): Promise<number> {
  const { data, error } = await supabase.rpc('mark_order_messages_read', {
    p_order_id: orderId,
  });

  if (error) {
    throw normalizeOrderServiceError(error, 'Unable to update message read state.');
  }

  return typeof data === 'number' ? data : Number(data ?? 0);
}
