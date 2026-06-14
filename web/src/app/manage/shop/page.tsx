import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { AdminShopPage } from "@/features/shop/components/AdminShopPage";

export default function ManageShopPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <AdminShopPage />
      </StaffGuard>
    </RequireAuth>
  );
}
