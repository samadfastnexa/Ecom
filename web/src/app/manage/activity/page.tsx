import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { ActivityLogPage } from "@/features/activities/components/ActivityLogPage";

export default function ManageActivityPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <ActivityLogPage />
      </StaffGuard>
    </RequireAuth>
  );
}
