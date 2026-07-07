import { OrderModal } from "@/components/OrderModal";
import { DeleteOrderButton } from "@/components/DeleteOrderButton";
import type { Order } from "@/lib/types";

// Every order is editable (so a teammate can add supplier prices to API orders
// too). Delete stays limited to manually-added orders - deleting an API order
// is pointless since it would come back on the next sync.
export function OrderRowActions({ order }: { order: Order }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <OrderModal order={order} />
      {order.source === "manual" && <DeleteOrderButton orderId={order.order_id} />}
    </div>
  );
}
