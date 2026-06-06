import { SettingsGuard } from "@/features/settings/components/SettingsGuard";
import { SettingsPage } from "@/features/settings/components/SettingsPage";

export default function Page() {
  return (
    <SettingsGuard>
      <SettingsPage />
    </SettingsGuard>
  );
}
