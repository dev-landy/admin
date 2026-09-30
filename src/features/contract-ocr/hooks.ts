import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchContractDocument, fetchContractDocuments, fetchContractDocumentDraft, fetchContractDocumentFiles,
  fetchLatestContractOcrAnalysis, registerContractDocument, rejectContractDocument, requestContractOcrAnalysis,
} from "./api";
import type {
  ContractDocumentListStatus, ContractDocumentRejectionReason, ContractOcrAnalysis, RegisterContractDocumentRequest,
} from "./types";

export const contractDocumentKeys = {
  all: ["contract-documents"] as const,
  list: (status: ContractDocumentListStatus, page: number, size: number) => ["contract-documents", "list", status, page, size] as const,
  detail: (id: string) => ["contract-documents", id, "detail"] as const,
  files: (id: string) => ["contract-documents", id, "files"] as const,
  draft: (id: string) => ["contract-documents", id, "draft"] as const,
  analysis: (id: string) => ["contract-documents", id, "analysis"] as const,
};

export function useContractDocument(documentId: string) {
  return useQuery({ queryKey: contractDocumentKeys.detail(documentId), queryFn: () => fetchContractDocument(documentId) });
}

export function useContractDocuments(status: ContractDocumentListStatus, page: number, size: number) {
  return useQuery({ queryKey: contractDocumentKeys.list(status, page, size), queryFn: () => fetchContractDocuments(status, page, size) });
}

// 원본 URL의 만료를 고려해 화면 진입과 명시적 새로고침에서 다시 발급한다.
export function useContractDocumentFiles(documentId: string) {
  return useQuery({
    queryKey: contractDocumentKeys.files(documentId), queryFn: () => fetchContractDocumentFiles(documentId),
    staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}

export function useContractDocumentDraft(documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: contractDocumentKeys.draft(documentId), queryFn: () => fetchContractDocumentDraft(documentId),
    enabled, refetchOnWindowFocus: false,
  });
}

export function isContractOcrAnalysisRunning(analysis: ContractOcrAnalysis | null | undefined) {
  return analysis?.status === "QUEUED" || analysis?.status === "PROCESSING";
}

export function useLatestContractOcrAnalysis(documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: contractDocumentKeys.analysis(documentId), queryFn: () => fetchLatestContractOcrAnalysis(documentId), enabled,
    refetchInterval: (query) => enabled && !query.state.error && isContractOcrAnalysisRunning(query.state.data) ? 3_000 : false,
  });
}

export function useRequestContractOcrAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestContractOcrAnalysis,
    retry: false,
    onMutate: (documentId) => queryClient.cancelQueries({ queryKey: contractDocumentKeys.analysis(documentId) }),
    onSuccess: async (analysis, documentId) => {
      await queryClient.cancelQueries({ queryKey: contractDocumentKeys.analysis(documentId) });
      queryClient.setQueryData(contractDocumentKeys.analysis(documentId), analysis);
    },
  });
}

export function useRegisterContractDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, values }: { documentId: string; values: RegisterContractDocumentRequest }) => registerContractDocument(documentId, values),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: contractDocumentKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["tenants"] }),
      queryClient.invalidateQueries({ queryKey: ["users"] }),
      queryClient.invalidateQueries({ queryKey: ["properties"] }),
    ]),
  });
}

export function useRejectContractDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: ContractDocumentRejectionReason }) => rejectContractDocument(documentId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractDocumentKeys.all }),
  });
}
