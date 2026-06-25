import { apiClient } from "@/lib/api/client";
import type { PaymentsListParams, PaymentsListResponse, DuplicatesResponse } from "./types";

export async function fetchPayments(params: PaymentsListParams): Promise<PaymentsListResponse> {
  const { data } = await apiClient.get<PaymentsListResponse>("/v1/admin/payments", { params });
  return data;
}

export async function fetchDuplicates(params: { page?: number; size?: number }): Promise<DuplicatesResponse> {
  const { data } = await apiClient.get<DuplicatesResponse>("/v1/admin/payments/duplicates", { params });
  return data;
}
