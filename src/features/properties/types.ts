import type { BillingCycle, BillingTiming, ContractType, TenantSearchParams } from "@/features/tenants/types";

export type PropertySummary = {
  propertyId: number;
  userId: number;
  userEmail: string;
  name: string;
  address: string | null;
  activeTenantCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UserPropertySummary = Omit<PropertySummary, "userId" | "userEmail"> & {
  deletedAt?: string | null;
  retainedTenantCount?: number | null;
};

export type PropertiesListResponse = {
  properties: PropertySummary[];
  page: number;
  size: number;
  totalElements: number;
};

export type UserPropertiesResponse = { properties: UserPropertySummary[] };

export type PropertiesListParams = {
  sort?: string;
  page?: number;
  size?: number;
  userId?: number;
  propertyId?: number;
  keyword?: string;
};

export type UpdatePropertyRequest = {
  name: string;
  address?: string | null;
  clearAddress?: boolean;
};

export type UpdatePropertyResponse = {
  propertyId: number;
  userId: number;
  name: string;
  address: string | null;
};

export type PropertyTenant = {
  tenantId: number;
  userId: number;
  propertyId: number;
  propertyName?: string | null;
  userEmail?: string | null;
  name: string;
  roomNumber: number | string;
  contractType?: ContractType;
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

export type PropertyTenantsParams = { page?: number; size?: number; sort?: string } & Omit<TenantSearchParams, "propertyId">;
