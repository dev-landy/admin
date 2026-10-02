import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  scheduleUpdate: ["batch", "schedule-update"] as const,
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
    mutationKey: batchKeys.scheduleUpdate,
    mutationFn: ({ key, body }: { key: BatchScheduleKey; body: UpdateBatchScheduleRequest }) =>
      updateBatchSchedule(key, body),
    retry: false,
    // 응답 유실·서버 오류여도 저장됐을 수 있다. 재조회가 끝날 때까지 mutation 잠금을 유지한다.
    onSettled: () => queryClient.invalidateQueries({ queryKey: batchKeys.schedules }),
  });
}

export function useIsBatchScheduleUpdating() {
  return useIsMutating({ mutationKey: batchKeys.scheduleUpdate }) > 0;
}
