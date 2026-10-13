"use client";
import type { RetentionRange } from "./retention-range";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AdsData, ActivationData, ActivityData, RetentionData, SourceResult } from "./types";
export function useDashboard(enabled: boolean, range?: RetentionRange) {
  const posthog = useQuery({ queryKey: ["dashboard", "posthog"], queryFn: async ({ signal }) => (await apiClient.get<SourceResult<ActivityData>>("/api/dashboard?source=posthog", { baseURL: "", signal, timeout: 55000 })).data, enabled, retry: false, staleTime: 60000, refetchOnWindowFocus: false });
  const retention = useQuery({ queryKey: ["dashboard", "retention", range], queryFn: async ({ signal }) => (await apiClient.get<SourceResult<RetentionData>>(`/api/dashboard?source=retention${range ? `&retentionStart=${encodeURIComponent(range.start)}&retentionEnd=${encodeURIComponent(range.end)}` : ""}`, { baseURL: "", signal, timeout: 55000 })).data, enabled, retry: false, staleTime: 60000, refetchOnWindowFocus: false });
  const activation = useQuery({ queryKey: ["dashboard", "activation"], queryFn: async ({ signal }) => (await apiClient.get<SourceResult<ActivationData>>("/api/dashboard?source=activation", { baseURL: "", signal, timeout: 55000 })).data, enabled, retry: false, staleTime: 60000, refetchOnWindowFocus: false });
  const ads = useQuery({ queryKey: ["dashboard", "googleAds"], queryFn: async ({ signal }) => (await apiClient.get<SourceResult<AdsData>>("/api/dashboard?source=googleAds", { baseURL: "", signal, timeout: 55000 })).data, enabled, retry: false, staleTime: 60000, refetchOnWindowFocus: false });
  return { posthog, retention, activation, ads };
}
