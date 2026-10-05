import { apiClient } from "@/lib/api/client";
import type {
  ReleasePoliciesResponse,
  ReleasePoliciesListParams,
  ReleasePolicy,
  UpdateReleasePolicyRequest,
} from "./types";

export async function fetchReleasePolicies(params: ReleasePoliciesListParams = {}): Promise<ReleasePoliciesResponse> {
  const { data } = await apiClient.get<ReleasePoliciesResponse>("/v1/admin/release-policies", { params });
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
