export type PaymentSource = "MANUAL" | "BANK_AUTO" | "INITIALIZED";

export type Payment = {
  paymentId: number;
  userId: number;
  tenantId: number;
  propertyId?: number;
  propertyName?: string | null;
  userEmail?: string | null;
  tenantName?: string | null;
  roomNumber?: number | string | null;
  billingMonth: string;
  paidAt: string;
  amount: number;
  paymentSource: PaymentSource;
  updatedAt: string;
};

export type DuplicateGroup = {
  tenantId: number;
  tenantName?: string | null;
  roomNumber?: string | number | null;
  propertyId?: number | null;
  propertyName?: string | null;
  userId?: number | null;
  userEmail?: string | null;
  billingMonth: string;
  count: number;
  paymentIds: number[];
};

export type PaymentsListResponse = {
  payments: Payment[];
  page: number;
  size: number;
  totalElements: number;
};

export type DuplicatesResponse = {
  duplicates: DuplicateGroup[];
  page: number;
  size: number;
  totalElements: number;
};

export type PaymentsListParams = { sort?: string;
  page?: number;
  size?: number;
  userId?: number;
  tenantId?: number;
  paymentId?: number;
  propertyId?: number;
  paidFrom?: string;
  paidTo?: string;
  source?: PaymentSource;
  from?: string;
  to?: string;
};

export type DuplicatesParams = { sort?: string; page?: number; size?: number; tenantId?: number };
