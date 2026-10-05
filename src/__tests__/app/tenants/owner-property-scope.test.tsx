import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import TenantsPage from "@/app/(admin)/tenants/page";
import type { PropertiesListParams } from "@/features/properties/types";

const mockPush = jest.fn();
const mockProperties = jest.fn();
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("page=3&size=50&userId=12&propertyId=8&keyword=홍길동&returnTo=%2Fusers%2F12"),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock("@/features/properties/api", () => ({ fetchProperties: (params: PropertiesListParams) => mockProperties(params) }));
jest.mock("@/features/tenants/hooks", () => ({ useTenants: () => ({
  data: { tenants: [], totalElements: 100, page: 2, size: 50 }, isLoading: false, isFetching: false, error: null, refetch: jest.fn(),
}) }));
jest.mock("@/features/tenants/components/TenantTable", () => ({ TenantTable: () => null }));
jest.mock("@/components/EntityLookupSelect", () => ({ UserLookupSelect: ({ id, value, onChange }: {
  id?: string; value?: number; onChange?: (value?: number) => void;
}) => <input id={id} value={value ?? ""} onChange={(event) => onChange?.(Number(event.target.value) || undefined)} /> }));

test("임대인을 바꾼 뒤 새 건물 검색은 새 소유자 API 범위로 제한하고 이전 건물 대신 새 선택을 조회한다", async () => {
  mockProperties.mockImplementation(async (params: PropertiesListParams) => ({
    properties: params.userId === 13
      ? [{ propertyId: 9, userId: 13, name: "새 임대인 건물" }]
      : [{ propertyId: 8, userId: 12, name: "이전 임대인 건물" }],
    page: 0, size: params.size, totalElements: 1,
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App><TenantsPage /></App></ConfigProvider></QueryClientProvider>);
  await waitFor(() => expect(mockProperties).toHaveBeenCalledWith(expect.objectContaining({ userId: 12, propertyId: 8 })));
  fireEvent.click(screen.getByText(/^상세 조건 (펼치기|접기)$/, { selector: "summary" }));
  fireEvent.change(screen.getByLabelText("임대인"), { target: { value: "13" } });
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "건물" }));
  await waitFor(() => expect(mockProperties).toHaveBeenCalledWith(expect.objectContaining({ userId: 13, page: 1, size: 20 })));
  expect(screen.queryByText("#8 · 이전 임대인 건물", { selector: ".ant-select-item-option-content" })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByText("#9 · 새 임대인 건물", { selector: ".ant-select-item-option-content" }));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  expect(Object.fromEntries(new URLSearchParams(mockPush.mock.calls[0][0]))).toEqual({
    page: "1", size: "50", userId: "13", propertyId: "9", keyword: "홍길동", returnTo: "/users/12",
  });
});
