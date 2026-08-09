import {
  Briefcase,
  Home,
  MapPin,
  Store,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { AddressLabel } from "@/lib/types";

/**
 * Mirrors CustomerAddress.LABEL_CHOICES on the backend exactly — the API
 * stores the key and resolves `display_label` from it, so a value invented
 * here would simply 400.
 */
export const ADDRESS_LABEL_OPTIONS: {
  value: AddressLabel;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "home", label: "Home", icon: Home },
  { value: "office", label: "Office", icon: Briefcase },
  { value: "shop", label: "Shop", icon: Store },
  { value: "warehouse", label: "Warehouse", icon: Warehouse },
  { value: "other", label: "Other", icon: MapPin },
];

/** Icon for a stored label key; anything unrecognised gets the generic pin. */
export function addressLabelIcon(label: string): LucideIcon {
  return ADDRESS_LABEL_OPTIONS.find((o) => o.value === label)?.icon ?? MapPin;
}
