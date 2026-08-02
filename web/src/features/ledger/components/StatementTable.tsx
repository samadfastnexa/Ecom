"use client";

import { useState } from "react";
import { Ban, Download } from "lucide-react";
import type { LedgerEntry, LedgerStatement } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ledgerApi } from "@/lib/api";
import { Button, Card, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";

const SOURCE_TINT: Record<LedgerEntry["source"], string> = {
  shop: "bg-sky-400/15 text-sky-300",
  plant: "bg-wave/15 text-wave",
  manual: "bg-white/10 text-mist/60",
};

/** Dash for nothing, matching the printed ledger. */
function amount(value: string | null) {
  if (!value || Number(value) === 0) return <span className="text-mist/25">–</span>;
  return formatPrice(value);
}

interface StatementTableProps {
  statement: LedgerStatement;
  onChanged: () => void;
}

export function StatementTable({ statement, onChanged }: StatementTableProps) {
  const notify = useToast();
  const [voidingId, setVoidingId] = useState<number | null>(null);

  const voidEntry = async (entry: LedgerEntry) => {
    const reason = window.prompt(
      `Void this entry? It stays on the statement and a reversing line is added.\n\nReason:`
    );
    if (!reason?.trim()) return;

    setVoidingId(entry.id);
    try {
      await ledgerApi.voidEntry(entry.id, reason.trim());
      notify("Entry voided.");
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not void the entry.", "error");
    } finally {
      setVoidingId(null);
    }
  };

  const { totals } = statement;

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-mist/40">
              <th className="px-3 py-2.5 font-medium">Sr</th>
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Bill</th>
              <th className="px-3 py-2.5 font-medium">Items</th>
              <th className="px-3 py-2.5 text-right font-medium">Price</th>
              <th className="px-3 py-2.5 text-right font-medium">Qty</th>
              <th className="px-3 py-2.5 text-right font-medium">Empty</th>
              <th className="px-3 py-2.5 text-right font-medium">Debit</th>
              <th className="px-3 py-2.5 text-right font-medium">Credit</th>
              <th className="px-3 py-2.5 text-right font-medium">Balance</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {/* Opening line, exactly as the printed ledger shows arrears */}
            <tr className="border-b border-white/5 text-mist/50">
              <td className="px-3 py-2" />
              <td className="px-3 py-2">
                {statement.period.start || "Beginning"}
              </td>
              <td className="px-3 py-2 italic" colSpan={7}>
                Arrears brought forward — stock {statement.opening_stock}
              </td>
              <td className="px-3 py-2 text-right font-semibold">
                {formatPrice(statement.opening_balance)}
              </td>
              <td className="px-3 py-2" />
            </tr>

            {statement.results.map((entry, i) => (
              <tr
                key={entry.id}
                className={cn(
                  "border-b border-white/5 hover:bg-white/5",
                  entry.is_reversed && "opacity-50"
                )}
              >
                <td className="px-3 py-2 text-mist/40">{i + 1}</td>
                <td className="whitespace-nowrap px-3 py-2 text-mist/70">{entry.entry_date}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="text-mist">{entry.document_label}</span>
                  <span className={cn("ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold", SOURCE_TINT[entry.source])}>
                    {entry.source}
                  </span>
                </td>
                <td className="px-3 py-2 text-mist/80">
                  {entry.item_label || entry.description}
                  {entry.is_reversed && (
                    <span className="ml-2 rounded bg-rose-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                      VOIDED
                    </span>
                  )}
                  {entry.is_reversal && (
                    <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                      REVERSAL
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-mist/60">{amount(entry.unit_price)}</td>
                <td className="px-3 py-2 text-right text-mist/60">
                  {entry.quantity ? Number(entry.quantity) : <span className="text-mist/25">–</span>}
                </td>
                <td className="px-3 py-2 text-right text-mist/60">
                  {entry.bottles_in || <span className="text-mist/25">–</span>}
                </td>
                <td className="px-3 py-2 text-right text-rose-300">{amount(entry.debit)}</td>
                <td className="px-3 py-2 text-right text-emerald-300">{amount(entry.credit)}</td>
                <td className="px-3 py-2 text-right font-medium text-mist">
                  {formatPrice(entry.running_balance ?? "0")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {entry.receipt_number && !entry.is_reversed && (
                      <button
                        onClick={() => ledgerApi.downloadReceipt(entry.id, entry.receipt_number)}
                        className="rounded p-1.5 text-mist/40 transition hover:bg-white/10 hover:text-wave"
                        title="Download receipt"
                      >
                        <Download size={14} />
                      </button>
                    )}
                    {entry.can_void && (
                      <button
                        onClick={() => voidEntry(entry)}
                        disabled={voidingId === entry.id}
                        className="rounded p-1.5 text-mist/40 transition hover:bg-white/10 hover:text-rose-300 disabled:opacity-40"
                        title="Void this entry"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {statement.results.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-sm text-mist/40">
                  No entries in this period.
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr className="border-t border-white/10 font-bold text-mist">
              <td className="px-3 py-3" colSpan={5}>Totals</td>
              <td className="px-3 py-3 text-right">{Number(totals.quantity || 0)}</td>
              <td className="px-3 py-3 text-right">{totals.bottles_in}</td>
              <td className="px-3 py-3 text-right text-rose-300">{formatPrice(totals.debit)}</td>
              <td className="px-3 py-3 text-right text-emerald-300">{formatPrice(totals.credit)}</td>
              <td className="px-3 py-3 text-right">{formatPrice(statement.closing_balance)}</td>
              <td className="px-3 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
