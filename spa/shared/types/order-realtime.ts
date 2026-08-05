export type OrderRealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export type OrderChangeEventDatabaseType =
  | 'inserted'
  | 'updated'
  | 'deleted';

export interface OrderRealtimeSignal {
  id: string;
  eventType: OrderRealtimeEventType;
  orderId: string;
  sellerId: string | null;
  occurredAt: string;
}

export interface OrderChangeEventRow {
  id: string;
  order_id: string;
  seller_id: string | null;
  event_type: OrderChangeEventDatabaseType;
  created_at: string;
}
