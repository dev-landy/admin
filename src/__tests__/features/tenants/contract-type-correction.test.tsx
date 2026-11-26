import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider } from "antd";
import { AxiosError, AxiosHeaders } from "axios";

import { propertyKeys } from "@/features/properties/hooks";
import { TenantEditDrawer } from "@/features/tenants/components/TenantEditDrawer";
import { tenantKeys } from "@/features/tenants/hooks";
import type { ContractType, TenantDetail } from "@/features/tenants/types";
import { userKeys } from "@/features/users/hooks";
import { apiClient } from "@/lib/api/client";
import { TENANT } from "@/test-utils/contractDocumentFixtures";

jest.mock("@/lib/api/client", () => ({ apiClient: { patch: jest.fn() } }));

const patch = jest.mocked(apiClient.patch);
const close = jest.fn();
const tenant = { ...TENANT, propertyId: 7, roomNumber: "B102" };
let client: QueryClient;

function Drawer({ record }: { record: TenantDetail }) {
  return <QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}>
    <App><TenantEditDrawer tenant={record} open onClose={close} /></App>
  </ConfigProvider></QueryClientProvider>;
}

async function openCorrection(targetLabel: string) {
  const action = await screen.findByRole("button", { name: "계약 유형 정정" });
  await waitFor(() => expect(action).toBeEnabled());
  fireEvent.click(action);
  return within(await screen.findByRole("dialog", { name: `계약 유형을 ${targetLabel}로 정정할까요?` }));
}

beforeEach(() => {
  jest.resetAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(() => client.clear());

test.each([
  ["ROOM", "COMMERCIAL", "상가", "B102"],
  ["COMMERCIAL", "ROOM", "세대", "B동 1층"],
] as const)("%s에서 %s로 정정하면 기존 호실과 금액을 전송하지 않고 관련 목록을 갱신한다", async (from, to, label, roomNumber) => {
  const affected = [
    tenantKeys.detail(tenant.tenantId), tenantKeys.list({ contractType: from }), tenantKeys.list({ contractType: to }),
    userKeys.tenantPage(tenant.userId, 1, 20), propertyKeys.tenants(tenant.propertyId, 1, 20),
  ];
  const unrelated = [tenantKeys.detail(tenant.tenantId + 1), userKeys.tenantPage(tenant.userId + 1, 1, 20),
    propertyKeys.tenants(tenant.propertyId + 1, 1, 20)];
  for (const key of [...affected, ...unrelated]) client.setQueryData(key, {});
  let resolve!: () => void;
  patch.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }));
  render(<Drawer record={{ ...tenant, contractType: from, roomNumber }} />);
  const confirmation = await openCorrection(label);
  expect(confirmation.getByText(/이전 달의 계약/)).toBeInTheDocument();
  expect(confirmation.getByText(new RegExp(roomNumber))).toBeInTheDocument();
  const confirm = confirmation.getByRole("button", { name: `${label}로 정정` });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
  expect(patch).toHaveBeenCalledWith(`/v1/admin/tenants/${tenant.tenantId}/contract-type`, { contractType: to });
  await waitFor(() => expect(confirmation.getByRole("button", { name: "취소" })).toBeDisabled());
  expect(close).not.toHaveBeenCalled();
  await act(async () => resolve());
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  for (const key of affected) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  for (const key of unrelated) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
});

test("정정을 취소하거나 실패하면 원래 호실을 보존하고 서버 오류를 확인한 뒤 재시도할 수 있다", async () => {
  const detail = "등록한 계약 유형은 변경할 수 없습니다.";
  patch.mockRejectedValueOnce(new AxiosError("rejected", undefined, undefined, undefined, {
    data: { type: "/problems/tenant-contract-type-immutable", title: "유형 정정 불가", detail, status: 422 },
    status: 422, statusText: "Unprocessable Entity", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  }));
  render(<Drawer record={tenant} />);
  const canceled = await openCorrection("상가");
  fireEvent.click(canceled.getByRole("button", { name: "취소" }));
  expect(patch).not.toHaveBeenCalled();
  const confirmation = await openCorrection("상가");
  fireEvent.click(confirmation.getByRole("button", { name: "상가로 정정" }));
  expect(await confirmation.findByText(detail)).toBeInTheDocument();
  expect(screen.getByLabelText("호실")).toHaveValue("102");
  expect(screen.getByLabelText("지하")).toBeChecked();
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(confirmation.getByRole("button", { name: "상가로 정정" }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(patch).toHaveBeenCalledTimes(2);
});

test("저장하지 않은 일반 수정이 있으면 정정을 막고 값이 복원되면 다시 허용한다", async () => {
  render(<Drawer record={tenant} />);
  const edit = await screen.findByLabelText("세입자 이름");
  const correct = screen.getByRole("button", { name: "계약 유형 정정" });
  fireEvent.change(edit, { target: { value: "편집 중" } });
  await waitFor(() => expect(correct).toBeDisabled());
  fireEvent.click(correct);
  expect(patch).not.toHaveBeenCalled();
  expect(edit).toHaveValue("편집 중");
  fireEvent.change(edit, { target: { value: tenant.name } });
  await waitFor(() => expect(correct).toBeEnabled());
});

test("정정 요청 중 수정 대상이 바뀌면 이전 응답으로 새 임차인의 드로어를 닫지 않는다", async () => {
  let resolve!: () => void;
  patch.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }));
  const view = render(<Drawer record={tenant} />);
  const confirmation = await openCorrection("상가");
  fireEvent.click(confirmation.getByRole("button", { name: "상가로 정정" }));
  await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
  view.rerender(<Drawer record={{ ...tenant, tenantId: tenant.tenantId + 1, name: "다른 임차인" }} />);
  await waitFor(() => expect(screen.queryByRole("button", { name: "상가로 정정" })).not.toBeInTheDocument());
  await act(async () => resolve());
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("다른 임차인");
});

test.each<ContractType | null | undefined>(["PARKING", "OTHERS", null, undefined])("유형 %s에서는 정정 버튼을 숨긴다", async (contractType) => {
  render(<Drawer record={{ ...tenant, contractType }} />);
  expect(await screen.findByLabelText("카테고리")).toBeDisabled();
  expect(screen.queryByRole("button", { name: "계약 유형 정정" })).not.toBeInTheDocument();
});
