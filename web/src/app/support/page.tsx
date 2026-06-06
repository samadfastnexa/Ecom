import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { SupportView } from "@/features/support/components/SupportView";

export default function SupportPage() {
  return (
    <RequireAuth>
      <SupportView />
    </RequireAuth>
  );
}
