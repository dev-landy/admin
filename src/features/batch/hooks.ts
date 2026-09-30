import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBatchExecution,
  fetchBatchExecutions,
  fetchBatchJobs,
  fetchBatchSchedules,
  updateBatchSchedule,
} from "./api";
import type {
  BatchExecutionsListParams,
  BatchScheduleKey,
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
