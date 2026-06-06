import { Clock, Package, Truck, CheckCircle2, XCircle } from "lucide-react";
import type { OrderStatus } from "@/lib/types";
import { Chip } from "@/components/ui";

const STATUS: Record<
  OrderStatus,
  { color: string; icon: typeof Clock }
> = {
  Pending: { color: "bg-amber-400/15 text-amber-300", icon: Clock },
  Processing: { color: "bg-sky-400/15 text-sky-300", icon: Package },
  Shipped: { color: "bg-wave/15 text-wave", icon: Truck },
  Delivered: { color: "bg-emerald-400/15 text-emerald-300", icon: CheckCircle2 },
  Cancelled: { color: "bg-rose-400/15 text-rose-300", icon: XCircle },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { color, icon: Icon } = STATUS[status] ?? STATUS.Pending;
  return (
    <Chip className={color}>
      <Icon size={14} /> {status}
    </Chip>
  );
}
