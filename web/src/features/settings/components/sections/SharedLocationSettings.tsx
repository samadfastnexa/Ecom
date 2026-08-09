"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { ledgerApi } from "@/lib/api/ledger";
import { Button, Input, Skeleton, useToast } from "@/components/ui";
import { SettingsSection } from "../SettingsSection";

/**
 * The name attached to a work-place location when an admin shares it out of
 * the mobile app — to a supplier, a courier, a walk-in customer.
 *
 * This is the business-wide default. An individual admin can override it on
 * their own phone (Profile → Work Place Location), which is why the preview
 * below says "unless an admin has set their own".
 */
export function SharedLocationSettings() {
  const notify = useToast();
  const [label, setLabel] = useState("");
  const [saved, setSaved] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ledgerApi
      .business()
      .then((data) => {
        setLabel(data.share_location_label);
        setSaved(data.share_location_label);
        setBusinessName(data.name);
      })
      .catch(() => notify("Failed to load business settings.", "error"))
      .finally(() => setLoading(false));
  }, []);

  const isDirty = label.trim() !== saved;
  // Mirrors the mobile fallback exactly, so what is previewed is what is sent.
  const fallback = `${businessName || "Century Sip"} — work place`;
  const effective = label.trim() || fallback;

  const save = async () => {
    setSaving(true);
    try {
      const result = await ledgerApi.updateBusiness({
        share_location_label: label.trim(),
      });
      setSaved(result.share_location_label);
      setLabel(result.share_location_label);
      notify("Shared location name saved.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      id="shared-location"
      icon={Share2}
      title="Shared Location"
      description="The name attached when an admin shares a work-place location from the mobile app. Recipients see this above the map link."
    >
      {loading ? (
        <Skeleton className="h-28" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="share-location-label"
              className="text-sm font-medium text-mist/80"
            >
              Name shown when sharing
            </label>
            <Input
              id="share-location-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={fallback}
              maxLength={120}
            />
            <p className="text-xs text-mist/50">
              Leave blank to use “{fallback}”.
            </p>
          </div>

          {/* What the recipient actually receives. A share is sent to people
              outside the company, so it is worth seeing before it goes. */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist/50">
              Preview
            </p>
            <p className="text-sm text-mist">{effective}</p>
            <p className="break-all text-sm text-wave/80">
              https://www.google.com/maps/search/?api=1&amp;query=31.475141,74.268326
            </p>
            <p className="mt-2 text-xs text-mist/50">
              Used by every admin, unless one has set their own name on their
              phone.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={!isDirty || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
