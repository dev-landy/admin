import "@/test-utils/antd";

import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import { AxiosError, AxiosHeaders } from "axios";

import { BatchJobRunModal } from "@/features/batch/components/BatchJobRunModal";
import { runBatchJob } from "@/features/batch/api";
import { getSeoulToday } from "@/features/batch/targetDate";

jest.mock("@/features/batch/api", () => ({ runBatchJob: jest.fn() }));
const mockRun = jest.mocked(runBatchJob);
const onClose = jest.fn();

function renderModal() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  render(<StrictMode><QueryClientProvider client={client}><App>
    <BatchJobRunModal open jobNames={["dailyNotificationJob", "dailyDispatchAuditJob", "dueAlimtalkJob"]} onClose={onClose} />
  </App></QueryClientProvider></StrictMode>);
  return invalidate;
}

async function chooseJob(name = "dailyDispatchAuditJob") {
  fireEvent.mouseDown(screen.getByLabelText("Job"));
  fireEvent.click(await screen.findByText(name, { selector: ".ant-select-item-option-content" }));
}

beforeEach(() => jest.resetAllMocks());

test("브라우저 시간대와 무관하게 한국 자정 기준으로 대상일을 계산한다", () => {
  expect(getSeoulToday(new Date("2026-09-21T14:59:59Z"))).toBe("2026-09-21");
  expect(getSeoulToday(new Date("2026-09-21T15:00:00Z"))).toBe("2026-09-22");
});

test("Job 선택 전에는 요청하지 않고 선택한 Job과 한국 날짜로 실행한다", async () => {
  const invalidate = renderModal();
  fireEvent.click(screen.getByRole("button", { name: "실행 요청" }));
  expect(await screen.findByText("Job을 선택하세요.")).toBeInTheDocument();
  expect(mockRun).not.toHaveBeenCalled();
  await chooseJob();
  mockRun.mockResolvedValue({ jobName: "dailyDispatchAuditJob", targetDate: getSeoulToday(), newExecutionId: 99, status: "STARTING" });
  fireEvent.click(screen.getByRole("button", { name: "실행 요청" }));

  await waitFor(() => expect(mockRun).toHaveBeenCalledWith("dailyDispatchAuditJob", { targetDate: getSeoulToday() }));
  expect(await screen.findByText("배치 실행을 요청했습니다.")).toBeInTheDocument();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["batch", "executions"] });
  expect(onClose).toHaveBeenCalled();
});

test.each(["COMPLETED", "STARTED"] as const)("새 실행 ID가 없으면 %s 상태를 보여주고 실행 접수라고 알리지 않는다", async (status) => {
  renderModal();
  await chooseJob();
  mockRun.mockResolvedValue({ jobName: "dailyDispatchAuditJob", targetDate: getSeoulToday(), newExecutionId: null, status });
  fireEvent.click(screen.getByRole("button", { name: "실행 요청" }));

  expect(await screen.findByText("새 실행을 만들지 않았습니다.")).toBeInTheDocument();
  expect(screen.getByText(new RegExp(`현재 상태: ${status}`))).toBeInTheDocument();
  expect(screen.queryByText("배치 실행을 요청했습니다.")).not.toBeInTheDocument();
});

test("worker 거절은 오류를 알리고 실패 실행 이력을 다시 조회한다", async () => {
  const invalidate = renderModal();
  await chooseJob();
  mockRun.mockRejectedValue(new AxiosError("busy", undefined, undefined, undefined, {
    data: { type: "/problems/batch-job-launch-rejected", title: "실행 요청이 거절되었습니다", detail: "다른 Job이 실행 중입니다.", status: 409 },
    status: 409, statusText: "Conflict", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  }));
  fireEvent.click(screen.getByRole("button", { name: "실행 요청" }));

  expect(await screen.findByText("다른 Job이 실행 중입니다.")).toBeInTheDocument();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["batch", "executions"] });
  expect(onClose).not.toHaveBeenCalled();
});

test("납부일 알림톡을 선택하면 고정 마감을 표시하고 미래 날짜 입력은 적용하지 않는다", async () => {
  renderModal();
  await chooseJob("dueAlimtalkJob");
  expect(await screen.findByText("납부일 알림톡은 당일 08:55(한국 시간) 전에만 발송됩니다.")).toBeInTheDocument();
  const input = screen.getByLabelText("대상 날짜 (한국 시간)");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "2999-01-01" } });
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.blur(input);
  await waitFor(() => expect(input).not.toHaveValue("2999-01-01"));
  expect(mockRun).not.toHaveBeenCalled();
});
