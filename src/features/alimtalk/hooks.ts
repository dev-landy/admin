import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OPERATIONAL_QUERY_OPTIONS } from "@/lib/query/query-policy";

import {
  fetchAlimtalkTemplates,
  fetchAlimtalks,
  syncAlimtalkTemplate,
  resolveAlimtalk,
  sendTestAlimtalk,
  updateAlimtalkTemplate,
} from "./api";
import type {
  AlimtalksListParams,
  AlimtalkType,
  AlimtalkTemplate,
  AlimtalkTemplatesResponse,
  ResolveAlimtalkRequest,
  SendTestAlimtalkRequest,
  UpdateAlimtalkTemplateRequest,
} from "./types";

export const alimtalkKeys = {
  all: ["alimtalks"] as const,
  list: (p: AlimtalksListParams) => ["alimtalks", "list", p] as const,
  templates: ["alimtalks", "templates"] as const,
};

export function useAlimtalks(params: AlimtalksListParams) {
  return useQuery({ queryKey: alimtalkKeys.list(params), queryFn: () => fetchAlimtalks(params), ...OPERATIONAL_QUERY_OPTIONS });
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

export function useAlimtalkTemplates(enabled = true) {
  return useQuery({ queryKey: alimtalkKeys.templates, queryFn: fetchAlimtalkTemplates, enabled });
}

function replaceTemplate(current: AlimtalkTemplatesResponse | undefined, saved: AlimtalkTemplate) {
  if (!current) return undefined;
  return { templates: current.templates.map((template) => template.type === saved.type ? saved : template) };
}

export function useUpdateAlimtalkTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, body }: { type: AlimtalkType; body: UpdateAlimtalkTemplateRequest }) =>
      updateAlimtalkTemplate(type, body),
    onSuccess: (saved) => {
      qc.setQueryData<AlimtalkTemplatesResponse>(alimtalkKeys.templates, (current) => replaceTemplate(current, saved));
      return qc.invalidateQueries({ queryKey: alimtalkKeys.templates });
    },
  });
}

export function useSyncAlimtalkTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: AlimtalkType) => syncAlimtalkTemplate(type),
    onSuccess: (saved) => {
      qc.setQueryData<AlimtalkTemplatesResponse>(alimtalkKeys.templates, (current) => replaceTemplate(current, saved));
    },
    // 미지원 형태로 확정되면 실패 응답이어도 서버의 기존 승인 정보가 무효화될 수 있다.
    onSettled: () => qc.invalidateQueries({ queryKey: alimtalkKeys.templates }),
  });
}

// 테스트 발송은 세입자 이력에 남지 않으므로 목록 캐시를 건드리지 않는다.
export function useSendTestAlimtalk() {
  return useMutation({ mutationFn: (req: SendTestAlimtalkRequest) => sendTestAlimtalk(req) });
}
