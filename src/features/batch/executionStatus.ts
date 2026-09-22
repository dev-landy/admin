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

// COMPLETED_WITH_USER_FAILURES는 일부 사용자 알림 생성에 실패한 Step의 종료 코드다.
// 성공한 사용자의 알림 발송을 처리한 뒤 Job은 FAILED로 남아 재시작할 수 있다.
// 종료 코드의 의미를 쉽게 구분하도록 한국어 설명을 붙인다.
export const BATCH_EXIT_CODE_OPTIONS: { label: string; value: BatchExitCode }[] = [
  { label: "COMPLETED (정상 완료)", value: "COMPLETED" },
  { label: "COMPLETED_WITH_USER_FAILURES (일부 사용자 실패)", value: "COMPLETED_WITH_USER_FAILURES" },
  { label: "FAILED (실패)", value: "FAILED" },
  { label: "STOPPED (중단)", value: "STOPPED" },
  { label: "NOOP (대상 없음)", value: "NOOP" },
  { label: "UNKNOWN (알 수 없음)", value: "UNKNOWN" },
];
