"use client";

import { useState, useEffect, useCallback } from "react";
import { Smartphone, Eye, EyeOff, Pencil, PencilOff, Check } from "lucide-react";
import { staffApi } from "@/lib/api/staff";
import type { MobileProfileConfig } from "@/lib/types";
import { Button, Skeleton, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { SettingsSection } from "../SettingsSection";

type UserType = "delivery_boy" | "staff";

const USER_TYPE_LABELS: Record<UserType, string> = {
  delivery_boy: "Rider",
  staff: "Staff",
};

const FIELD_ORDER = [
  "first_name", "last_name", "phone_number", "address", "emergency_contact",
  "employee_id", "designation", "department",
  "vehicle_type", "vehicle_number",
  "cnic_number", "date_of_birth", "date_of_joining", "salary", "remarks",
];

const FIELD_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Personal", keys: ["first_name", "last_name", "phone_number", "address", "emergency_contact"] },
  { label: "Employment", keys: ["employee_id", "designation", "department", "cnic_number", "date_of_birth", "date_of_joining", "salary", "remarks"] },
  { label: "Rider", keys: ["vehicle_type", "vehicle_number"] },
];

function ToggleCell({
  value,
  onChange,
  icon: Icon,
  offIcon: OffIcon,
  activeClass,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  icon: typeof Eye;
  offIcon: typeof EyeOff;
  activeClass: string;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border transition",
        value
          ? cn("border-transparent", activeClass)
          : "border-white/10 bg-white/5 text-mist/30 hover:text-mist/60"
      )}
    >
      {value ? <Icon size={14} /> : <OffIcon size={14} />}
    </button>
  );
}

export function MobileProfileSettings() {
  const notify = useToast();
  const [activeTab, setActiveTab] = useState<UserType>("delivery_boy");
  const [configs, setConfigs] = useState<Record<string, MobileProfileConfig> | null>(null);
  const [dirty, setDirty] = useState<Record<string, Partial<{ visible: boolean; editable: boolean }>>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffApi.getMobileProfileConfig()
      .then(setConfigs)
      .catch(() => notify("Failed to load profile config.", "error"))
      .finally(() => setLoading(false));
  }, []);

  const currentConfig: MobileProfileConfig = Object.fromEntries(
    Object.entries(configs?.[activeTab] ?? {}).map(([k, base]) => {
      const override = dirty[k] ?? {};
      return [k, { ...base, ...override } as import("@/lib/types").MobileProfileFieldConfig];
    })
  );

  const setField = useCallback((key: string, prop: "visible" | "editable", val: boolean) => {
    setDirty((prev) => ({
      ...prev,
      [key]: { ...prev[key], [prop]: val },
    }));
  }, []);

  // Switching tabs discards unsaved dirty state
  const switchTab = (t: UserType) => {
    setDirty({});
    setActiveTab(t);
  };

  const save = async () => {
    if (!Object.keys(dirty).length) return;
    setSaving(true);
    try {
      const result = await staffApi.updateMobileProfileConfig(activeTab, dirty);
      setConfigs((prev) => ({ ...prev, [activeTab]: result.fields }));
      setDirty({});
      notify("Saved.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const hasDirty = Object.keys(dirty).length > 0;

  return (
    <SettingsSection
      id="mobile-profile"
      icon={Smartphone}
      title="Mobile Profile Fields"
      description="Control which fields riders and staff can see and edit on their mobile profile screen."
    >
      {/* Tab selector */}
      <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 w-fit">
        {(["delivery_boy", "staff"] as UserType[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={cn(
              "rounded-lg px-5 py-1.5 text-sm font-medium transition",
              activeTab === t ? "bg-wave/20 text-wave" : "text-mist/60 hover:text-mist"
            )}
          >
            {USER_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="mb-2 flex items-center gap-4 text-xs text-mist/40 px-1">
            <span className="flex-1">Field</span>
            <span className="flex items-center gap-1 w-20 justify-center"><Eye size={11} /> Visible</span>
            <span className="flex items-center gap-1 w-20 justify-center"><Pencil size={11} /> Editable</span>
          </div>

          {FIELD_GROUPS.map((group) => {
            // hide Rider group for staff tab
            if (group.label === "Rider" && activeTab === "staff") return null;
            const groupFields = group.keys.filter((k) => currentConfig[k]);
            if (!groupFields.length) return null;
            return (
              <div key={group.label} className="mb-4">
                <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-mist/30">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1 rounded-xl border border-white/10 overflow-hidden">
                  {groupFields.map((key, idx) => {
                    const field = currentConfig[key];
                    if (!field) return null;
                    const isDirtyField = key in dirty;
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center gap-4 px-4 py-2.5 transition",
                          idx % 2 === 0 ? "bg-white/5" : "bg-transparent",
                          isDirtyField && "bg-wave/5"
                        )}
                      >
                        <span className={cn("flex-1 text-sm", field.visible ? "text-mist" : "text-mist/40")}>
                          {field.label}
                          {isDirtyField && (
                            <span className="ml-2 text-[10px] text-wave/70">unsaved</span>
                          )}
                        </span>
                        <div className="w-20 flex justify-center">
                          <ToggleCell
                            value={field.visible}
                            onChange={(v) => {
                              setField(key, "visible", v);
                              // if hiding, also set editable=false
                              if (!v) setField(key, "editable", false);
                            }}
                            icon={Eye}
                            offIcon={EyeOff}
                            activeClass="bg-emerald-400/15 text-emerald-300"
                          />
                        </div>
                        <div className="w-20 flex justify-center">
                          <ToggleCell
                            value={field.editable && field.visible}
                            onChange={(v) => setField(key, "editable", v)}
                            icon={Pencil}
                            offIcon={PencilOff}
                            activeClass="bg-wave/20 text-wave"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} loading={saving} disabled={!hasDirty}>
              <Check size={15} /> Save {USER_TYPE_LABELS[activeTab]} config
            </Button>
            {hasDirty && (
              <button onClick={() => setDirty({})} className="text-sm text-mist/50 hover:text-mist transition">
                Discard changes
              </button>
            )}
          </div>
        </>
      )}
    </SettingsSection>
  );
}
