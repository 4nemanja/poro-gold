export type NotificationType = 'order_chat_message';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actorId: string | null;
  actorDisplayName: string | null;
  actorAvatarPath: string | null;
  orderId: string | null;
  orderNumber: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListOptions {
  limit?: number;
  offset?: number;
}

export interface NotificationListResult {
  notifications: Notification[];
  limit: number;
  offset: number;
}

export interface UnreadNotificationCountResult {
  count: number;
}

export interface NotificationRpcRow {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actor_id: string | null;
  actor_display_name: string | null;
  actor_avatar_path: string | null;
  order_id: string | null;
  order_number: string | null;
  metadata: unknown;
  read_at: string | null;
  created_at: string;
}
