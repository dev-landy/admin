export type TenantSummary = {
  tenantId: number;
  userId: number;
  name: string;
  roomNumber: number;
  rentPrice: number;
  paymentDay: number;
  startDate: string;
  endDate: string | null;
  notifyEnabled: boolean;
};

export type TenantDetail = TenantSummary & {
  phone: string;
  createdAt: string;
  updatedAt: string;
};

export type TenantsListResponse = {
  tenants: TenantSummary[];
  page: number;
  size: number;
  totalElements: number;
};

export type TenantsListParams = {
  page?: number;
  size?: number;
  userId?: number;
  notifyEnabled?: boolean;
};

export type UpdateTenantRequest = {
  name?: string;
  roomNumber?: number;
  phone?: string;
  rentPrice?: number;
  paymentDay?: number;
  startDate?: string;
  endDate?: string;
};
