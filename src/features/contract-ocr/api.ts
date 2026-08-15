import { apiClient } from "@/lib/api/client";
import type {
  ContractOcrAnalysisCompletionRequest,
  ContractOcrDocumentListResponse,
  ContractOcrDocumentSummary,
  ContractOcrDraftResponse,
  ContractOcrListStatus,
  ContractOcrSourceViewResponse,
} from "./types";

// page는 UI 기준 1-based로 받고 API의 0-based로 변환해 보낸다.
export async function fetchContractOcrDocuments(
  status: ContractOcrListStatus,
  page: number,
  size: number,
): Promise<ContractOcrDocumentListResponse> {
  const { data } = await apiClient.get<ContractOcrDocumentListResponse>(
    "/v1/admin/contract-ocr/documents",
    { params: { status, page: page - 1, size } },
  );
  return data;
}

export async function fetchContractOcrDocument(
  documentId: string,
): Promise<ContractOcrDocumentSummary> {
  const { data } = await apiClient.get<ContractOcrDocumentSummary>(
    `/v1/admin/contract-ocr/documents/${documentId}`,
  );
  return data;
}

export async function fetchContractOcrSources(
  documentId: string,
): Promise<ContractOcrSourceViewResponse> {
  const { data } = await apiClient.get<ContractOcrSourceViewResponse>(
    `/v1/admin/contract-ocr/documents/${documentId}/sources`,
  );
  return data;
}

export async function completeContractOcrAnalysis(
  documentId: string,
  body: ContractOcrAnalysisCompletionRequest,
): Promise<void> {
  await apiClient.post(`/v1/admin/contract-ocr/documents/${documentId}/analysis-completion`, body);
}

export async function rejectContractOcrAnalysis(documentId: string): Promise<void> {
  await apiClient.post(`/v1/admin/contract-ocr/documents/${documentId}/rejection`);
}

// 폴백(자동 등록 실패) 문서의 직전 제출 값. 재등록 화면 프리필용.
export async function fetchContractOcrDraft(documentId: string): Promise<ContractOcrDraftResponse> {
  const { data } = await apiClient.get<ContractOcrDraftResponse>(
    `/v1/admin/contract-ocr/documents/${documentId}/draft`,
  );
  return data;
}

export async function retryContractOcrRegistration(
  documentId: string,
  body: ContractOcrAnalysisCompletionRequest,
): Promise<void> {
  await apiClient.post(`/v1/admin/contract-ocr/documents/${documentId}/registration-retry`, body);
}

export async function retryContractOcrAnalysis(documentId: string): Promise<void> {
  await apiClient.post(`/v1/admin/contract-ocr/documents/${documentId}/analysis-retry`);
}
