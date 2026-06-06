import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";

interface SettingsSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Presentational wrapper for one settings group. Add a new settings area by
 * creating a section component and rendering it inside SettingsPage.
 */
export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wave/15 text-wave">
            <Icon size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-mist">{title}</h2>
            {description && (
              <p className="text-sm text-mist/60">{description}</p>
            )}
          </div>
        </div>
        {children}
      </Card>
    </section>
  );
}
