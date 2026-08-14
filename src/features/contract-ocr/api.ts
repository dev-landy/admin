import { apiClient } from "@/lib/api/client";
import type {
  ContractOcrAnalysisCompletionRequest,
  ContractOcrDocumentListResponse,
  ContractOcrDocumentSummary,
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
