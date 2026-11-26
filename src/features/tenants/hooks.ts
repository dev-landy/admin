import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { propertyKeys } from "@/features/properties/hooks";
import { userKeys } from "@/features/users/hooks";
import { correctTenantContractType, fetchTenants, fetchTenant, updateTenant, deleteTenant } from "./api";
import type { CorrectableContractType, TenantDetail, TenantsListParams, UpdateTenantRequest } from "./types";

export const tenantKeys = {
  all: ["tenants"] as const,
  lists: ["tenants", "list"] as const,
  list: (p: TenantsListParams) => [...tenantKeys.lists, p] as const,
  detail: (id: number) => ["tenants", id] as const,
};

export function useTenants(params: TenantsListParams) {
  return useQuery({ queryKey: tenantKeys.list(params), queryFn: () => fetchTenants(params) });
}

export function useTenant(tenantId: number) {
  return useQuery({ queryKey: tenantKeys.detail(tenantId), queryFn: () => fetchTenant(tenantId) });
}

export function useCorrectTenantContractType({ tenantId, userId, propertyId }: TenantDetail) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (contractType: CorrectableContractType) => correctTenantContractType(tenantId, contractType),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) }),
      client.invalidateQueries({ queryKey: tenantKeys.lists }),
      client.invalidateQueries({ queryKey: userKeys.tenants(userId) }),
      client.invalidateQueries({ queryKey: propertyId == null ? propertyKeys.all : propertyKeys.tenantLists(propertyId) }),
    ]),
  });
}

export function useUpdateTenant(tenantId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTenantRequest) => updateTenant(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.all });
      // 임차인 목록을 포함하는 다른 도메인 화면(건물 임차인, 유저 임차인)도 함께 갱신한다.
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTenant(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.all });
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
