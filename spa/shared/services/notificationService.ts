import { supabase } from '../supabase/client';
import type {
  Notification,
  NotificationListOptions,
  NotificationListResult,
  NotificationRpcRow,
  UnreadNotificationCountResult,
} from '../types/notifications';
import { normalizeOrderServiceError } from './orderServiceError';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mapNotification = (row: NotificationRpcRow): Notification => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  actorId: row.actor_id,
  actorDisplayName: row.actor_display_name,
  actorAvatarPath: row.actor_avatar_path,
  orderId: row.order_id,
  orderNumber: row.order_number,
  metadata: isRecord(row.metadata) ? row.metadata : {},
  readAt: row.read_at,
  createdAt: row.created_at,
});

export const getNotificationActorAvatarUrl = (avatarPath: string | null): string | null => {
  if (!avatarPath) return null;
  return supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl;
};

const normalizeListOptions = (options?: NotificationListOptions) => {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const offset = options?.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw normalizeOrderServiceError(
      { code: '22023', message: 'Notification limit must be between 1 and 100' },
      'Invalid notification limit.',
    );
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw normalizeOrderServiceError(
      { code: '22023', message: 'Notification offset must be non-negative' },
      'Invalid notification offset.',
    );
  }
  return { limit, offset };
};

export async function getMyNotifications(
  options?: NotificationListOptions,
): Promise<NotificationListResult> {
  const { limit, offset } = normalizeListOptions(options);
  const { data, error } = await supabase.rpc('get_my_notifications', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    throw normalizeOrderServiceError(error, 'Unable to load notifications.');
  }

  return {
    notifications: ((data ?? []) as NotificationRpcRow[]).map(mapNotification),
    limit,
    offset,
  };
}

export async function getMyUnreadNotificationCount(): Promise<UnreadNotificationCountResult> {
  const { data, error } = await supabase.rpc('get_my_unread_notification_count');
  if (error) {
    throw normalizeOrderServiceError(error, 'Unable to load the unread notification count.');
  }
  return { count: Number(data ?? 0) };
}

export async function markNotificationRead(notificationId: string): Promise<string> {
  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });
  if (error) {
    throw normalizeOrderServiceError(error, 'Unable to mark the notification as read.');
  }
  if (typeof data !== 'string') {
    throw normalizeOrderServiceError(
      { message: 'The notification read timestamp was not returned' },
      'The notification read timestamp was not returned.',
    );
  }
  return data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data, error } = await supabase.rpc('mark_all_notifications_read');
  if (error) {
    throw normalizeOrderServiceError(error, 'Unable to mark notifications as read.');
  }
  return Number(data ?? 0);
}
