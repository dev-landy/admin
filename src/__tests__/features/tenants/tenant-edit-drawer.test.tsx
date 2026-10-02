import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import { AxiosError, AxiosHeaders } from "axios";

import { TenantEditDrawer } from "@/features/tenants/components/TenantEditDrawer";
import { updateTenant } from "@/features/tenants/api";
import { TENANT } from "@/test-utils/contractDocumentFixtures";
import type { TenantDetail } from "@/features/tenants/types";

jest.mock("@/features/tenants/api", () => ({ updateTenant: jest.fn() }));
const mockUpdate = jest.mocked(updateTenant);
const onClose = jest.fn();
let client: QueryClient;

function overlapError() {
  return new AxiosError("contract overlap", undefined, undefined, undefined, {
    data: { type: "/problems/tenant-room-number-duplicated", title: "계약 기간 중복", detail: "기존 계약과 기간이 겹칩니다.", status: 409 },
    status: 409, statusText: "Conflict", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  });
}

function Drawer({ tenant = TENANT, open = true }: { tenant?: TenantDetail; open?: boolean }) {
  return <QueryClientProvider client={client}><App><TenantEditDrawer tenant={tenant} open={open} onClose={onClose} /></App></QueryClientProvider>;
}

async function submitChangedName(name = "수정할 이름") {
  fireEvent.change(await screen.findByLabelText("세입자 이름"), { target: { value: name } });
  const submit = screen.getByRole("button", { name: "수정" });
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
}

beforeEach(() => {
  jest.resetAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mockUpdate.mockResolvedValue();
});
afterEach(() => client.clear());

test("일반 수정은 한 번 저장하고 중복 확인창 없이 닫는다", async () => {
  render(<Drawer />);
  await submitChangedName();
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty("allowContractOverlap");
  expect(screen.queryByRole("button", { name: "겹쳐도 수정" })).not.toBeInTheDocument();
});

test("중복 확인 중에는 입력과 중복 제출을 막고 승인한 요청만 한 번 재시도한다", async () => {
  mockUpdate.mockRejectedValueOnce(overlapError());
  render(<Drawer />);
  await submitChangedName();
  const confirmation = (await screen.findByRole("button", { name: "겹쳐도 수정" })).closest('[role="dialog"]') as HTMLElement;
  const request = mockUpdate.mock.calls[0][1];
  expect(screen.getByLabelText("세입자 이름")).toBeDisabled();
  expect(within(screen.getByLabelText("세입자 이름").closest("form")!).getByRole("button", { name: /수정$/, hidden: true })).toBeDisabled();
  await act(async () => fireEvent.submit(screen.getByLabelText("세입자 이름").closest("form")!));
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  fireEvent.click(within(confirmation).getByRole("button", { name: "겹쳐도 수정" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(mockUpdate).toHaveBeenCalledTimes(2);
  expect(mockUpdate.mock.calls[1]).toEqual([TENANT.tenantId, { ...request, allowContractOverlap: true }]);
});

test("취소 후에는 입력을 유지하고 변경한 다음 요청의 중복을 다시 확인한다", async () => {
  mockUpdate.mockRejectedValue(overlapError());
  render(<Drawer />);
  await submitChangedName();
  const confirmation = (await screen.findByRole("button", { name: "겹쳐도 수정" })).closest('[role="dialog"]') as HTMLElement;
  fireEvent.click(within(confirmation).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "겹쳐도 수정" })).not.toBeInTheDocument());
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("수정할 이름");
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
  await submitChangedName("다음 요청 이름");
  (await screen.findByRole("button", { name: "겹쳐도 수정" })).closest('[role="dialog"]') as HTMLElement;
  expect(mockUpdate.mock.calls[1][1]).toMatchObject({ name: "다음 요청 이름" });
  expect(mockUpdate.mock.calls[1][1]).not.toHaveProperty("allowContractOverlap");
});

test("승인 후 재시도 실패는 오류를 표시하며 이후 저장에는 승인을 재사용하지 않는다", async () => {
  mockUpdate.mockRejectedValue(overlapError());
  render(<Drawer />);
  await submitChangedName();
  const confirmation = (await screen.findByRole("button", { name: "겹쳐도 수정" })).closest('[role="dialog"]') as HTMLElement;
  fireEvent.click(within(confirmation).getByRole("button", { name: "겹쳐도 수정" }));
  expect(await screen.findByText("계약 기간 중복")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("button", { name: "겹쳐도 수정" })).not.toBeInTheDocument());
  expect(mockUpdate).toHaveBeenCalledTimes(2);
  expect(onClose).not.toHaveBeenCalled();
  await submitChangedName("재입력한 이름");
  (await screen.findByRole("button", { name: "겹쳐도 수정" })).closest('[role="dialog"]') as HTMLElement;
  expect(mockUpdate).toHaveBeenCalledTimes(3);
  expect(mockUpdate.mock.calls[2][1]).not.toHaveProperty("allowContractOverlap");
});

test("확인 중 다른 임차인으로 바뀌면 이전 확인창을 닫고 이전 요청을 재시도하지 않는다", async () => {
  mockUpdate.mockRejectedValueOnce(overlapError());
  const view = render(<Drawer />);
  await submitChangedName();
  (await screen.findByRole("button", { name: "겹쳐도 수정" })).closest('[role="dialog"]') as HTMLElement;
  view.rerender(<Drawer tenant={{ ...TENANT, tenantId: 10, name: "다른 임차인" }} />);
  await waitFor(() => expect(screen.queryByRole("button", { name: "겹쳐도 수정" })).not.toBeInTheDocument());
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
  await submitChangedName("다른 임차인 수정");
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  expect(mockUpdate.mock.calls[1][0]).toBe(10);
  expect(mockUpdate.mock.calls[1][1]).not.toHaveProperty("allowContractOverlap");
});

test("화면을 닫은 뒤 도착한 중복 오류로 확인창이나 재시도를 만들지 않는다", async () => {
  let reject!: (error: unknown) => void;
  mockUpdate.mockImplementationOnce(() => new Promise((_, rejectRequest) => { reject = rejectRequest; }));
  const view = render(<Drawer />);
  await submitChangedName();
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  view.rerender(<Drawer open={false} />);
  await act(async () => reject(overlapError()));
  expect(screen.queryByRole("button", { name: "겹쳐도 수정" })).not.toBeInTheDocument();
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});
