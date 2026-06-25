import { apiClient } from "@/lib/api/client";
import type { FeedbacksListResponse } from "./types";

export async function fetchFeedbacks(params: { page?: number; size?: number }): Promise<FeedbacksListResponse> {
  const { data } = await apiClient.get<FeedbacksListResponse>("/v1/admin/feedbacks", { params });
  return data;
}
