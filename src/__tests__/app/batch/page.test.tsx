import { fireEvent, render, screen } from "@testing-library/react";

import BatchExecutionsPage from "@/app/(admin)/batch/page";
import { useBatchExecutions } from "@/features/batch/hooks";

const mockPush = jest.fn();
const mockRefetch = jest.fn();
const searchParams = new URLSearchParams(
  "page=3&size=20&jobName=dailyNotificationJob&status=FAILED&exitCode=FAILED",
);

jest.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/features/batch/hooks", () => ({
  useBatchExecutions: jest.fn(() => ({
    data: { executions: [], totalElements: 0 },
    isLoading: false,
    isFetching: false,
    refetch: mockRefetch,
  })),
  useBatchJobs: () => ({ data: { jobNames: ["dailyNotificationJob"] } }),
}));

jest.mock("@/features/batch/components/BatchExecutionTable", () => ({
  BatchExecutionTable: ({
    onTargetDateRangeChange,
  }: {
    onTargetDateRangeChange: (from: string, to: string) => void;
  }) => (
    <button onClick={() => onTargetDateRangeChange("2026-09-01", "2026-09-03")}>
      대상 날짜 필터 변경
    </button>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("실행 이력 화면은 현재 필터로 조회하고 새로고침할 수 있다", () => {
  render(<BatchExecutionsPage />);

  expect(useBatchExecutions).toHaveBeenCalledWith({
    page: 3,
    size: 20,
    jobName: "dailyNotificationJob",
    status: "FAILED",
    exitCode: "FAILED",
    targetDateFrom: undefined,
    targetDateTo: undefined,
  });

  fireEvent.click(screen.getByRole("button", { name: /새로고침/ }));

  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

test("대상 날짜를 변경하면 다른 필터는 유지하고 1페이지로 되돌린다", () => {
  render(<BatchExecutionsPage />);

  fireEvent.click(screen.getByRole("button", { name: "대상 날짜 필터 변경" }));

  expect(mockPush).toHaveBeenCalledWith(
    "?page=1&size=20&jobName=dailyNotificationJob&status=FAILED&exitCode=FAILED&targetDateFrom=2026-09-01&targetDateTo=2026-09-03",
  );
});
