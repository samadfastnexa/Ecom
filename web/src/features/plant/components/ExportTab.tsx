"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { PlantFilters } from "@/lib/types";
import { Button, useToast } from "@/components/ui";
import { plantApi } from "@/lib/api";
import { presetRange } from "../dateRange";
import { usePlantCustomerTypes, usePlantBottleTypes } from "../hooks/usePlant";
import { ExportFiltersPanel } from "./ExportFiltersPanel";
import { ExportPreviewTable } from "./ExportPreviewTable";

export function ExportTab() {
  const [filters, setFilters] = useState<PlantFilters>(presetRange("today"));
  const [downloading, setDownloading] = useState(false);
  const notify = useToast();

  const customerTypes = usePlantCustomerTypes(false);
  const bottleTypes = usePlantBottleTypes(false);

  const download = async () => {
    setDownloading(true);
    try {
      await plantApi.exportExcel(filters);
      notify("Excel file downloaded.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed.", "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <ExportFiltersPanel
        filters={filters}
        onChange={setFilters}
        customerTypes={customerTypes.data ?? []}
        bottleTypes={bottleTypes.data ?? []}
      />

      <ExportPreviewTable filters={filters} />

      <div className="flex justify-end">
        <Button onClick={download} loading={downloading}>
          <Download size={18} /> Download Excel
        </Button>
      </div>
    </div>
  );
}
