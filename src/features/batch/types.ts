export type BatchExecutionStatus =
  | "COMPLETED"
  | "STARTING"
  | "STARTED"
  | "STOPPING"
  | "STOPPED"
  | "FAILED"
  | "ABANDONED"
  | "UNKNOWN";

// Job·Step의 종료 코드. 운영에서 실제로 골라 보는 값만 추린 목록이다.
export type BatchExitCode =
  | "COMPLETED"
  | "COMPLETED_WITH_USER_FAILURES"
  | "FAILED"
  | "STOPPED"
  | "NOOP"
  | "UNKNOWN";

export type BatchStepKind = "CHUNK" | "TASKLET" | "UNKNOWN";

export type BatchScheduleKey =
  | "DAILY_NOTIFICATION"
  | "DAILY_NOTIFICATION_RETRY"
  | "DAILY_NOTIFICATION_RETRY_FINAL"
  | "DAILY_NOTIFICATION_LATE_RETRY"
  | "SILENT_WAKEUP"
  | "SILENT_WAKEUP_RETRY"
  | "SILENT_WAKEUP_RETRY_FINAL"
  | "REFRESH_TOKEN_CLEANUP"
  | "REFRESH_TOKEN_CLEANUP_RETRY";

export type BatchExecutionSummary = {
  executionId: number;
  jobName: string;
  jobInstanceId: number;
  targetDate: string | null;
  status: BatchExecutionStatus;
  exitCode: string | null;
  exitMessage: string | null;
  createTime: string;
  startTime: string | null;
  endTime: string | null;
  durationMillis: number | null;
  retryable: boolean;
  // 종료 신호 없이 오래 STARTED로 남은 실행. 재시도하려면 confirmStale 재확인이 필요하다.
  stale: boolean;
};

export type BatchStepExecution = {
  stepExecutionId: number;
  stepName: string;
  kind: BatchStepKind;
  status: BatchExecutionStatus;
  exitCode: string | null;
  exitMessage: string | null;
  readCount: number;
  writeCount: number;
  commitCount: number;
  rollbackCount: number;
  startTime: string | null;
  endTime: string | null;
};

export type BatchExecutionDetail = BatchExecutionSummary & {
  steps: BatchStepExecution[];
};

export type BatchExecutionsListParams = {
  page?: number;
  size?: number;
  jobName?: string;
  status?: BatchExecutionStatus;
  exitCode?: BatchExitCode;
  // targetDate job 파라미터 기준 양끝 포함 범위 (YYYY-MM-DD).
  targetDateFrom?: string;
  targetDateTo?: string;
};

export type BatchExecutionsListResponse = {
  executions: BatchExecutionSummary[];
  page: number;
  size: number;
  totalElements: number;
};

export type RetryBatchExecutionRequest = {
  confirmStale?: boolean;
};

export type RetryBatchExecutionResponse = {
  requestedExecutionId: number;
  jobName: string;
  targetDate: string | null;
  newExecutionId: number | null;
  status: BatchExecutionStatus;
};

export type BatchSchedule = {
  key: BatchScheduleKey;
  jobName: string;
  label: string;
  cronExpression: string;
  enabled: boolean;
  nextExecutionAt: string | null;
  updatedAt: string;
};

export type BatchSchedulesResponse = { schedules: BatchSchedule[] };

export type UpdateBatchScheduleRequest = {
  cronExpression: string;
  enabled: boolean;
};

export type BatchJobsResponse = { jobNames: string[] };
