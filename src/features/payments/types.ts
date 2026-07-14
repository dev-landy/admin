export type PaymentSource = "MANUAL" | "BANK_AUTO" | "INITIALIZED";

export type Payment = {
  paymentId: number;
  userId: number;
  tenantId: number;
  billingMonth: string;
  paidAt: string;
  amount: number;
  paymentSource: PaymentSource;
  updatedAt: string;
};

export type DuplicateGroup = {
  tenantId: number;
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

export type PaymentsListParams = {
  page?: number;
  size?: number;
  userId?: number;
  tenantId?: number;
  source?: PaymentSource;
  from?: string;
  to?: string;
};
