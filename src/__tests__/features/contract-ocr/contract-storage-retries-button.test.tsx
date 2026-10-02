import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import { AxiosError, AxiosHeaders } from "axios";
import { ContractStorageRetriesButton } from "@/features/contract-ocr/components/ContractStorageRetriesButton";
import { retryContractStorage } from "@/features/contract-ocr/api";

jest.mock("@/features/contract-ocr/api", () => ({ retryContractStorage: jest.fn() }));

const mockRetry = jest.mocked(retryContractStorage);
let client: QueryClient;

function renderRecoveryButton() {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      // 실제 복구 훅이 자동 재시도를 끄는지 확인한다.
      mutations: { retry: 2, retryDelay: 1 },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <App><ContractStorageRetriesButton /></App>
    </QueryClientProvider>,
  );
}

function recoveryButton() {
  return screen.getByRole("button", { name: "계약서 처리 복구" });
}

async function openConfirmation() {
  fireEvent.click(recoveryButton());
  return screen.findByRole("dialog");
}

function problem(detail: string) {
  return new AxiosError("service unavailable", undefined, undefined, undefined, {
    data: { type: "/problems/service-unavailable", title: "처리 실패", status: 503, detail },
    status: 503,
    statusText: "Service Unavailable",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockRetry.mockResolvedValue({ attempted: 3 });
});

afterEach(() => client?.clear());

test("실행 전에 전체 처리 범위와 부분 처리를 확인하고 취소하면 요청하지 않는다", async () => {
  renderRecoveryButton();
  expect(mockRetry).not.toHaveBeenCalled();
  const dialog = await openConfirmation();
  expect(dialog).toHaveAccessibleName("미완료 계약서 작업을 재처리할까요?");
  expect(dialog).toHaveTextContent("전체 계약서");
  expect(dialog).toHaveTextContent("보관·삭제");
  expect(dialog).toHaveTextContent("파일 작업");
  expect(dialog).toHaveTextContent("임차인 등록");
  expect(dialog).toHaveTextContent("결과 알림");
  expect(dialog).toHaveTextContent("일부 작업이 실패해도 다른 작업은 처리될 수 있습니다.");
  expect(dialog).toHaveTextContent("OCR 분석을 새로 요청하지 않습니다.");
  expect(within(dialog).getByRole("button", { name: "재처리" })).toBeEnabled();
  expect(mockRetry).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockRetry).not.toHaveBeenCalled();
  expect(recoveryButton()).toBeEnabled();

  expect(await openConfirmation()).toBeInTheDocument();
  expect(mockRetry).not.toHaveBeenCalled();
});

test("확인창과 실행 중 버튼을 반복 클릭해도 진행 중 요청은 한 번만 보낸다", async () => {
  let resolveRequest!: (result: { attempted: number }) => void;
  mockRetry.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
  renderRecoveryButton();

  act(() => {
    fireEvent.click(recoveryButton());
    fireEvent.click(recoveryButton());
  });
  const dialog = await screen.findByRole("dialog");
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  const confirm = within(dialog).getByRole("button", { name: "재처리" });
  act(() => {
    fireEvent.click(confirm);
    fireEvent.click(confirm);
  });

  await waitFor(() => expect(mockRetry).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(recoveryButton()).toBeDisabled());
  expect(recoveryButton()).toHaveClass("ant-btn-loading");
  fireEvent.click(recoveryButton());
  fireEvent.click(confirm);
  expect(mockRetry).toHaveBeenCalledTimes(1);

  await act(async () => resolveRequest({ attempted: 2 }));
  expect(await screen.findByText("미완료 작업 재처리를 요청했습니다.")).toBeInTheDocument();
  await waitFor(() => expect(recoveryButton()).toBeEnabled());
  expect(recoveryButton()).not.toHaveClass("ant-btn-loading");
  expect(mockRetry).toHaveBeenCalledTimes(1);
});

test.each([3, 0])("파일 시도 %i건을 표시하며 실패 포함과 전체 완료 아님을 명시한다", async (attempted) => {
  mockRetry.mockResolvedValue({ attempted });
  renderRecoveryButton();
  const dialog = await openConfirmation();
  fireEvent.click(within(dialog).getByRole("button", { name: "재처리" }));

  expect(await screen.findByText("미완료 작업 재처리를 요청했습니다.")).toBeInTheDocument();
  expect(screen.getByText(
    `시도한 파일 작업: ${attempted}건. 실패한 시도도 포함되며, 0건이어도 다른 미완료 작업이 모두 정리됐다는 뜻은 아닙니다.`,
  )).toBeInTheDocument();
  expect(mockRetry).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(recoveryButton()).toBeEnabled());
});

test("연결 오류는 부분 처리 가능성을 안내하며 자동 재시도하지 않는다", async () => {
  mockRetry.mockRejectedValue(new Error("connection lost"));
  renderRecoveryButton();
  const dialog = await openConfirmation();
  fireEvent.click(within(dialog).getByRole("button", { name: "재처리" }));

  expect(await screen.findByText("재처리 결과를 확인하지 못했습니다.")).toBeInTheDocument();
  expect(screen.getByText(/일부 작업.*상태/)).toBeInTheDocument();
  expect(screen.getByText(/일부 작업.*상태/)).toHaveTextContent(/다시 요청|재처리|재시도/);
  expect(screen.queryByText("미완료 작업 재처리를 요청했습니다.")).not.toBeInTheDocument();
  expect(mockRetry).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(recoveryButton()).toBeEnabled());
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

  expect(await openConfirmation()).toBeInTheDocument();
  expect(mockRetry).toHaveBeenCalledTimes(1);
});

test("Problem Detail 오류의 내용을 표시하며 자동 재시도하지 않는다", async () => {
  mockRetry.mockRejectedValue(problem("등록 결과를 확인한 뒤 재처리해 주세요."));
  renderRecoveryButton();
  const dialog = await openConfirmation();
  fireEvent.click(within(dialog).getByRole("button", { name: "재처리" }));

  expect(await screen.findByText("재처리 결과를 확인하지 못했습니다.")).toBeInTheDocument();
  const description = screen.getByText(/등록 결과를 확인한 뒤 재처리해 주세요\./);
  expect(description).toHaveTextContent("일부 작업은 이미 처리됐을 수 있습니다.");
  expect(description).toHaveTextContent("목록과 처리 상태를 확인한 뒤 다시 요청해 주세요.");
  expect(mockRetry).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(recoveryButton()).toBeEnabled());
});
