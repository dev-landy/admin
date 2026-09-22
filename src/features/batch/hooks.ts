import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBatchExecution,
  fetchBatchExecutions,
  fetchBatchJobs,
  fetchBatchSchedules,
  retryBatchExecution,
  runBatchJob,
  updateBatchSchedule,
} from "./api";
import type {
  BatchExecutionsListParams,
  BatchScheduleKey,
  RetryBatchExecutionRequest,
  RunBatchJobRequest,
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
    // worker가 거절한 재시도도 실행 상태를 바꿀 수 있어 실패 시 목록·상세를 함께 갱신한다.
    onSettled: () => queryClient.invalidateQueries({ queryKey: batchKeys.executions }),
  });
}

export function useBatchSchedules() {
  return useQuery({ queryKey: batchKeys.schedules, queryFn: fetchBatchSchedules });
}

export function useRunBatchJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobName, ...body }: RunBatchJobRequest & { jobName: string }) =>
      runBatchJob(jobName, body),
    // worker가 거절한 요청도 FAILED 실행 이력을 남길 수 있다.
    onSettled: () => queryClient.invalidateQueries({ queryKey: batchKeys.executions }),
  });
}

export function useUpdateBatchSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, body }: { key: BatchScheduleKey; body: UpdateBatchScheduleRequest }) =>
      updateBatchSchedule(key, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: batchKeys.schedules }),
  });
}
