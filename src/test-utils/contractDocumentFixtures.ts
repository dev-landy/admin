import type { ContractDocument, ContractOcrAnalysis, RegisterContractDocumentRequest } from "@/features/contract-ocr/types";
import type { TenantDetail } from "@/features/tenants/types";

export const DOCUMENT: ContractDocument = {
  documentId: "document-1", uploadId: "upload-1", userId: 1, propertyId: 2,
  status: "PENDING_REVIEW", tenantId: null, createdAt: "2026-09-30T09:00:00", updatedAt: "2026-09-30T09:00:00",
};
export const VALUES: RegisterContractDocumentRequest = {
  contractType: "ROOM", parkingEnabled: false, vehicleNumber: null, name: "홍길동", roomNumber: "101",
  phone: "010-1234-5678", rentPrice: 500000, maintenanceFee: 50000, depositAmount: 10000000,
  paymentDay: 25, billingTiming: "POSTPAID", rentBillingCycle: "MONTHLY", startDate: "2026-09-01", endDate: null,
};
export const ANALYSIS: ContractOcrAnalysis = {
  analysisId: "analysis-1", documentId: DOCUMENT.documentId, status: "QUEUED", deadlineAt: "2026-09-30T10:00:00Z",
  requestedAt: "2026-09-30T09:00:00Z", values: null, warnings: [], failureType: null,
};
export const TENANT: TenantDetail = {
  tenantId: 9, userId: 1, name: "홍길동", roomNumber: "101", phone: "010-1234-5678", contractType: "ROOM",
  parkingEnabled: false, vehicleNumber: null, rentPrice: 500000, maintenanceFee: 50000, depositAmount: 10000000,
  paymentDay: 25, billingTiming: "POSTPAID", rentBillingCycle: "MONTHLY", startDate: "2026-09-01", endDate: null,
  notifyEnabled: true, dueAlimtalkEnabled: true, createdAt: "2026-09-30T09:00:00", updatedAt: "2026-09-30T09:00:00",
};
