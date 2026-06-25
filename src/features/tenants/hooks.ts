import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTenants, fetchTenant, updateTenant, deleteTenant } from "./api";
import type { TenantsListParams, UpdateTenantRequest } from "./types";

export const tenantKeys = {
  all: ["tenants"] as const,
  list: (p: TenantsListParams) => ["tenants", "list", p] as const,
  detail: (id: number) => ["tenants", id] as const,
};

export function useTenants(params: TenantsListParams) {
  return useQuery({ queryKey: tenantKeys.list(params), queryFn: () => fetchTenants(params) });
}

export function useTenant(tenantId: number) {
  return useQuery({ queryKey: tenantKeys.detail(tenantId), queryFn: () => fetchTenant(tenantId) });
}

export function useUpdateTenant(tenantId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTenantRequest) => updateTenant(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
      qc.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTenant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenantKeys.all }),
  });
}
