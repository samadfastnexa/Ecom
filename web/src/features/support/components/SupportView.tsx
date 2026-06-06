"use client";

import { LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { useComplaints } from "../hooks/useComplaints";
import { ComplaintForm } from "./ComplaintForm";
import { ComplaintList } from "./ComplaintList";

export function SupportView() {
  const { data: complaints, loading, error, reload } = useComplaints();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={LifeBuoy}
        title="Support"
        subtitle="We usually respond within a tide cycle. 🌊"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ComplaintForm onCreated={reload} />
        <ComplaintList
          complaints={complaints ?? []}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}
