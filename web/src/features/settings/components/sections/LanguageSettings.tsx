"use client";

import { useState, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { localizationApi } from "@/lib/api/localization";
import { Button, Skeleton, useToast } from "@/components/ui";
import { SettingsSection } from "../SettingsSection";

const USER_TYPES = [
  { value: "customer",     label: "Customer" },
  { value: "delivery_boy", label: "Rider / Delivery Boy" },
  { value: "staff",        label: "Staff" },
  { value: "admin",        label: "Admin" },
];

export function LanguageSettings() {
  const notify = useToast();
  const [allowed, setAllowed] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localizationApi.getLanguageAccess()
      .then((data) => { setAllowed(data.allowed_user_types); setSaved(data.allowed_user_types); })
      .catch(() => notify("Failed to load language access settings.", "error"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (value: string) => {
    setAllowed((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const isDirty = JSON.stringify([...allowed].sort()) !== JSON.stringify([...saved].sort());

  const save = async () => {
    setSaving(true);
    try {
      const result = await localizationApi.updateLanguageAccess(allowed);
      setSaved(result.allowed_user_types);
      notify("Language access settings saved.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      id="language"
      icon={Languages}
      title="Language Access"
      description="Choose which user types can switch the app language (English / Urdu) on their mobile device."
    >
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {USER_TYPES.map(({ value, label }) => {
            const active = allowed.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggle(value)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-wave/40 bg-wave/10 text-mist"
                    : "border-white/10 bg-white/5 text-mist/60 hover:bg-white/10"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-mist/40 mt-0.5">
                    {active ? "Can switch language on mobile" : "Sees app in English only"}
                  </p>
                </div>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                    active ? "border-wave bg-wave text-white" : "border-white/20 bg-white/5"
                  }`}
                >
                  {active && <Check size={11} strokeWidth={3} />}
                </span>
              </button>
            );
          })}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} loading={saving} disabled={!isDirty}>
              <Check size={15} /> Save
            </Button>
            {isDirty && (
              <button
                onClick={() => setAllowed(saved)}
                className="text-sm text-mist/50 hover:text-mist transition"
              >
                Discard changes
              </button>
            )}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
