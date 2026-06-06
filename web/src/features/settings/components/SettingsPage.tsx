"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SETTINGS_SECTIONS } from "../registry";

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={SettingsIcon}
        title="Admin Settings"
        subtitle="Manage store-wide configuration"
      />

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* In-page section nav (scales as more sections are added) */}
        <nav className="hidden lg:block">
          <div className="glass sticky top-24 flex flex-col gap-1 p-2">
            {SETTINGS_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mist/70 transition hover:bg-white/10 hover:text-mist"
              >
                <s.icon size={16} /> {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-6">
          {SETTINGS_SECTIONS.map(({ id, Component }) => (
            <Component key={id} />
          ))}
        </div>
      </div>
    </div>
  );
}
