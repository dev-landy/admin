import { apiClient } from "@/lib/api/client";
import type {
  PropertiesListParams,
  PropertiesListResponse,
  PropertyTenantsResponse,
  UpdatePropertyRequest,
  UpdatePropertyResponse,
  UserPropertiesResponse,
} from "./types";

export async function fetchProperties(params: PropertiesListParams): Promise<PropertiesListResponse> {
  const { data } = await apiClient.get<PropertiesListResponse>("/v1/admin/properties", { params });
  return data;
}

export async function fetchUserProperties(userId: number): Promise<UserPropertiesResponse> {
  const { data } = await apiClient.get<UserPropertiesResponse>(`/v1/admin/users/${userId}/properties`);
  return data;
}

export async function fetchPropertyTenants(
  propertyId: number,
  params: { page?: number; size?: number },
): Promise<PropertyTenantsResponse> {
  const { data } = await apiClient.get<PropertyTenantsResponse>(
    `/v1/admin/properties/${propertyId}/tenants`,
    { params },
  );
  return data;
}

export async function updateProperty(
  propertyId: number,
  body: UpdatePropertyRequest,
): Promise<UpdatePropertyResponse> {
  const { data } = await apiClient.patch<UpdatePropertyResponse>(
    `/v1/admin/properties/${propertyId}`,
    body,
  );
  return data;
}

export async function deleteProperty(propertyId: number): Promise<void> {
  await apiClient.delete(`/v1/admin/properties/${propertyId}`);
}
