import { apiClient } from "@/lib/api/client";
import type { ReleasePoliciesResponse } from "./types";

export async function fetchReleasePolicies(): Promise<ReleasePoliciesResponse> {
  const { data } = await apiClient.get<ReleasePoliciesResponse>("/v1/admin/release-policies");
  return data;
}
