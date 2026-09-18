import { apiClient } from "@/lib/api/client";
import type {
  AlimtalksListParams,
  AlimtalksListResponse,
  AlimtalkTemplate,
  AlimtalkTemplatesResponse,
  AlimtalkType,
  RemoteAlimtalkTemplate,
  SendTestAlimtalkRequest,
  SendTestAlimtalkResponse,
  UpdateAlimtalkTemplateRequest,
} from "./types";

export async function fetchAlimtalks(params: AlimtalksListParams): Promise<AlimtalksListResponse> {
  const { data } = await apiClient.get<AlimtalksListResponse>("/v1/admin/alimtalks", { params });
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
  const { data } = await apiClient.patch<AlimtalkTemplate>(`/v1/admin/alimtalks/templates/${type}`, body);
  return data;
}

/** 공급자 왕복이라 느리고 실패할 수 있다. 화면 진입만으로 부르지 않고 요청이 있을 때만 부른다. */
export async function fetchRemoteAlimtalkTemplate(type: AlimtalkType): Promise<RemoteAlimtalkTemplate> {
  const { data } = await apiClient.get<RemoteAlimtalkTemplate>(
    `/v1/admin/alimtalks/templates/${type}/remote`,
  );
  return data;
}

export async function sendTestAlimtalk(body: SendTestAlimtalkRequest): Promise<SendTestAlimtalkResponse> {
  const { data } = await apiClient.post<SendTestAlimtalkResponse>("/v1/admin/alimtalks/test-sends", body);
  return data;
}
