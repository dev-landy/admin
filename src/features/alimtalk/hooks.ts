import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchAlimtalkTemplates,
  fetchAlimtalks,
  fetchRemoteAlimtalkTemplate,
  resolveAlimtalk,
  sendTestAlimtalk,
  updateAlimtalkTemplate,
} from "./api";
import type {
  AlimtalksListParams,
  AlimtalkType,
  ResolveAlimtalkRequest,
  SendTestAlimtalkRequest,
  UpdateAlimtalkTemplateRequest,
} from "./types";

export const alimtalkKeys = {
  all: ["alimtalks"] as const,
  list: (p: AlimtalksListParams) => ["alimtalks", "list", p] as const,
  templates: ["alimtalks", "templates"] as const,
  remoteTemplate: (type: AlimtalkType) => ["alimtalks", "templates", type, "remote"] as const,
};

export function useAlimtalks(params: AlimtalksListParams) {
  return useQuery({ queryKey: alimtalkKeys.list(params), queryFn: () => fetchAlimtalks(params) });
}

export function useResolveAlimtalk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alimtalkId, body }: { alimtalkId: number; body: ResolveAlimtalkRequest }) =>
      resolveAlimtalk(alimtalkId, body),
    // 조회 뒤 실제 발송이 먼저 진행되어 409가 나도 최신 상태를 다시 보여준다.
    onSettled: () => qc.invalidateQueries({ queryKey: ["alimtalks", "list"] }),
  });
}

export function useAlimtalkTemplates() {
  return useQuery({ queryKey: alimtalkKeys.templates, queryFn: fetchAlimtalkTemplates });
}

export function useUpdateAlimtalkTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, body }: { type: AlimtalkType; body: UpdateAlimtalkTemplateRequest }) =>
      updateAlimtalkTemplate(type, body),
    onSuccess: (_result, { type }) => {
      qc.invalidateQueries({ queryKey: alimtalkKeys.templates });
      // 본문을 바꿨으면 승인 본문과 일치하는지도 다시 봐야 한다.
      qc.invalidateQueries({ queryKey: alimtalkKeys.remoteTemplate(type) });
    },
  });
}

/**
 * 승인 템플릿은 공급자에서 요청 시점에 가져온다. `enabled`가 켜졌을 때만 조회해 화면 진입마다
 * 외부 왕복이 일어나지 않게 한다.
 */
export function useRemoteAlimtalkTemplate(type: AlimtalkType, enabled: boolean) {
  return useQuery({
    queryKey: alimtalkKeys.remoteTemplate(type),
    queryFn: () => fetchRemoteAlimtalkTemplate(type),
    enabled,
    retry: false,
    staleTime: 0,
  });
}

// 테스트 발송은 세입자 이력에 남지 않으므로 목록 캐시를 건드리지 않는다.
export function useSendTestAlimtalk() {
  return useMutation({ mutationFn: (req: SendTestAlimtalkRequest) => sendTestAlimtalk(req) });
}
