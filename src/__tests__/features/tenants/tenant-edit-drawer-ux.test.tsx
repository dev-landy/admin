import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider } from "antd";

import { TenantEditDrawer } from "@/features/tenants/components/TenantEditDrawer";
import { updateTenant } from "@/features/tenants/api";
import { TENANT } from "@/test-utils/contractDocumentFixtures";
import type { TenantDetail } from "@/features/tenants/types";

jest.mock("@/features/tenants/api", () => ({ updateTenant: jest.fn() }));
const mockUpdate = jest.mocked(updateTenant);
const onClose = jest.fn();
let client: QueryClient;
function Drawer({ tenant = TENANT }: { tenant?: TenantDetail }) {
  return <QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App><TenantEditDrawer tenant={tenant} open onClose={onClose} /></App></ConfigProvider></QueryClientProvider>;
}
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mockUpdate.mockResolvedValue();
});
afterEach(() => client.clear());

test("배경 재조회와 수정 취소에서 초안을 유지하고 버리기를 승인해야 닫힌다", async () => {
  const view = render(<Drawer />);
  fireEvent.change(await screen.findByLabelText("세입자 이름"), { target: { value: "보존할 이름" } });
  view.rerender(<Drawer tenant={{ ...TENANT, name: "서버에서 갱신한 이름" }} />);
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("보존할 이름");
  await waitFor(() => expect(screen.getByRole("button", { name: "수정" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(await screen.findByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "계속 수정" }));
  await waitFor(() => expect(screen.queryAllByText("수정 중인 내용을 버릴까요?")).toHaveLength(0));
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("보존할 이름");
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  fireEvent.click(await screen.findByRole("button", { name: "변경 내용 버리기" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test("저장 요청 중에는 취소와 닫기를 잠그고 실패하면 초안을 유지한다", async () => {
  let reject!: (error: Error) => void;
  mockUpdate.mockImplementationOnce(() => new Promise((_, rejectRequest) => { reject = rejectRequest; }));
  render(<Drawer />);
  const name = await screen.findByLabelText("세입자 이름");
  await act(async () => {
    fireEvent.change(name, { target: { value: "저장할 이름" } });
    // useWatch의 배치 알림까지 마친 뒤 실제 dirty UI를 검사한다.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  await waitFor(() => expect(screen.getByRole("button", { name: "수정" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  await act(async () => reject(new Error("network")));
  expect(await screen.findByText("수정 실패")).toBeInTheDocument();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("저장할 이름");
  expect(screen.getByRole("button", { name: "취소" })).toBeEnabled();
  expect(onClose).not.toHaveBeenCalled();
});

test("아직 날짜로 확정되지 않은 입력도 취소 전에 버리기를 확인한다", async () => {
  render(<Drawer />);
  const input = await screen.findByLabelText("계약 시작일");
  fireEvent.change(input, { target: { value: "202610" } });
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(await screen.findByRole("button", { name: "계속 수정" })).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "계속 수정" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "계속 수정" })).not.toBeInTheDocument());
});
