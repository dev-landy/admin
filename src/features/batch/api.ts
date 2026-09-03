import { apiClient } from "@/lib/api/client";
import type {
  BatchExecutionDetail,
  BatchExecutionsListParams,
  BatchExecutionsListResponse,
  BatchJobsResponse,
  BatchSchedule,
  BatchScheduleKey,
  BatchSchedulesResponse,
  RetryBatchExecutionRequest,
  RetryBatchExecutionResponse,
  UpdateBatchScheduleRequest,
} from "./types";

export async function fetchBatchExecutions(
  params: BatchExecutionsListParams,
): Promise<BatchExecutionsListResponse> {
  const { data } = await apiClient.get<BatchExecutionsListResponse>("/v1/admin/batch/executions", {
    params,
  });
  return data;
}

export async function fetchBatchExecution(executionId: number): Promise<BatchExecutionDetail> {
  const { data } = await apiClient.get<BatchExecutionDetail>(
    `/v1/admin/batch/executions/${executionId}`,
  );
  return data;
}

export async function retryBatchExecution(
  executionId: number,
  body: RetryBatchExecutionRequest = {},
): Promise<RetryBatchExecutionResponse> {
  const { data } = await apiClient.post<RetryBatchExecutionResponse>(
    `/v1/admin/batch/executions/${executionId}/retry`,
    body,
  );
  return data;
}

export async function fetchBatchSchedules(): Promise<BatchSchedulesResponse> {
  const { data } = await apiClient.get<BatchSchedulesResponse>("/v1/admin/batch/schedules");
  return data;
}

export async function updateBatchSchedule(
  key: BatchScheduleKey,
  body: UpdateBatchScheduleRequest,
): Promise<BatchSchedule> {
  const { data } = await apiClient.patch<BatchSchedule>(`/v1/admin/batch/schedules/${key}`, body);
  return data;
}

export async function fetchBatchJobs(): Promise<BatchJobsResponse> {
  const { data } = await apiClient.get<BatchJobsResponse>("/v1/admin/batch/jobs");
  return data;
}
