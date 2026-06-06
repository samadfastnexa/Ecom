import type { Order } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/format";
import { ProductImage } from "@/features/products/components/ProductImage";
import { OrderStatusBadge } from "./OrderStatusBadge";

export function OrderCard({ order }: { order: Order }) {
  return (
    <div className="glass p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="font-semibold text-mist">Order #{order.id}</p>
          <p className="text-xs text-mist/50">{formatDate(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex flex-col gap-3 py-4">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <ProductImage
              image={item.product_details?.image ?? null}
              alt={item.product_details?.name ?? "Product"}
              className="h-12 w-12 shrink-0 rounded-lg"
              iconSize={18}
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm text-mist">
                {item.product_details?.name || "Product"}
              </p>
              <p className="text-xs text-mist/50">
                Qty {item.quantity} · {formatPrice(item.price)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-sm text-mist/60">
          {order.payment_method}
          {order.assigned_delivery_boy_name &&
            ` · Rider: ${order.assigned_delivery_boy_name}`}
        </span>
        <span className="font-bold text-wave">
          {formatPrice(order.total_price)}
        </span>
      </div>
    </div>
  );
}
