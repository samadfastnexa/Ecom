"use client";

import { useEffect, useState } from "react";
import { Tag, Check } from "lucide-react";
import { plantApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Button, Input, Skeleton, useToast } from "@/components/ui";
import { usePlantSettings } from "@/features/plant/hooks/usePlant";
import { SettingsSection } from "../SettingsSection";

export function PricingSettings() {
  const { data, loading, reload } = usePlantSettings();
  const notify = useToast();
  const [price, setPrice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !dirty) setPrice(String(data.standard_unit_price));
  }, [data, dirty]);

  const save = async () => {
    setSaving(true);
    try {
      await plantApi.updateSettings(Number(price));
      notify("Standard price updated.");
      setDirty(false);
      reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      id="pricing"
      icon={Tag}
      title="Pricing"
      description="The default per-bottle price used across plant deliveries."
    >
      {loading ? (
        <Skeleton className="h-12 w-64" />
      ) : (
        <div className="max-w-sm">
          <label className="label">Standard price per bottle</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setDirty(true);
              }}
              className="w-40"
            />
            <Button onClick={save} loading={saving} disabled={!dirty}>
              <Check size={16} /> Save
            </Button>
          </div>
          <p className="mt-2 text-xs text-mist/50">
            Customers with a custom price override this. Current:{" "}
            {data ? formatPrice(data.standard_unit_price) : "—"} per bottle.
          </p>
        </div>
      )}
    </SettingsSection>
  );
}
