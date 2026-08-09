import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { AdminDashboardPage } from "@/features/dashboard/components/AdminDashboardPage";

export default function ManageDashboardPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <AdminDashboardPage />
      </StaffGuard>
    </RequireAuth>
  );
}
