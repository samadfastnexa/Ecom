"use client";

import { GlassWater } from "lucide-react";
import { plantApi } from "@/lib/api";
import { TypeListManager } from "../TypeListManager";

export function BottleTypesSettings() {
  return (
    <TypeListManager
      id="bottle-types"
      icon={GlassWater}
      title="Bottle Types"
      description="Types of bottles you deliver (e.g. Labelled, Nestlé, Sprinkle), shown in the Add Delivery dropdown. An optional price overrides the standard price."
      resource={plantApi.bottleTypes}
      namePlaceholder="e.g. Labelled, Nestlé, Sprinkle"
    />
  );
}
