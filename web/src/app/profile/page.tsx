import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { ProfileView } from "@/features/profile/components/ProfileView";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileView />
    </RequireAuth>
  );
}
