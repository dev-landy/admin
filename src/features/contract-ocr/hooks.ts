import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OPERATIONAL_QUERY_OPTIONS } from "@/lib/query/query-policy";
import {
  fetchContractDocument, fetchContractDocuments, fetchContractDocumentDraft, fetchContractDocumentFiles,
  fetchLatestContractOcrAnalysis, registerContractDocument, rejectContractDocument, requestContractOcrAnalysis, retryContractStorage,
} from "./api";
import type {
  ContractDocumentListFilters, ContractDocumentListStatus, ContractOcrAnalysis, RegisterContractDocumentRequest, RejectContractDocumentRequest,
} from "./types";

export const contractDocumentKeys = {
  all: ["contract-documents"] as const,
  list: (status: ContractDocumentListStatus, page: number, size: number, filters: ContractDocumentListFilters = {}) => ["contract-documents", "list", status, page, size, filters] as const,
  detail: (id: string) => ["contract-documents", id, "detail"] as const,
  files: (id: string) => ["contract-documents", id, "files"] as const,
  draft: (id: string) => ["contract-documents", id, "draft"] as const,
  analysis: (id: string) => ["contract-documents", id, "analysis"] as const,
};

export function useContractDocument(documentId: string) {
  return useQuery({ queryKey: contractDocumentKeys.detail(documentId), queryFn: () => fetchContractDocument(documentId) });
}

export function useContractDocuments(status: ContractDocumentListStatus, page: number, size: number, filters: ContractDocumentListFilters = {}) {
  return useQuery({ queryKey: contractDocumentKeys.list(status, page, size, filters), queryFn: () => fetchContractDocuments(status, page, size, filters), ...OPERATIONAL_QUERY_OPTIONS });
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
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
    ]),
  });
}

export function useRejectContractDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, ...request }: { documentId: string } & RejectContractDocumentRequest) => rejectContractDocument(documentId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractDocumentKeys.all }),
  });
}

export function useRetryContractStorage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: retryContractStorage,
    // 응답이 유실돼도 일부 작업은 처리됐을 수 있으므로 POST를 자동 재시도하지 않는다.
    retry: false,
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: contractDocumentKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["tenants"] }),
      queryClient.invalidateQueries({ queryKey: ["users"] }),
      queryClient.invalidateQueries({ queryKey: ["properties"] }),
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]),
  });
}
