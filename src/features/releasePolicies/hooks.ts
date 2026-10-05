import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchReleasePolicies, updateReleasePolicy } from "./api";
import type { ReleasePoliciesListParams, UpdateReleasePolicyRequest } from "./types";

export const releasePolicyKeys = {
  all: ["releasePolicies"] as const,
  list: (params: ReleasePoliciesListParams) => ["releasePolicies", "list", params] as const,
};

export function useReleasePolicies(params: ReleasePoliciesListParams = {}) {
  return useQuery({ queryKey: releasePolicyKeys.list(params), queryFn: () => fetchReleasePolicies(params) });
}

export function useUpdateReleasePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      appReleasePolicyId,
      body,
    }: {
      appReleasePolicyId: number;
      body: UpdateReleasePolicyRequest;
    }) => updateReleasePolicy(appReleasePolicyId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: releasePolicyKeys.all }),
  });
}
