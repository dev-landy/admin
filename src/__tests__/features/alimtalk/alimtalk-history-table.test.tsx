import "@/test-utils/antd";

import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import { AxiosError, AxiosHeaders } from "axios";

import { AlimtalkHistoryTable } from "@/features/alimtalk/components/AlimtalkHistoryTable";
import { fetchAlimtalks, resolveAlimtalk } from "@/features/alimtalk/api";
import { useAlimtalks } from "@/features/alimtalk/hooks";
import type { AlimtalkSummary } from "@/features/alimtalk/types";

jest.mock("@/features/alimtalk/api", () => ({ fetchAlimtalks: jest.fn(), resolveAlimtalk: jest.fn() }));
const mockFetch = jest.mocked(fetchAlimtalks);
const mockResolve = jest.mocked(resolveAlimtalk);

const ready: AlimtalkSummary = {
  alimtalkId: 501, userId: 7, recipientType: "TENANT", recipientId: 42,
  type: "DUE", triggerSource: "SCHEDULED", status: "READY", billingMonth: "2026-09",
  targetDate: "2026-09-21", amount: 500_000, messageId: null, providerCode: null,
  requestedAt: "2026-09-21T08:20:00", updatedAt: "2026-09-21T08:20:00",
};

function respondWith(rows: AlimtalkSummary[]) {
  mockFetch.mockResolvedValue({ alimtalks: rows, page: 0, size: 20, totalElements: rows.length });
}

function History() {
  const { data, isLoading } = useAlimtalks({ page: 1, size: 20 });
  return <AlimtalkHistoryTable data={data?.alimtalks ?? []} loading={isLoading} page={1} pageSize={20}
    total={data?.totalElements ?? 0} onPageChange={jest.fn()} filters={{}} onFilterChange={jest.fn()} />;
}

async function renderHistory(rows: AlimtalkSummary[] = [ready]) {
  respondWith(rows);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<StrictMode><QueryClientProvider client={client}><App><History /></App></QueryClientProvider></StrictMode>);
  await screen.findByText(String(rows[0].alimtalkId));
}

function row(id: number) {
  return within(document.querySelector<HTMLElement>(`tr[data-row-key="${id}"]`)!);
}

async function openResolution(id = 501) {
  fireEvent.click(row(id).getByRole("button", { name: "미결 종결" }));
  return within(await screen.findByRole("dialog"));
}

beforeEach(() => jest.resetAllMocks());

test("새 이력 ID·수신자와 다섯 상태를 표시하며 미결 건만 종결할 수 있다", async () => {
  await renderHistory([
    ready,
    { ...ready, alimtalkId: 502, status: "PENDING", recipientType: "USER", recipientId: 9 },
    { ...ready, alimtalkId: 503, status: "SENT" },
    { ...ready, alimtalkId: 504, status: "FAILED" },
    { ...ready, alimtalkId: 505, status: "UNKNOWN" },
  ]);

  expect(row(501).getByText("제출 전")).toBeInTheDocument();
  expect(row(501).getByText("임차인 #42")).toBeInTheDocument();
  expect(row(502).getByText("결과 대기")).toBeInTheDocument();
  expect(row(502).getByText("유저 #9")).toBeInTheDocument();
  for (const id of [501, 502]) expect(row(id).getByRole("button", { name: "미결 종결" })).toBeEnabled();
  for (const id of [503, 504, 505]) expect(row(id).getByRole("button", { name: "미결 종결" })).toBeDisabled();
});

test("READY는 확인 후 FAILED로만 종결하고 메시지 ID를 보내지 않는다", async () => {
  await renderHistory();
  const dialog = await openResolution();
  expect(dialog.getByRole("combobox")).toBeDisabled();
  expect(dialog.queryByLabelText("공급자 메시지 ID (선택)")).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "종결" }));
  expect(await dialog.findByText("종결 내용을 확인하세요.")).toBeInTheDocument();
  expect(mockResolve).not.toHaveBeenCalled();

  const resolved = { ...ready, status: "FAILED" as const, providerCode: "MANUAL" };
  mockResolve.mockResolvedValue(resolved);
  respondWith([resolved]);
  fireEvent.click(dialog.getByRole("checkbox"));
  fireEvent.click(dialog.getByRole("button", { name: "종결" }));

  await waitFor(() => expect(mockResolve).toHaveBeenCalledWith(501, { status: "FAILED" }));
  await waitFor(() => expect(row(501).getByRole("button", { name: "미결 종결" })).toBeDisabled());
  expect(row(501).getByText("MANUAL")).toBeInTheDocument();
});

test.each([
  ["SENT", "SENT · 공급자 접수 확인"],
  ["FAILED", "FAILED · 미접수 확인"],
  ["UNKNOWN", "UNKNOWN · 접수 여부 불명"],
] as const)("PENDING을 확인한 %s 결과로 종결하고 목록을 갱신한다", async (status, label) => {
  await renderHistory([{ ...ready, status: "PENDING" }]);
  const dialog = await openResolution();
  fireEvent.mouseDown(dialog.getByRole("combobox"));
  fireEvent.click(await screen.findByText(label));
  fireEvent.change(dialog.getByLabelText("공급자 메시지 ID (선택)"), { target: { value: "M_123" } });
  fireEvent.click(dialog.getByRole("checkbox"));
  mockResolve.mockResolvedValue({ ...ready, status });
  respondWith([{ ...ready, status }]);
  fireEvent.click(dialog.getByRole("button", { name: "종결" }));

  await waitFor(() => expect(mockResolve).toHaveBeenCalledWith(501, { status, messageId: "M_123" }));
  await waitFor(() => expect(row(501).getByRole("button", { name: "미결 종결" })).toBeDisabled());
});

test("상태 충돌이면 재요청하지 않고 서버의 최신 상태를 다시 표시한다", async () => {
  await renderHistory();
  const dialog = await openResolution();
  fireEvent.click(dialog.getByRole("checkbox"));
  respondWith([{ ...ready, status: "SENT" }]);
  mockResolve.mockRejectedValue(new AxiosError("conflict", undefined, undefined, undefined, {
    data: { type: "/problems/alimtalk-not-pending", title: "종결할 수 없습니다", detail: "이미 처리됨", status: 409 },
    status: 409, statusText: "Conflict", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  }));
  fireEvent.click(dialog.getByRole("button", { name: "종결" }));

  expect(await screen.findByText("상태가 변경되었거나 이미 종결된 요청입니다. 갱신된 이력을 확인하세요.")).toBeInTheDocument();
  await waitFor(() => expect(row(501).getByRole("button", { name: "미결 종결" })).toBeDisabled());
  expect(mockResolve).toHaveBeenCalledTimes(1);
});
