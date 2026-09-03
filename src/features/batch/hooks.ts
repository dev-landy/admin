import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBatchExecution,
  fetchBatchExecutions,
  fetchBatchJobs,
  fetchBatchSchedules,
  retryBatchExecution,
  updateBatchSchedule,
} from "./api";
import type {
  BatchExecutionsListParams,
  BatchScheduleKey,
  RetryBatchExecutionRequest,
  UpdateBatchScheduleRequest,
} from "./types";

export const batchKeys = {
  all: ["batch"] as const,
  executions: ["batch", "executions"] as const,
  executionList: (params: BatchExecutionsListParams) =>
    ["batch", "executions", "list", params] as const,
  execution: (executionId: number) => ["batch", "executions", "detail", executionId] as const,
  schedules: ["batch", "schedules"] as const,
  jobs: ["batch", "jobs"] as const,
};

export function useBatchExecutions(params: BatchExecutionsListParams) {
  return useQuery({
    queryKey: batchKeys.executionList(params),
    queryFn: () => fetchBatchExecutions(params),
  });
}

export function useBatchExecution(executionId: number | null) {
  return useQuery({
    queryKey: batchKeys.execution(executionId ?? 0),
    queryFn: () => fetchBatchExecution(executionId as number),
    enabled: executionId !== null,
  });
}

export function useBatchJobs() {
  return useQuery({ queryKey: batchKeys.jobs, queryFn: fetchBatchJobs });
}

export function useRetryBatchExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      executionId,
      ...body
    }: RetryBatchExecutionRequest & { executionId: number }) =>
      retryBatchExecution(executionId, body),
    // 재시도는 새 실행을 만들고 기존 실행의 상태 표시도 바꾼다. 목록·상세를 함께 무효화한다.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: batchKeys.executions }),
  });
}

export function useBatchSchedules() {
  return useQuery({ queryKey: batchKeys.schedules, queryFn: fetchBatchSchedules });
}

export function useUpdateBatchSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, body }: { key: BatchScheduleKey; body: UpdateBatchScheduleRequest }) =>
      updateBatchSchedule(key, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: batchKeys.schedules }),
  });
}
