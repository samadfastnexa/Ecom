import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { RiderManagementPage } from "@/features/riders/components/RiderManagementPage";

export default function ManageRidersPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <RiderManagementPage />
      </StaffGuard>
    </RequireAuth>
  );
}
