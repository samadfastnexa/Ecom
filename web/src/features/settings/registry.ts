import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Tag, Users, GlassWater } from "lucide-react";
import { PricingSettings } from "./components/sections/PricingSettings";
import { CustomerTypesSettings } from "./components/sections/CustomerTypesSettings";
import { BottleTypesSettings } from "./components/sections/BottleTypesSettings";

export interface SettingsSectionEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  Component: ComponentType;
}

/**
 * Central registry of admin settings sections.
 * To add a new settings area: build a <YourSettings /> section component
 * (wrapped in <SettingsSection id="..." />) and append one entry here.
 */
export const SETTINGS_SECTIONS: SettingsSectionEntry[] = [
  { id: "pricing", label: "Pricing", icon: Tag, Component: PricingSettings },
  {
    id: "customer-types",
    label: "Customer Types",
    icon: Users,
    Component: CustomerTypesSettings,
  },
  {
    id: "bottle-types",
    label: "Bottle Types",
    icon: GlassWater,
    Component: BottleTypesSettings,
  },
];
