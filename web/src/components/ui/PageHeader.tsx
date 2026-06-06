import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}

export function PageHeader({ title, subtitle, icon: Icon }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-wave-gradient shadow-glow">
          <Icon size={22} className="text-white" />
        </span>
      )}
      <div>
        <h1 className="text-2xl font-bold text-mist">{title}</h1>
        {subtitle && <p className="text-sm text-mist/60">{subtitle}</p>}
      </div>
    </div>
  );
}
