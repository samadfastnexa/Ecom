import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { StaffManagementPage } from "@/features/staff/components/StaffManagementPage";

export default function ManageStaffPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <StaffManagementPage />
      </StaffGuard>
    </RequireAuth>
  );
}
