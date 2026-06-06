import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./Card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-4 p-16 text-center">
      <Icon size={48} className="text-wave/50" />
      <div>
        <h2 className="text-xl font-semibold text-mist">{title}</h2>
        {description && <p className="mt-1 text-mist/60">{description}</p>}
      </div>
      {action}
    </Card>
  );
}
