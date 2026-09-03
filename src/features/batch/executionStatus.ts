import type { BatchExecutionStatus, BatchExitCode } from "./types";

export const BATCH_EXECUTION_STATUS_COLOR: Record<BatchExecutionStatus, string> = {
  COMPLETED: "green",
  STARTING: "blue",
  STARTED: "processing",
  STOPPING: "orange",
  STOPPED: "orange",
  FAILED: "red",
  ABANDONED: "volcano",
  UNKNOWN: "default",
};

export const BATCH_EXECUTION_STATUS_OPTIONS: { label: string; value: BatchExecutionStatus }[] = [
  { label: "COMPLETED", value: "COMPLETED" },
  { label: "STARTING", value: "STARTING" },
  { label: "STARTED", value: "STARTED" },
  { label: "STOPPING", value: "STOPPING" },
  { label: "STOPPED", value: "STOPPED" },
  { label: "FAILED", value: "FAILED" },
  { label: "ABANDONED", value: "ABANDONED" },
  { label: "UNKNOWN", value: "UNKNOWN" },
];

export function batchExecutionStatusColor(status: BatchExecutionStatus): string {
  return BATCH_EXECUTION_STATUS_COLOR[status] ?? "default";
}

// COMPLETED_WITH_USER_FAILURES는 Job 상태가 COMPLETED로 보이지만 일부 사용자의 알림이 실패한
// 경우다. 운영에서 실제로 찾아보는 값이라 코드만으로는 눈에 띄지 않아 한국어 설명을 붙인다.
export const BATCH_EXIT_CODE_OPTIONS: { label: string; value: BatchExitCode }[] = [
  { label: "COMPLETED (정상 완료)", value: "COMPLETED" },
  { label: "COMPLETED_WITH_USER_FAILURES (일부 사용자 실패)", value: "COMPLETED_WITH_USER_FAILURES" },
  { label: "FAILED (실패)", value: "FAILED" },
  { label: "STOPPED (중단)", value: "STOPPED" },
  { label: "NOOP (대상 없음)", value: "NOOP" },
  { label: "UNKNOWN (알 수 없음)", value: "UNKNOWN" },
];
