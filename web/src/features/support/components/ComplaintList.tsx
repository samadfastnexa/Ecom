import type { Complaint } from "@/lib/types";
import { Card, Skeleton } from "@/components/ui";
import { ComplaintCard } from "./ComplaintCard";

interface ComplaintListProps {
  complaints: Complaint[];
  loading: boolean;
  error: string | null;
}

export function ComplaintList({
  complaints,
  loading,
  error,
}: ComplaintListProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-mist">Your Messages</h2>

      {loading ? (
        <>
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </>
      ) : error ? (
        <Card className="border-rose-400/30 p-4 text-sm text-rose-200">
          {error}
        </Card>
      ) : complaints.length === 0 ? (
        <Card className="p-8 text-center text-mist/60">No messages yet.</Card>
      ) : (
        complaints.map((c) => <ComplaintCard key={c.id} complaint={c} />)
      )}
    </div>
  );
}
