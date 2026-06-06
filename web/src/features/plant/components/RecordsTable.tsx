"use client";

import { useEffect, useState } from "react";
import { Trash2, Table2, Check, Pencil } from "lucide-react";
import type {
  BottleType,
  CustomerType,
  PlantCustomer,
  PlantRecord,
} from "@/lib/types";
import { plantApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, Skeleton, EmptyState, useToast } from "@/components/ui";
import { EditRecordModal } from "./EditRecordModal";

const STATUS_STYLE: Record<PlantRecord["payment_status"], string> = {
  paid: "bg-emerald-400/15 text-emerald-300",
  partial: "bg-amber-400/15 text-amber-300",
  unpaid: "bg-rose-400/15 text-rose-300",
};

function ReceivedCell({
  record,
  onSaved,
}: {
  record: PlantRecord;
  onSaved: () => void;
}) {
  const notify = useToast();
  const [value, setValue] = useState(record.paid_amount);
  const [busy, setBusy] = useState(false);

  useEffect(() => setValue(record.paid_amount), [record.paid_amount]);

  const dirty = String(value) !== String(record.paid_amount);

  const save = async () => {
    setBusy(true);
    try {
      await plantApi.update(record.id, { paid_amount: Number(value) || 0 });
      onSaved();
    } catch {
      notify("Could not update payment.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        type="number"
        min={0}
        step="0.01"
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && dirty && save()}
        className="input w-24 px-2 py-1 text-right text-sm"
      />
      {dirty && (
        <button
          onClick={save}
          disabled={busy}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-wave-gradient text-white"
          aria-label="Save payment"
        >
          <Check size={14} />
        </button>
      )}
    </div>
  );
}

interface RecordsTableProps {
  records: PlantRecord[] | null;
  loading: boolean;
  error: string | null;
  customers: PlantCustomer[];
  customerTypes: CustomerType[];
  bottleTypes: BottleType[];
  onChanged: () => void;
}

export function RecordsTable({
  records,
  loading,
  error,
  customers,
  customerTypes,
  bottleTypes,
  onChanged,
}: RecordsTableProps) {
  const notify = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<PlantRecord | null>(null);

  const remove = async (r: PlantRecord) => {
    setBusyId(r.id);
    try {
      await plantApi.remove(r.id);
      notify("Record deleted.");
      onChanged();
    } catch {
      notify("Could not delete record.", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
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
      <EmptyState
        icon={Table2}
        title="No records in this period"
        description="Add a delivery or pick a different date range."
      />
    );
  }

  const totals = records.reduce(
    (acc, r) => {
      acc.bottles += r.bottles;
      acc.amount += parseFloat(r.amount);
      acc.received += parseFloat(r.paid_amount);
      acc.pending += parseFloat(r.pending);
      return acc;
    },
    { bottles: 0, amount: 0, received: 0, pending: 0 }
  );

  return (
    <>
      <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-mist/40">
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">House / Customer</th>
              <th className="px-3 py-3 text-right font-medium">Btl</th>
              <th className="px-3 py-3 text-right font-medium">Amount</th>
              <th className="px-3 py-3 text-right font-medium">Received</th>
              <th className="px-3 py-3 text-right font-medium">Pending</th>
              <th className="px-3 py-3 text-center font-medium">Status</th>
              <th className="px-3 py-3 pr-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr
                key={r.id}
                className="border-b border-white/5 transition hover:bg-white/5"
              >
                <td className="whitespace-nowrap px-3 py-3 text-mist/70">
                  {r.date}
                </td>
                <td className="px-3 py-3">
                  <span className="text-mist">{r.house || "—"}</span>
                  {r.customer_name && (
                    <span className="ml-1 text-xs text-mist/40">
                      ({r.customer_name})
                    </span>
                  )}
                  {r.customer_type_name && (
                    <span className="ml-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-wave/80">
                      {r.customer_type_name}
                    </span>
                  )}
                  {r.bottle_type_name && (
                    <span className="ml-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foam/80">
                      {r.bottle_type_name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right text-mist">{r.bottles}</td>
                <td className="px-3 py-3 text-right font-semibold text-mist">
                  {formatPrice(r.amount)}
                </td>
                <td className="px-3 py-3">
                  <ReceivedCell record={r} onSaved={onChanged} />
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right font-medium",
                    parseFloat(r.pending) > 0 ? "text-amber-300" : "text-mist/40"
                  )}
                >
                  {formatPrice(r.pending)}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      STATUS_STYLE[r.payment_status]
                    )}
                  >
                    {r.payment_status}
                  </span>
                </td>
                <td className="px-3 py-3 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditing(r)}
                      disabled={busyId === r.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mist/50 transition hover:bg-white/10 hover:text-wave"
                      aria-label="Edit record"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => remove(r)}
                      disabled={busyId === r.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mist/50 transition hover:bg-rose-500/20 hover:text-rose-300"
                      aria-label="Delete record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 font-bold text-mist">
              <td className="px-3 py-3" colSpan={2}>
                Total
              </td>
              <td className="px-3 py-3 text-right text-wave">{totals.bottles}</td>
              <td className="px-3 py-3 text-right text-wave">
                {formatPrice(totals.amount)}
              </td>
              <td className="px-3 py-3 text-right text-emerald-300">
                {formatPrice(totals.received)}
              </td>
              <td className="px-3 py-3 text-right text-amber-300">
                {formatPrice(totals.pending)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      </Card>

      {editing && (
        <EditRecordModal
          key={editing.id}
          record={editing}
          customers={customers}
          customerTypes={customerTypes}
          bottleTypes={bottleTypes}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </>
  );
}
