import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CheckoutView } from "@/features/checkout/components/CheckoutView";

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutView />
    </RequireAuth>
  );
}
