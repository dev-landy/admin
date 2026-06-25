import { apiClient } from "@/lib/api/client";
import type { TenantsListParams, TenantsListResponse, TenantDetail, UpdateTenantRequest } from "./types";

export async function fetchTenants(params: TenantsListParams): Promise<TenantsListResponse> {
  const { data } = await apiClient.get<TenantsListResponse>("/v1/admin/tenants", { params });
  return data;
}

export async function fetchTenant(tenantId: number): Promise<TenantDetail> {
  const { data } = await apiClient.get<TenantDetail>(`/v1/admin/tenants/${tenantId}`);
  return data;
}

export async function updateTenant(tenantId: number, body: UpdateTenantRequest): Promise<TenantDetail> {
  const { data } = await apiClient.patch<TenantDetail>(`/v1/admin/tenants/${tenantId}`, body);
  return data;
}

export async function deleteTenant(tenantId: number): Promise<void> {
  await apiClient.delete(`/v1/admin/tenants/${tenantId}`);
}
