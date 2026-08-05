export type OrderMessageSender = 'admin' | 'seller';

export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderDisplayName: string;
  senderAvatarPath: string | null;
  senderType: OrderMessageSender;
  message: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  readAt: string | null;
}

export interface SendOrderMessageInput {
  orderId: string;
  message: string;
}

export interface OrderMessageRpcRow {
  id: string;
  order_id: string;
  sender_id: string;
  sender_display_name: string;
  sender_avatar_path: string | null;
  sender_type: OrderMessageSender;
  message: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  read_at: string | null;
}
