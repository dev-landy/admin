import { apiClient } from "@/lib/api/client";
import type { PaymentsListParams, PaymentsListResponse, DuplicatesResponse, DuplicatesParams } from "./types";

type DuplicateGroupsResponse = Omit<DuplicatesResponse, "duplicates"> & {
  groups: DuplicatesResponse["duplicates"];
};

export async function fetchPayments(params: PaymentsListParams): Promise<PaymentsListResponse> {
  const { data } = await apiClient.get<PaymentsListResponse>("/v1/admin/payments", { params });
  return data;
}

export async function fetchDuplicates(params: DuplicatesParams): Promise<DuplicatesResponse> {
  const { data } = await apiClient.get<DuplicateGroupsResponse | DuplicatesResponse>("/v1/admin/payments/duplicates", { params });
  // 서버의 groups를 화면 계약으로 맞추며 이전 duplicates 응답도 수용한다.
  return {
    duplicates: "groups" in data ? data.groups : data.duplicates,
    page: data.page,
    size: data.size,
    totalElements: data.totalElements,
  };
}
