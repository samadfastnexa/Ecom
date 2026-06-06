"use client";

import { useAsync } from "@/hooks/useAsync";
import { complaintsApi } from "@/lib/api";

export function useComplaints() {
  return useAsync(() => complaintsApi.list(), []);
}
