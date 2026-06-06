"use client";

import { Users } from "lucide-react";
import { plantApi } from "@/lib/api";
import { TypeListManager } from "../TypeListManager";

export function CustomerTypesSettings() {
  return (
    <TypeListManager
      id="customer-types"
      icon={Users}
      title="Customer Types"
      description="Categories shown in the Add Delivery dropdown. An optional price overrides the standard price for that type."
      resource={plantApi.customerTypes}
      namePlaceholder="e.g. Residential, Commercial, Office"
    />
  );
}
