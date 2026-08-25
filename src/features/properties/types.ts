import type { BillingCycle, BillingTiming } from "@/features/tenants/types";

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
  maintenanceFee?: number | null;
  depositAmount: number | null;
  paymentDay: number;
  // 기존에는 paymentDay만 있었다. PREPAID/POSTPAID는 귀속월 대비 납부월을 정하고,
  // paymentDay와 함께 dueDate를 결정한다.
  billingTiming: BillingTiming;
  rentBillingCycle: BillingCycle;
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
