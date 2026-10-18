import { apiClient } from "@/lib/api/client";
import type {
  AlimtalksListParams,
  AlimtalksListResponse,
  AlimtalkTemplate,
  AlimtalkTemplatesResponse,
  AlimtalkType,
  AlimtalkSummary,
  ResolveAlimtalkRequest,
  SendTestAlimtalkRequest,
  SendTestAlimtalkResponse,
  UpdateAlimtalkTemplateRequest,
} from "./types";

export async function fetchAlimtalks(params: AlimtalksListParams): Promise<AlimtalksListResponse> {
  const { data } = await apiClient.get<AlimtalksListResponse>("/v1/admin/alimtalks", { params });
  return data;
}

export async function resolveAlimtalk(
  alimtalkId: number,
  body: ResolveAlimtalkRequest,
): Promise<AlimtalkSummary> {
  const { data } = await apiClient.patch<AlimtalkSummary>(
    `/v1/admin/alimtalks/${alimtalkId}/resolution`,
    body,
  );
  return data;
}

export async function fetchAlimtalkTemplates(): Promise<AlimtalkTemplatesResponse> {
  const { data } = await apiClient.get<AlimtalkTemplatesResponse>("/v1/admin/alimtalks/templates");
  return data;
}

export async function updateAlimtalkTemplate(
  type: AlimtalkType,
  body: UpdateAlimtalkTemplateRequest,
): Promise<AlimtalkTemplate> {
  const { pfId, templateId, enabled } = body;
  const request = {
    ...(pfId !== undefined ? { pfId } : {}),
    ...(templateId !== undefined ? { templateId } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
  };
  const { data } = await apiClient.patch<AlimtalkTemplate>(`/v1/admin/alimtalks/templates/${type}`, request);
  return data;
}

/** 저장된 ID의 승인 정보를 명시적으로 갱신한다. 요청 본문은 없다. */
export async function syncAlimtalkTemplate(type: AlimtalkType): Promise<AlimtalkTemplate> {
  const { data } = await apiClient.post<AlimtalkTemplate>(
    `/v1/admin/alimtalks/templates/${type}/sync`,
  );
  return data;
}

export async function sendTestAlimtalk(body: SendTestAlimtalkRequest): Promise<SendTestAlimtalkResponse> {
  const { data } = await apiClient.post<SendTestAlimtalkResponse>("/v1/admin/alimtalks/test-sends", body);
  return data;
}
