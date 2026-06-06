"use client";

import { FileSpreadsheet } from "lucide-react";
import type { PlantFilters } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, Skeleton } from "@/components/ui";
import { usePlantRecords } from "../hooks/usePlant";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-400/20 text-emerald-300",
  partial: "bg-amber-400/20 text-amber-300",
  unpaid: "bg-rose-400/20 text-rose-300",
};

export function ExportPreviewTable({ filters }: { filters: PlantFilters }) {
  const { data: records, loading, error } = usePlantRecords(filters);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-rose-400/30 p-6 text-center text-rose-200">
        {error}
      </Card>
    );
  }

  if (!records || records.length === 0) {
    return (
      <Card className="p-10 text-center text-mist/50">
        <FileSpreadsheet size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No records match the selected filters.</p>
      </Card>
    );
  }

  const totalBottles = records.reduce((s, r) => s + r.bottles, 0);
  const totalAmount = records.reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalReceived = records.reduce((s, r) => s + parseFloat(r.paid_amount), 0);
  const totalPending = records.reduce((s, r) => s + parseFloat(r.pending), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-mist/60">
        <span>
          {records.length} record{records.length !== 1 ? "s" : ""} will be
          exported
        </span>
        <span>{formatPrice(totalAmount)} total</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-mist/50">
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">House</th>
              <th className="px-3 py-2.5 font-medium">Customer</th>
              <th className="px-3 py-2.5 font-medium">Cust. Type</th>
              <th className="px-3 py-2.5 font-medium">Bottle Type</th>
              <th className="px-3 py-2.5 text-right font-medium">Btls</th>
              <th className="px-3 py-2.5 text-right font-medium">Unit Price</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-3 py-2.5 text-right font-medium">Received</th>
              <th className="px-3 py-2.5 text-right font-medium">Pending</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => (
              <tr
                key={r.id}
                className="border-b border-white/5 transition hover:bg-white/5"
              >
                <td className="px-3 py-2 text-mist/40">{idx + 1}</td>
                <td className="px-3 py-2 text-mist/80">{r.date}</td>
                <td className="px-3 py-2 font-medium text-mist">{r.house}</td>
                <td className="px-3 py-2 text-mist/80">
                  {r.customer_name ?? "—"}
                </td>
                <td className="px-3 py-2 text-mist/60">
                  {r.customer_type_name ?? "—"}
                </td>
                <td className="px-3 py-2 text-mist/60">
                  {r.bottle_type_name ?? "—"}
                </td>
                <td className="px-3 py-2 text-right font-medium text-wave">
                  {r.bottles}
                </td>
                <td className="px-3 py-2 text-right text-mist/70">
                  {formatPrice(r.unit_price)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-mist">
                  {formatPrice(r.amount)}
                </td>
                <td className="px-3 py-2 text-right text-emerald-300">
                  {formatPrice(r.paid_amount)}
                </td>
                <td className="px-3 py-2 text-right text-amber-300">
                  {formatPrice(r.pending)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs capitalize",
                      STATUS_STYLE[r.payment_status]
                    )}
                  >
                    {r.payment_status}
                  </span>
                </td>
                <td className="max-w-[140px] truncate px-3 py-2 text-mist/50">
                  {r.notes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-white/20 bg-white/5 font-semibold text-mist">
              <td className="px-3 py-2.5 text-xs text-mist/50" colSpan={6}>
                Totals ({records.length} records)
              </td>
              <td className="px-3 py-2.5 text-right text-wave">
                {totalBottles}
              </td>
              <td />
              <td className="px-3 py-2.5 text-right">
                {formatPrice(totalAmount)}
              </td>
              <td className="px-3 py-2.5 text-right text-emerald-300">
                {formatPrice(totalReceived)}
              </td>
              <td className="px-3 py-2.5 text-right text-amber-300">
                {formatPrice(totalPending)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
