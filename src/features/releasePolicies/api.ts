import { apiClient } from "@/lib/api/client";
import type {
  ReleasePoliciesResponse,
  ReleasePolicy,
  UpdateReleasePolicyRequest,
} from "./types";

export async function fetchReleasePolicies(): Promise<ReleasePoliciesResponse> {
  const { data } = await apiClient.get<ReleasePoliciesResponse>("/v1/admin/release-policies");
  return data;
}

export async function updateReleasePolicy(
  appReleasePolicyId: number,
  body: UpdateReleasePolicyRequest,
): Promise<ReleasePolicy> {
  const { data } = await apiClient.patch<ReleasePolicy>(
    `/v1/admin/release-policies/${appReleasePolicyId}`,
    body,
  );
  return data;
}
