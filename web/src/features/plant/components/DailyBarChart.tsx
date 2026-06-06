import type { PlantDaily } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { Card } from "@/components/ui";

/** Lightweight CSS bar chart of daily collection amount. */
export function DailyBarChart({ daily }: { daily: PlantDaily[] }) {
  const max = Math.max(1, ...daily.map((d) => d.amount));

  return (
    <Card className="p-5">
      <h3 className="mb-4 font-semibold text-mist">Daily collection</h3>
      {daily.length === 0 ? (
        <p className="py-8 text-center text-sm text-mist/50">
          No data for this period.
        </p>
      ) : (
        <div className="flex h-48 items-end gap-1.5 overflow-x-auto pb-1">
          {daily.map((d) => (
            <div
              key={d.date}
              className="group flex min-w-8 flex-1 flex-col items-center gap-2"
              title={`${d.date}: ${formatPrice(d.amount)} · ${d.bottles} bottles`}
            >
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-wave-gradient transition-all duration-300 group-hover:brightness-125"
                  style={{ height: `${Math.max(4, (d.amount / max) * 100)}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-[10px] text-mist/40">
                {d.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
