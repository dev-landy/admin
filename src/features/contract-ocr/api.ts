import { apiClient } from "@/lib/api/client";
import type {
  ContractDocument, ContractDocumentDecisionResponse, ContractDocumentDraftResponse,
  ContractDocumentFilesResponse, ContractDocumentListResponse, ContractDocumentListStatus,
  ContractOcrAnalysis, ContractStorageRetryResponse, RegisterContractDocumentRequest, RejectContractDocumentRequest,
} from "./types";

const DOCUMENTS_PATH = "/v1/admin/contract-documents";

// 화면의 1-based 페이지를 API의 0-based 페이지로 변환한다.
export async function fetchContractDocuments(status: ContractDocumentListStatus, page: number, size: number) {
  const { data } = await apiClient.get<ContractDocumentListResponse>(DOCUMENTS_PATH, {
    params: { status, page: page - 1, size },
  });
  return data;
}

export async function fetchContractDocument(documentId: string) {
  const { data } = await apiClient.get<ContractDocument>(`${DOCUMENTS_PATH}/${documentId}`);
  return data;
}

export async function fetchContractDocumentFiles(documentId: string) {
  const { data } = await apiClient.get<ContractDocumentFilesResponse>(`${DOCUMENTS_PATH}/${documentId}/files`);
  return data;
}

export async function fetchContractDocumentDraft(documentId: string) {
  const response = await apiClient.get<ContractDocumentDraftResponse>(`${DOCUMENTS_PATH}/${documentId}/draft`);
  return response.status === 204 ? null : response.data;
}

export async function registerContractDocument(documentId: string, values: RegisterContractDocumentRequest) {
  const { data } = await apiClient.post<ContractDocumentDecisionResponse>(`${DOCUMENTS_PATH}/${documentId}/registration`, values);
  return data;
}

export async function rejectContractDocument(documentId: string, request: RejectContractDocumentRequest) {
  const { data } = await apiClient.post<ContractDocumentDecisionResponse>(`${DOCUMENTS_PATH}/${documentId}/rejection`, request);
  return data;
}

export async function requestContractOcrAnalysis(documentId: string) {
  const { data } = await apiClient.post<ContractOcrAnalysis>(`${DOCUMENTS_PATH}/${documentId}/ocr-analyses`);
  return data;
}

export async function fetchLatestContractOcrAnalysis(documentId: string) {
  const response = await apiClient.get<ContractOcrAnalysis>(`${DOCUMENTS_PATH}/${documentId}/ocr-analyses/latest`);
  return response.status === 204 ? null : response.data;
}

export async function retryContractStorage() {
  const { data } = await apiClient.post<ContractStorageRetryResponse>("/v1/admin/contract-uploads/storage-retries");
  return data;
}
