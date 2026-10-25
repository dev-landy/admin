/** 월세 귀속월을 기준으로 납부월이 같은 달(PREPAID)인지 다음 달(POSTPAID)인지 나타낸다. */
export type BillingTiming = "PREPAID" | "POSTPAID";

/** 임대료가 매월 청구되는 월세인지, 계약 기간 전체에 한 번 청구되는 일시납인지 나타낸다. */
export type RentChargeFrequency = "MONTHLY" | "ONE_TIME";

export type ContractType = "ROOM" | "COMMERCIAL" | "PARKING" | "OTHERS";
export type ContractStatus = "UPCOMING" | "ACTIVE" | "ENDED";

export type TenantSummary = {
  tenantId: number;
  userId: number;
  propertyId?: number;
  propertyName?: string | null;
  userEmail?: string | null;
  phone?: string | null;
  name: string;
  roomNumber: number | string;
  contractType?: ContractType | null;
  parkingEnabled?: boolean | null;
  vehicleNumber?: string | null;
  rentPrice: number;
  maintenanceFee?: number | null;
  depositAmount?: number | null;
  paymentDay: number;
  // 기존에는 paymentDay만 있었다. PREPAID/POSTPAID는 귀속월 대비 납부월을 정하고,
  // paymentDay와 함께 dueDate를 결정한다.
  billingTiming: BillingTiming;
  // MONTHLY면 rentPrice는 월액, ONE_TIME이면 계약 기간 전체 총액이다.
  rentChargeFrequency: RentChargeFrequency;
  startDate: string;
  endDate: string | null;
  notifyEnabled: boolean;
  // 이 임차인이 납부일 알림톡을 받을지. 임대인이 받는 notifyEnabled와는 수신자도 채널도 다르다.
  dueAlimtalkEnabled: boolean;
};

export type TenantDetail = TenantSummary & {
  propertyAddress?: string | null;
  userPhone?: string | null;
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
  sort?: string;
  page?: number;
  size?: number;
  userId?: number;
  keyword?: string;
  tenantId?: number;
  propertyId?: number;
  contractType?: ContractType;
  contractStatus?: ContractStatus;
  notifyEnabled?: boolean;
  startDate?: string;
  endDate?: string;
};

export type TenantSearchParams = Pick<TenantsListParams, "keyword" | "tenantId" | "propertyId" | "contractType" | "contractStatus" | "notifyEnabled">;

export type UpdateTenantRequest = {
  allowContractOverlap?: boolean;
  parkingEnabled?: boolean;
  vehicleNumber?: string;
  clearVehicleNumber?: boolean;
  name?: string;
  roomNumber?: number | string;
  phone?: string;
  rentPrice?: number;
  maintenanceFee?: number;
  depositAmount?: number;
  paymentDay?: number;
  startDate?: string;
  endDate?: string;
  dueAlimtalkEnabled?: boolean;
};
