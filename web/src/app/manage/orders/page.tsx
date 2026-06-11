import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { AdminOrdersPage } from "@/features/orders/components/AdminOrdersPage";

export default function ManageOrdersPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <AdminOrdersPage />
      </StaffGuard>
    </RequireAuth>
  );
}
