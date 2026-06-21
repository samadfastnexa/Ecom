import type { Complaint, ComplaintStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Chip } from "@/components/ui";

const STATUS_STYLE: Record<ComplaintStatus, string> = {
  PENDING: "bg-amber-400/15 text-amber-300",
  IN_PROGRESS: "bg-sky-400/15 text-sky-300",
  RESOLVED: "bg-emerald-400/15 text-emerald-300",
};

export function ComplaintCard({ complaint }: { complaint: Complaint }) {
  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-mist">{complaint.subject}</h3>
        <Chip className={STATUS_STYLE[complaint.status]}>
          {complaint.status.replace("_", " ")}
        </Chip>
      </div>
      <p className="mt-2 text-sm text-mist/70">{complaint.description}</p>
      {complaint.images && complaint.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {complaint.images.map((img) => (
            <a
              key={img.id}
              href={img.image}
              target="_blank"
              rel="noopener noreferrer"
              className="h-16 w-16 overflow-hidden rounded-lg border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image} alt="Attachment" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-mist/40">
        {formatDate(complaint.created_at)}
      </p>
    </div>
  );
}
