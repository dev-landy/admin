import type { BillingTiming } from "@/features/tenants/types";

export type ContractOcrAnalysisStatus =
  | "QUEUED"
  | "PROCESSING"
  | "STORING"
  | "REVIEW_REQUIRED"
  | "RETRYABLE_FAILED"
  | "FINAL_FAILED";

export type ContractOcrDecisionStatus = "PENDING" | "REGISTERED" | "DISCARDED";

export type ContractOcrListStatus = "pending" | "completed";

export type ContractOcrDocumentSummary = {
  documentId: string;
  jobId: string;
  userId: number;
  propertyId: number;
  analysisStatus: ContractOcrAnalysisStatus;
  decisionStatus: ContractOcrDecisionStatus;
  tenantId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractOcrDocumentListResponse = {
  documents: ContractOcrDocumentSummary[];
  page: number;
  size: number;
  totalElements: number;
};

export type ContractOcrSourceView = {
  sourceId: string;
  sourceIndex: number;
  contentType: string;
  url: string;
  expiresAt: string;
};

export type ContractOcrSourceViewResponse = {
  sources: ContractOcrSourceView[];
};

export type ContractOcrDraftValues = {
  name: string | null;
  roomNumber: string | null;
  phone: string | null;
  rentPrice: number | null;
  maintenanceFee: number | null;
  depositAmount: number | null;
  paymentDay: number | null;
  // 기존에는 paymentDay만 있었다. PREPAID/POSTPAID는 귀속월 대비 납부월을 정하고,
  // paymentDay와 함께 dueDate를 결정한다.
  billingTiming: BillingTiming | null;
  startDate: string | null;
  endDate: string | null;
};

export type ContractOcrAnalysisCompletionRequest = {
  values: ContractOcrDraftValues;
};

export type ContractOcrDraftResponse = {
  documentId: string;
  values: ContractOcrDraftValues;
};
