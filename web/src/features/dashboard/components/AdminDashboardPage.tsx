"use client";

import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Wallet,
  BadgeCheck,
  AlertCircle,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import type { AdminOrderSummary } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { Button, Card, Chip, PageHeader, Skeleton } from "@/components/ui";
import { useAdminSummary } from "@/features/orders/hooks/useAdminOrders";
import {
  periodCaption,
  periodLabel,
  periodParams,
  type PeriodKey,
  type PeriodParams,
} from "../period";
import { PeriodFilter } from "./PeriodFilter";

// ─── Building blocks ──────────────────────────────────────────────────────────

interface StatProps {
  icon: typeof Clock;
  label: string;
  value: string | number;
  tint: string;
}

function Stat({ icon: Icon, label, value, tint }: StatProps) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-mist/50">{label}</p>
        <p className="text-lg font-bold text-mist">{value}</p>
      </div>
    </Card>
  );
}

function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {children}
    </div>
  );
}

function StatSkeletons({ count }: { count: number }) {
  return (
    <StatGrid>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </StatGrid>
  );
}

function Section({
  title,
  badge,
  caption,
  children,
}: {
  title: string;
  badge: ReactNode;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mist/70">
          {title}
        </h2>
        {badge}
        <span className="text-xs text-mist/40">{caption}</span>
      </div>
      {children}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("today");
  const [params, setParams] = useState<PeriodParams>(() => periodParams("today"));

  const summary = useAdminSummary(params);

  const choosePeriod = (key: PeriodKey) => {
    setPeriodKey(key);
    // Custom inherits the dates already on screen, so the figures don't jump to
    // all-time the instant the inputs appear.
    if (key !== "custom") setParams(periodParams(key));
  };

  const label = periodLabel(periodKey);
  const caption = periodCaption(params);

  // The endpoint keeps the last good payload on failure; showing it next to a
  // rejected range would read as if the range had been applied.
  const stats: AdminOrderSummary | null =
    summary.loading || summary.error ? null : summary.data;

  const periodBadge = <Chip active>{periodKey === "custom" ? caption : label}</Chip>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Orders, payments and revenue at a glance"
      />

      <PeriodFilter
        periodKey={periodKey}
        params={params}
        onSelect={choosePeriod}
        onCustomChange={setParams}
      />

      {summary.error ? (
        <Card className="flex flex-col items-center gap-3 border-rose-400/30 p-8 text-center">
          <AlertTriangle size={32} className="text-rose-300" />
          <div>
            <p className="font-semibold text-rose-200">{summary.error}</p>
            <p className="mt-1 text-sm text-mist/50">
              Pick a valid date range — the start date must not be after the end
              date.
            </p>
          </div>
          <Button variant="ghost" onClick={summary.reload}>
            Try again
          </Button>
        </Card>
      ) : (
        <>
          <Section
            title="Orders & revenue"
            badge={periodBadge}
            caption={periodKey === "custom" ? "Custom range" : caption}
          >
            {stats ? (
              <StatGrid>
                <Stat
                  icon={ClipboardList}
                  label="Total Orders"
                  value={stats.total}
                  tint="bg-sky-400/15 text-sky-300"
                />
                <Stat
                  icon={Wallet}
                  label="Revenue"
                  value={formatPrice(stats.revenue)}
                  tint="bg-indigo-400/15 text-indigo-300"
                />
                <Stat
                  icon={BadgeCheck}
                  label="Paid"
                  value={stats.paid_count}
                  tint="bg-emerald-400/15 text-emerald-300"
                />
                <Stat
                  icon={AlertCircle}
                  label="Unpaid"
                  value={stats.unpaid_count}
                  tint="bg-amber-400/15 text-amber-300"
                />
              </StatGrid>
            ) : (
              <StatSkeletons count={4} />
            )}
          </Section>

          <Section
            title="Status breakdown"
            badge={periodBadge}
            caption={periodKey === "custom" ? "Custom range" : caption}
          >
            {stats ? (
              <StatGrid>
                <Stat
                  icon={Clock}
                  label="Pending"
                  value={stats.pending}
                  tint="bg-amber-400/15 text-amber-300"
                />
                <Stat
                  icon={Package}
                  label="Processing"
                  value={stats.processing}
                  tint="bg-sky-400/15 text-sky-300"
                />
                <Stat
                  icon={Truck}
                  label="Shipped"
                  value={stats.shipped}
                  tint="bg-wave/15 text-wave"
                />
                <Stat
                  icon={CheckCircle2}
                  label="Delivered"
                  value={stats.delivered}
                  tint="bg-emerald-400/15 text-emerald-300"
                />
                <Stat
                  icon={XCircle}
                  label="Cancelled"
                  value={stats.cancelled}
                  tint="bg-rose-400/15 text-rose-300"
                />
              </StatGrid>
            ) : (
              <StatSkeletons count={5} />
            )}
          </Section>

          <Section
            title="Today"
            badge={
              <Chip className="bg-white/10 text-mist/70">
                <CalendarDays size={13} /> Fixed reference
              </Chip>
            }
            caption="Always today, whichever period is selected above"
          >
            {stats ? (
              <StatGrid>
                <Stat
                  icon={ClipboardList}
                  label="Today's Orders"
                  value={stats.today_orders}
                  tint="bg-wave/15 text-wave"
                />
                <Stat
                  icon={Wallet}
                  label="Today's Revenue"
                  value={formatPrice(stats.today_revenue)}
                  tint="bg-indigo-400/15 text-indigo-300"
                />
              </StatGrid>
            ) : (
              <StatSkeletons count={2} />
            )}
          </Section>
        </>
      )}
    </div>
  );
}
