import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteProperty,
  fetchProperties,
  fetchPropertyTenants,
  fetchUserProperties,
  updateProperty,
} from "./api";
import type { PropertiesListParams, PropertyTenantsParams, UpdatePropertyRequest } from "./types";

export const propertyKeys = {
  all: ["properties"] as const,
  list: (params: PropertiesListParams) => ["properties", "list", params] as const,
  user: (userId: number) => ["properties", "user", userId] as const,
  tenants: (propertyId: number, page: number, size: number, filters: PropertyTenantsParams = {}) =>
    ["properties", propertyId, "tenants", page, size, filters] as const,
};

export function useProperties(params: PropertiesListParams, enabled = true) {
  return useQuery({ queryKey: propertyKeys.list(params), queryFn: () => fetchProperties(params), enabled });
}

export function useUserProperties(userId: number) {
  return useQuery({ queryKey: propertyKeys.user(userId), queryFn: () => fetchUserProperties(userId) });
}

export function usePropertyTenants(propertyId: number | null, page: number, size: number, filters: PropertyTenantsParams = {}) {
  return useQuery({
    queryKey: propertyKeys.tenants(propertyId ?? 0, page, size, filters),
    queryFn: () => fetchPropertyTenants(propertyId as number, { ...filters, page, size }),
    enabled: propertyId !== null,
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, body }: { propertyId: number; body: UpdatePropertyRequest }) =>
      updateProperty(propertyId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: propertyKeys.all }),
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: propertyKeys.all }),
  });
}
