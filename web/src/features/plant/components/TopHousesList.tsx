import type { PlantTopHouse } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { Card } from "@/components/ui";

/** Ranked horizontal bars of the highest-collection houses. */
export function TopHousesList({ houses }: { houses: PlantTopHouse[] }) {
  const max = Math.max(1, ...houses.map((h) => h.amount));

  return (
    <Card className="p-5">
      <h3 className="mb-4 font-semibold text-mist">Top houses</h3>
      {houses.length === 0 ? (
        <p className="py-8 text-center text-sm text-mist/50">
          No data for this period.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {houses.map((h, i) => (
            <div key={`${h.house}-${i}`}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="line-clamp-1 text-mist/80">
                  {h.house || "—"}
                </span>
                <span className="shrink-0 font-semibold text-wave">
                  {formatPrice(h.amount)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-wave-gradient"
                  style={{ width: `${(h.amount / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
