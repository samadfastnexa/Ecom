import { useAsync } from "@/hooks/useAsync";
import { staffApi } from "@/lib/api";

export function useStaff() {
  return useAsync(() => staffApi.list(), []);
}

export function useStaffHistory(id: number | null) {
  return useAsync(
    () => (id !== null ? staffApi.history(id) : Promise.resolve([])),
    [id]
  );
}
