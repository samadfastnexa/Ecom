import { useAsync } from "@/hooks/useAsync";
import { ridersApi } from "@/lib/api/riders";

export function useRiders() {
  return useAsync(() => ridersApi.list(), []);
}

export function useRiderHistory(id: number | null) {
  return useAsync(() => (id ? ridersApi.history(id) : Promise.resolve([])), [id]);
}
