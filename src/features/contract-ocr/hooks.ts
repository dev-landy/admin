import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  completeContractOcrAnalysis,
  fetchContractOcrDocument,
  fetchContractOcrDocuments,
  fetchContractOcrDraft,
  fetchContractOcrSources,
  rejectContractOcrAnalysis,
  retryContractOcrAnalysis,
  retryContractOcrRegistration,
} from "./api";
import type { ContractOcrAnalysisCompletionRequest, ContractOcrListStatus } from "./types";

export const contractOcrKeys = {
  all: ["contract-ocr"] as const,
  list: (status: ContractOcrListStatus, page: number, size: number) =>
    ["contract-ocr", "list", status, page, size] as const,
  detail: (documentId: string) => ["contract-ocr", documentId, "detail"] as const,
  sources: (documentId: string) => ["contract-ocr", documentId, "sources"] as const,
  draft: (documentId: string) => ["contract-ocr", documentId, "draft"] as const,
};

export function useContractOcrDocument(documentId: string) {
  return useQuery({
    queryKey: contractOcrKeys.detail(documentId),
    queryFn: () => fetchContractOcrDocument(documentId),
  });
}

export function useContractOcrDocuments(status: ContractOcrListStatus, page: number, size: number) {
  return useQuery({
    queryKey: contractOcrKeys.list(status, page, size),
    queryFn: () => fetchContractOcrDocuments(status, page, size),
  });
}

// presigned URL TTL이 10분이라 캐시를 신뢰하지 않고 항상 새로 발급받는다.
export function useContractOcrSources(documentId: string) {
  return useQuery({
    queryKey: contractOcrKeys.sources(documentId),
    queryFn: () => fetchContractOcrSources(documentId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useRejectContractOcrAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => rejectContractOcrAnalysis(documentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractOcrKeys.all }),
  });
}

export function useCompleteContractOcrAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      body,
    }: {
      documentId: string;
      body: ContractOcrAnalysisCompletionRequest;
    }) => completeContractOcrAnalysis(documentId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractOcrKeys.all }),
  });
}

// 폴백(자동 등록 실패) 문서에서만 조회한다.
export function useContractOcrDraft(documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: contractOcrKeys.draft(documentId),
    queryFn: () => fetchContractOcrDraft(documentId),
    enabled,
    refetchOnWindowFocus: false,
  });
}

export function useRetryContractOcrRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      body,
    }: {
      documentId: string;
      body: ContractOcrAnalysisCompletionRequest;
    }) => retryContractOcrRegistration(documentId, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: contractOcrKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
      ]),
  });
}

export function useRetryContractOcrAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => retryContractOcrAnalysis(documentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractOcrKeys.all }),
  });
}
