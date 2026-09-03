import {
  fetchBatchExecution,
  fetchBatchExecutions,
  fetchBatchJobs,
  fetchBatchSchedules,
  retryBatchExecution,
  updateBatchSchedule,
} from "@/features/batch/api";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = jest.mocked(apiClient.get);
const mockPost = jest.mocked(apiClient.post);
const mockPatch = jest.mocked(apiClient.patch);

beforeEach(() => {
  jest.clearAllMocks();
});

test("필터와 페이지 조건으로 배치 실행 이력을 조회한다", async () => {
  const response = { executions: [], page: 0, size: 20, totalElements: 0 };
  mockGet.mockResolvedValue({ data: response });
  const params = { page: 1, size: 20, jobName: "dailyNotificationJob", status: "FAILED" as const };

  await expect(fetchBatchExecutions(params)).resolves.toEqual(response);
  expect(mockGet).toHaveBeenCalledWith("/v1/admin/batch/executions", { params });
});

test("종료 코드와 대상 날짜 범위 필터를 그대로 전달한다", async () => {
  const response = { executions: [], page: 0, size: 20, totalElements: 0 };
  mockGet.mockResolvedValue({ data: response });
  const params = {
    page: 1,
    size: 20,
    jobName: "dailyNotificationJob",
    status: "COMPLETED" as const,
    exitCode: "COMPLETED_WITH_USER_FAILURES" as const,
    targetDateFrom: "2026-09-01",
    targetDateTo: "2026-09-03",
  };

  await expect(fetchBatchExecutions(params)).resolves.toEqual(response);
  expect(mockGet).toHaveBeenCalledWith("/v1/admin/batch/executions", { params });
});

test("대상 날짜 범위가 없으면 범위 파라미터를 아예 보내지 않는다", async () => {
  mockGet.mockResolvedValue({ data: { executions: [], page: 0, size: 20, totalElements: 0 } });

  await fetchBatchExecutions({ page: 1, size: 20, exitCode: "FAILED" });

  const [, config] = mockGet.mock.calls[0] as [string, { params: Record<string, unknown> }];
  expect(Object.keys(config.params)).toEqual(["page", "size", "exitCode"]);
});

test("배치 실행 상세를 실행 ID로 조회한다", async () => {
  mockGet.mockResolvedValue({ data: { executionId: 12, steps: [] } });

  await fetchBatchExecution(12);

  expect(mockGet).toHaveBeenCalledWith("/v1/admin/batch/executions/12");
});

test("재시도는 기본적으로 confirmStale 없이 요청하고, 강제 재시도는 confirmStale을 보낸다", async () => {
  mockPost.mockResolvedValue({ data: { requestedExecutionId: 12, newExecutionId: 13 } });

  await retryBatchExecution(12);
  await retryBatchExecution(12, { confirmStale: true });

  expect(mockPost).toHaveBeenNthCalledWith(1, "/v1/admin/batch/executions/12/retry", {});
  expect(mockPost).toHaveBeenNthCalledWith(2, "/v1/admin/batch/executions/12/retry", {
    confirmStale: true,
  });
});

test("배치 스케줄 목록과 Job 이름 목록을 조회한다", async () => {
  mockGet
    .mockResolvedValueOnce({ data: { schedules: [] } })
    .mockResolvedValueOnce({ data: { jobNames: [] } });

  await fetchBatchSchedules();
  await fetchBatchJobs();

  expect(mockGet).toHaveBeenNthCalledWith(1, "/v1/admin/batch/schedules");
  expect(mockGet).toHaveBeenNthCalledWith(2, "/v1/admin/batch/jobs");
});

test("배치 스케줄을 key 경로로 수정한다", async () => {
  const body = { cronExpression: "0 0 9 * * *", zoneId: "Asia/Seoul", enabled: true };
  mockPatch.mockResolvedValue({ data: { key: "DAILY_NOTIFICATION", ...body } });

  await updateBatchSchedule("DAILY_NOTIFICATION", body);

  expect(mockPatch).toHaveBeenCalledWith("/v1/admin/batch/schedules/DAILY_NOTIFICATION", body);
});
