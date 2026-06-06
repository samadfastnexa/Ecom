import type { LucideIcon } from "lucide-react";

interface ProfileRowProps {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
}

export function ProfileRow({ icon: Icon, label, value }: ProfileRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 py-4 last:border-0">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-wave">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-mist/40">{label}</p>
        <p className="text-mist">{value || "—"}</p>
      </div>
    </div>
  );
}
