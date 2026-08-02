import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { StaffGuard } from "@/features/auth/components/StaffGuard";
import { LedgerPage } from "@/features/ledger/components/LedgerPage";

export default function ManageLedgerPage() {
  return (
    <RequireAuth>
      <StaffGuard>
        <LedgerPage />
      </StaffGuard>
    </RequireAuth>
  );
}
