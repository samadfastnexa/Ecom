"use client";

import type { PlantFilters } from "@/lib/types";
import {
  usePlantRecords,
  usePlantSummary,
  usePlantCustomers,
  usePlantCustomerTypes,
  usePlantBottleTypes,
  usePlantSettings,
} from "../hooks/usePlant";
import { SummaryCards } from "./SummaryCards";
import { RecordForm } from "./RecordForm";
import { RecordsTable } from "./RecordsTable";

export function LedgerTab({ range }: { range: PlantFilters }) {
  const settings = usePlantSettings();
  const customers = usePlantCustomers();
  // Active-only types for the "add new record" form
  const customerTypes = usePlantCustomerTypes(true);
  const bottleTypes = usePlantBottleTypes(true);
  // All types (including inactive) for editing existing records
  const allCustomerTypes = usePlantCustomerTypes(false);
  const allBottleTypes = usePlantBottleTypes(false);
  const records = usePlantRecords(range);
  const summary = usePlantSummary(range);

  // Standard price is read here to prefill the form; it's edited in Settings.
  const standardPrice = Number(settings.data?.standard_unit_price ?? 0);

  const reloadLedger = () => {
    records.reload();
    summary.reload();
  };

  return (
    <div className="flex flex-col gap-5">
      <SummaryCards summary={summary.data} loading={summary.loading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RecordForm
            standardPrice={standardPrice}
            customers={customers.data ?? []}
            customerTypes={customerTypes.data ?? []}
            bottleTypes={bottleTypes.data ?? []}
            onCreated={reloadLedger}
          />
        </div>
        <div className="lg:col-span-2">
          <RecordsTable
            records={records.data}
            loading={records.loading}
            error={records.error}
            customers={customers.data ?? []}
            customerTypes={allCustomerTypes.data ?? []}
            bottleTypes={allBottleTypes.data ?? []}
            onChanged={reloadLedger}
          />
        </div>
      </div>
    </div>
  );
}
