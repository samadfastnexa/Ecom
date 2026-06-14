import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { AdminComplaintsPage } from "@/features/support/components/AdminComplaintsPage";

export default function ManageComplaintsPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <AdminComplaintsPage />
      </StaffGuard>
    </RequireAuth>
  );
}
