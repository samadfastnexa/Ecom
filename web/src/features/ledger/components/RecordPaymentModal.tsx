"use client";

import { useEffect, useState } from "react";
import { Check, Download, MessageCircle, Wallet } from "lucide-react";
import type { LedgerEntry, LedgerPaymentMethod } from "@/lib/types";
import { ledgerApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Button, Input, Modal, useToast } from "@/components/ui";
import { canWhatsApp, openWhatsApp, paymentReceivedMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

// Cash-only business, so the method is fixed rather than chosen.
const METHOD: LedgerPaymentMethod = "Cash";

interface RecordPaymentModalProps {
  open: boolean;
  customer: { id: number; name: string; phone: string | null } | null;
  /** Owed-positive balance before the payment, for the "after" preview. */
  currentBalance: number;
  onClose: () => void;
  onRecorded: () => void;
}

export function RecordPaymentModal({
  open, customer, currentBalance, onClose, onRecorded,
}: RecordPaymentModalProps) {
  const notify = useToast();
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recorded, setRecorded] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(""); setEntryDate(""); setReference("");
      setNotes(""); setError(""); setRecorded(null);
    }
  }, [open]);

  if (!customer) return null;

  const value = parseFloat(amount);
  const valid = Number.isFinite(value) && value > 0;
  const balanceAfter = valid ? currentBalance - value : currentBalance;

  const submit = async () => {
    setError("");
    if (!valid) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const entry = await ledgerApi.recordPayment({
        customer_id: customer.id,
        amount: value.toFixed(2),
        payment_method: METHOD,
        entry_date: entryDate || undefined,
        reference: reference.trim(),
        notes: notes.trim(),
      });
      setRecorded(entry);
      notify(`Payment recorded — receipt ${entry.receipt_number}`);
      onRecorded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the payment.");
    } finally {
      setSaving(false);
    }
  };

  // ── Success state: offer the receipt and a WhatsApp confirmation ──────────
  if (recorded) {
    // balance_after is stored credit-positive; the message wants owed.
    const owedAfter = -Number(recorded.balance_after ?? 0);
    return (
      <Modal open={open} onClose={onClose} title="Payment recorded">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-center">
            <Check size={28} className="mx-auto mb-2 text-emerald-300" />
            <p className="text-2xl font-bold text-mist">{formatPrice(recorded.amount)}</p>
            <p className="mt-1 text-sm text-mist/60">
              Receipt <span className="font-semibold text-mist">{recorded.receipt_number}</span>
            </p>
            <p className="mt-2 text-sm text-mist/60">
              {owedAfter > 0
                ? <>Still owing <span className="font-semibold text-rose-300">{formatPrice(owedAfter)}</span></>
                : "Account fully settled."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => ledgerApi.downloadReceipt(recorded.id, recorded.receipt_number)}
            >
              <Download size={15} /> Download receipt
            </Button>
            {canWhatsApp(customer.phone) && (
              <Button
                fullWidth
                onClick={() => openWhatsApp(customer.phone, paymentReceivedMessage({
                  customerName: customer.name,
                  amount: recorded.amount,
                  receiptNumber: recorded.receipt_number,
                  balanceAfter: owedAfter,
                }))}
              >
                <MessageCircle size={15} /> Send on WhatsApp
              </Button>
            )}
          </div>
          <p className="text-xs text-mist/40">
            WhatsApp sends a text confirmation — attach the downloaded PDF yourself
            if the customer wants the receipt document.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Record payment">
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-sm text-mist">{customer.name}</p>
          <p className="text-xs text-mist/50">
            {currentBalance > 0
              ? `Currently owes ${formatPrice(currentBalance)}`
              : currentBalance < 0
                ? `In credit ${formatPrice(Math.abs(currentBalance))}`
                : "Account settled"}
          </p>
        </div>

        <Input
          label="Amount received (PKR)"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          icon={<Wallet size={15} />}
          autoFocus
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Date (optional)"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />
          <Input
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Voucher / slip no."
          />
        </div>

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {valid && (
          <p className="text-sm text-mist/60">
            Balance after this payment:{" "}
            <span className={cn("font-semibold", balanceAfter > 0 ? "text-rose-300" : "text-emerald-300")}>
              {balanceAfter > 0 ? formatPrice(balanceAfter) : "Settled"}
            </span>
          </p>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="mt-1 flex gap-3">
          <Button onClick={submit} loading={saving} disabled={!valid} fullWidth>
            <Check size={15} /> Record payment
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving} fullWidth>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
