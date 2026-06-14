import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { CustomersPage } from "@/features/customers/components/CustomersPage";

export default function ManageCustomersPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <CustomersPage />
      </StaffGuard>
    </RequireAuth>
  );
}
