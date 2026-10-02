import type { BillingCycle, BillingTiming, ContractType } from "@/features/tenants/types";

export type ContractDocumentStatus = "PENDING_REVIEW" | "REGISTERED" | "REJECTED";
export type ContractDocumentListStatus = "PENDING" | "COMPLETED";
export type ContractDocumentRejectionReason = "UNREADABLE" | "NOT_A_CONTRACT" | "EXPIRED" | "DUPLICATE";

export type RejectContractDocumentRequest = {
  reason: ContractDocumentRejectionReason;
  notifyUser: boolean;
};

export type ContractDocument = {
  documentId: string;
  uploadId: string;
  userId: number;
  propertyId: number;
  status: ContractDocumentStatus;
  tenantId?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractDocumentListResponse = {
  documents: ContractDocument[];
  page: number;
  size: number;
  totalElements: number;
};

export type ContractDocumentFile = {
  fileId: string;
  fileIndex: number;
  contentType: string;
  url: string;
  expiresAt: string;
};
export type ContractDocumentFilesResponse = { files: ContractDocumentFile[] };

// OCR 제안과 과거에 보관한 초안은 일부 값이 없을 수 있다.
export type ContractTenantValues = {
  contractType: ContractType;
  parkingEnabled: boolean;
  vehicleNumber: string | null;
  name: string | null;
  roomNumber: string | null;
  phone: string | null;
  rentPrice: number | null;
  maintenanceFee: number | null;
  depositAmount: number | null;
  paymentDay: number | null;
  billingTiming: BillingTiming;
  rentBillingCycle: BillingCycle;
  startDate: string | null;
  endDate: string | null;
};
export type ContractPropertyValues = { name: string; address: string | null };
export type RegisterContractDocumentRequest = ContractTenantValues & {
  allowContractOverlap?: boolean;
  propertyId?: number;
  propertyUpdate?: ContractPropertyValues;
  newProperty?: ContractPropertyValues;
};
export type ContractDraftValues = {
  [Key in keyof ContractTenantValues]?: ContractTenantValues[Key] | null;
};
export type ContractDocumentDraftResponse = { documentId: string; values: ContractDraftValues };
export type ContractDocumentDecisionResponse = {
  documentId: string;
  status: "REGISTERED" | "REJECTED";
  tenantId?: number | null;
  propertyId?: number;
  uploadStatus: string;
};

export type ContractStorageRetryResponse = { attempted: number };

export type ContractOcrAnalysisStatus = "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "TIMED_OUT";
export type ContractOcrAnalysis = {
  analysisId: string;
  documentId: string;
  status: ContractOcrAnalysisStatus;
  deadlineAt: string;
  values?: ContractDraftValues | null;
  warnings: { field: string; code: string; message: string }[];
  failureType?: string | null;
  requestedAt: string;
};
