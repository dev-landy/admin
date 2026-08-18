/** 월세 귀속월을 기준으로 납부월이 같은 달(PREPAID)인지 다음 달(POSTPAID)인지 나타낸다. */
export type BillingTiming = "PREPAID" | "POSTPAID";

export type TenantSummary = {
  tenantId: number;
  userId: number;
  name: string;
  roomNumber: number;
  rentPrice: number;
  maintenanceFee?: number | null;
  depositAmount?: number | null;
  paymentDay: number;
  // 기존에는 paymentDay만 있었다. PREPAID/POSTPAID는 귀속월 대비 납부월을 정하고,
  // paymentDay와 함께 dueDate를 결정한다.
  billingTiming: BillingTiming;
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
  startDate?: string;
  endDate?: string;
};

export type UpdateTenantRequest = {
  name?: string;
  roomNumber?: number | string;
  phone?: string;
  rentPrice?: number;
  maintenanceFee?: number;
  depositAmount?: number;
  paymentDay?: number;
  startDate?: string;
  endDate?: string;
};
