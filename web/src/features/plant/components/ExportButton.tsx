"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import type { PlantFilters } from "@/lib/types";
import { plantApi } from "@/lib/api";
import { Button, useToast } from "@/components/ui";

export function ExportButton({ range }: { range: PlantFilters }) {
  const notify = useToast();
  const [loading, setLoading] = useState(false);

  const exportNow = async () => {
    setLoading(true);
    try {
      await plantApi.exportExcel(range);
      notify("Excel file downloaded.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" onClick={exportNow} loading={loading}>
      <FileSpreadsheet size={18} /> Export Excel
    </Button>
  );
}
