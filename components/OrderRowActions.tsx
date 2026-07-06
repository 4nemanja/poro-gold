import { OrderModal } from "@/components/OrderModal";
import { DeleteOrderButton } from "@/components/DeleteOrderButton";
import type { Order } from "@/lib/types";

// Edit + delete controls, shown only for manually-added orders.
export function OrderRowActions({ order }: { order: Order }) {
  if (order.source !== "manual") return null;
  return (
    <div className="flex items-center justify-end gap-3">
      <OrderModal order={order} />
      <DeleteOrderButton orderId={order.order_id} />
    </div>
  );
}
