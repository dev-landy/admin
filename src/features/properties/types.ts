export type PropertySummary = {
  propertyId: number;
  userId: number;
  userEmail: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  activeTenantCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UserPropertySummary = Omit<PropertySummary, "userId" | "userEmail">;

export type PropertiesListResponse = {
  properties: PropertySummary[];
  page: number;
  size: number;
  totalElements: number;
};

export type UserPropertiesResponse = { properties: UserPropertySummary[] };

export type PropertiesListParams = {
  page?: number;
  size?: number;
  userId?: number;
  isDefault?: boolean;
  keyword?: string;
};

export type UpdatePropertyRequest = {
  name: string;
  address?: string | null;
};

export type UpdatePropertyResponse = {
  propertyId: number;
  userId: number;
  name: string;
  address: string | null;
  isDefault: boolean;
};

export type PropertyTenant = {
  tenantId: number;
  userId: number;
  propertyId: number;
  name: string;
  roomNumber: number;
  phone: string;
  rentPrice: number;
  depositAmount: number | null;
  paymentDay: number;
  startDate: string;
  endDate: string | null;
  notifyEnabled: boolean;
};

export type PropertyTenantsResponse = {
  tenants: PropertyTenant[];
  page: number;
  size: number;
  totalElements: number;
};
