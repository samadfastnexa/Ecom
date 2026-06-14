import { useAsync } from "@/hooks/useAsync";
import { customersApi } from "@/lib/api";

export function useCustomers() {
  return useAsync(() => customersApi.list(), []);
}

export function useCustomerStats(id: number | null) {
  return useAsync(
    () => (id !== null ? customersApi.stats(id) : Promise.resolve(null)),
    [id]
  );
}
