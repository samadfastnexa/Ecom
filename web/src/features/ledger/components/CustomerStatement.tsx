"use client";

import { useState } from "react";
import {
  ArrowLeft, Download, MessageCircle, Package, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import type { StatementFilters } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ledgerApi } from "@/lib/api";
import { Button, Card, Skeleton, useToast } from "@/components/ui";
import { balanceReminderMessage, canWhatsApp, openWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import { useStatement } from "../hooks/useLedger";
import { StatementTable } from "./StatementTable";
import { RecordPaymentModal } from "./RecordPaymentModal";

function Stat({
  icon: Icon, label, value, tint, sub,
}: {
  icon: typeof Wallet; label: string; value: string; tint: string; sub?: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tint)}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-mist/50">{label}</p>
        <p className="truncate text-lg font-bold text-mist">{value}</p>
        {sub && <p className="text-xs text-mist/40">{sub}</p>}
      </div>
    </Card>
  );
}

interface CustomerStatementProps {
  userId: number;
  onBack: () => void;
}

export function CustomerStatement({ userId, onBack }: CustomerStatementProps) {
  const notify = useToast();
  const [filters, setFilters] = useState<StatementFilters>({});
  const [payOpen, setPayOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const statement = useStatement(userId, filters);

  if (statement.loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (statement.error || !statement.data) {
    return (
      <Card className="border-rose-400/30 p-6 text-center text-rose-200">
        {statement.error || "Could not load this statement."}
      </Card>
    );
  }

  const data = statement.data;
  const { customer } = data;
  const balance = Number(data.closing_balance);

  const download = async () => {
    setDownloading(true);
    try {
      await ledgerApi.downloadStatement(userId, customer.username, filters);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Download failed.", "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm text-mist/60 transition hover:text-mist"
      >
        <ArrowLeft size={15} /> Back to receivables
      </button>

      {/* Customer header */}
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-wave-gradient text-xl font-bold text-white">
          {customer.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold text-mist">{customer.name}</h2>
          <p className="text-sm text-mist/50">
            {customer.customer_code && <>Code <span className="font-medium text-mist/70">{customer.customer_code}</span> · </>}
            {customer.phone || "No phone"}
          </p>
          {customer.address && <p className="truncate text-xs text-mist/40">{customer.address}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPayOpen(true)}>
            <Wallet size={15} /> Record payment
          </Button>
          <Button variant="ghost" onClick={download} loading={downloading}>
            <Download size={15} /> Statement PDF
          </Button>
          {canWhatsApp(customer.phone) && (
            <Button
              variant="ghost"
              onClick={() => openWhatsApp(customer.phone, balanceReminderMessage({
                customerName: customer.name,
                balance,
                bottlesHeld: data.closing_stock,
              }))}
            >
              <MessageCircle size={15} /> WhatsApp
            </Button>
          )}
        </div>
      </Card>

      {/* Headline figures */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Wallet}
          label={balance > 0 ? "Outstanding" : balance < 0 ? "In credit" : "Balance"}
          value={balance === 0 ? "Settled" : formatPrice(Math.abs(balance))}
          tint={balance > 0 ? "bg-rose-400/15 text-rose-300" : "bg-emerald-400/15 text-emerald-300"}
        />
        <Stat
          icon={TrendingDown} label="Charged" value={formatPrice(data.totals.debit)}
          tint="bg-sky-400/15 text-sky-300" sub="this period"
        />
        <Stat
          icon={TrendingUp} label="Received" value={formatPrice(data.totals.credit)}
          tint="bg-emerald-400/15 text-emerald-300" sub="this period"
        />
        <Stat
          icon={Package} label="Bottles held" value={String(data.closing_stock)}
          tint="bg-wave/15 text-wave"
          sub={`opened at ${data.opening_stock}`}
        />
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <span className="text-xs uppercase tracking-wide text-mist/40">Period</span>
        <input
          type="date"
          className="input py-1.5 text-sm"
          value={filters.start || ""}
          onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value || undefined }))}
        />
        <span className="text-mist/30">→</span>
        <input
          type="date"
          className="input py-1.5 text-sm"
          value={filters.end || ""}
          onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value || undefined }))}
        />
        {(filters.start || filters.end || filters.source) && (
          <button
            onClick={() => setFilters({})}
            className="text-sm text-mist/50 underline transition hover:text-mist"
          >
            Clear
          </button>
        )}
        <div className="ml-auto flex gap-1.5">
          {(["shop", "plant", "manual"] as const).map((src) => (
            <button
              key={src}
              onClick={() => setFilters((f) => ({ ...f, source: f.source === src ? undefined : src }))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
                filters.source === src
                  ? "border-wave bg-wave/20 text-wave"
                  : "border-white/10 text-mist/50 hover:text-mist"
              )}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      <StatementTable statement={data} onChanged={statement.reload} />

      <RecordPaymentModal
        open={payOpen}
        customer={{ id: userId, name: customer.name, phone: customer.phone }}
        currentBalance={balance}
        onClose={() => setPayOpen(false)}
        onRecorded={statement.reload}
      />
    </div>
  );
}
