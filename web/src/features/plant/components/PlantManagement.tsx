"use client";

import { useState } from "react";
import { Factory, ClipboardList, BarChart3, FileSpreadsheet } from "lucide-react";
import type { PlantFilters } from "@/lib/types";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui";
import { presetRange } from "../dateRange";
import { DateRangeFilter } from "./DateRangeFilter";
import { LedgerTab } from "./LedgerTab";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { ExportTab } from "./ExportTab";

type Tab = "ledger" | "analytics" | "export";

const TABS: { key: Tab; label: string; icon: typeof ClipboardList }[] = [
  { key: "ledger", label: "Ledger", icon: ClipboardList },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "export", label: "Export", icon: FileSpreadsheet },
];

export function PlantManagement() {
  const [tab, setTab] = useState<Tab>("ledger");
  const [range, setRange] = useState<PlantFilters>(presetRange("today"));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Factory}
        title="Plant Management"
        subtitle="Daily bottle deliveries, collection & analytics"
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition",
              tab === key
                ? "border-wave text-wave"
                : "border-transparent text-mist/60 hover:text-mist"
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Shared date-range filter for Ledger + Analytics */}
      {tab !== "export" && (
        <DateRangeFilter
          range={range}
          onChange={(dateRange) =>
            setRange((prev) => ({ ...prev, ...dateRange }))
          }
        />
      )}

      {tab === "ledger" && <LedgerTab range={range} />}
      {tab === "analytics" && <AnalyticsPanel range={range} />}
      {tab === "export" && <ExportTab />}
    </div>
  );
}
