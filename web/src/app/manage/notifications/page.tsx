import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { SendNotificationPage } from "@/features/notifications/components/SendNotificationPage";

export default function ManageNotificationsPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <SendNotificationPage />
      </StaffGuard>
    </RequireAuth>
  );
}
