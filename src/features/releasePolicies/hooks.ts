import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchReleasePolicies, updateReleasePolicy } from "./api";
import type { UpdateReleasePolicyRequest } from "./types";

export const releasePolicyKeys = {
  all: ["releasePolicies"] as const,
};

export function useReleasePolicies() {
  return useQuery({ queryKey: releasePolicyKeys.all, queryFn: fetchReleasePolicies });
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
