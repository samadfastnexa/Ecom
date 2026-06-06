import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { OrderList } from "@/features/orders/components/OrderList";

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrderList />
    </RequireAuth>
  );
}
