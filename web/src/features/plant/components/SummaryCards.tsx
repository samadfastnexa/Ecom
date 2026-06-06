import {
  Droplet,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Home,
  Receipt,
} from "lucide-react";
import type { PlantSummary } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { Card, Skeleton } from "@/components/ui";

interface StatProps {
  icon: typeof Droplet;
  label: string;
  value: string;
  tint: string;
}

function Stat({ icon: Icon, label, value, tint }: StatProps) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-mist/40">{label}</p>
        <p className="truncate text-lg font-bold text-mist">{value}</p>
      </div>
    </Card>
  );
}

export function SummaryCards({
  summary,
  loading,
}: {
  summary: PlantSummary | null;
  loading: boolean;
}) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <Stat
        icon={Droplet}
        label="Bottles"
        value={String(summary.bottles)}
        tint="bg-wave/15 text-wave"
      />
      <Stat
        icon={Wallet}
        label="Collection"
        value={formatPrice(summary.amount)}
        tint="bg-sky-400/15 text-sky-300"
      />
      <Stat
        icon={CheckCircle2}
        label="Received"
        value={formatPrice(summary.paid_amount)}
        tint="bg-emerald-400/15 text-emerald-300"
      />
      <Stat
        icon={AlertCircle}
        label="Pending"
        value={formatPrice(summary.pending ?? summary.unpaid_amount ?? 0)}
        tint="bg-amber-400/15 text-amber-300"
      />
      <Stat
        icon={Home}
        label="Houses"
        value={String(summary.houses)}
        tint="bg-indigo-400/15 text-indigo-300"
      />
      <Stat
        icon={Receipt}
        label="Records"
        value={String(summary.records)}
        tint="bg-fuchsia-400/15 text-fuchsia-300"
      />
    </div>
  );
}
