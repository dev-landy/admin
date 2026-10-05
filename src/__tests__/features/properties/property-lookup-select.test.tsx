import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, Button, ConfigProvider, Form } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropertyLookupSelect } from "@/features/properties/components/PropertyLookupSelect";
import { fetchProperties } from "@/features/properties/api";

jest.mock("@/features/properties/api", () => ({ fetchProperties: jest.fn() }));
const fetch = jest.mocked(fetchProperties);

test("건물 선택은 전체 서버에서 이름·주소를 검색하고 숫자는 정확한 ID와 건물 이름을 함께 조회하며 폼에 선택값을 전달한다", async () => {
  const properties = [
    { propertyId: 8, name: "본관", address: null },
    { propertyId: 21, name: "신관", address: "서울" },
    { propertyId: 34, name: "8동", address: "부산" },
  ].map((property) => ({ ...property, userId: 12, userEmail: "a***@example.com", activeTenantCount: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" }));
  fetch.mockImplementation(async (params) => ({
    properties: properties.filter((property) => params.propertyId ? property.propertyId === params.propertyId : !params.keyword || property.name.includes(params.keyword)),
    page: 0, size: params.size ?? 20, totalElements: 2,
  }));
  const submit = jest.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>
    <Form initialValues={{ propertyId: 8 }} onFinish={submit}>
      <Form.Item name="propertyId" label="건물"><PropertyLookupSelect userId={12} /></Form.Item>
      <Button htmlType="submit">조회</Button>
    </Form>
  </App></ConfigProvider></QueryClientProvider>);
  await waitFor(() => expect(fetch).toHaveBeenCalledWith({ page: 1, size: 1, userId: 12, propertyId: 8 }));
  const input = screen.getByRole("combobox", { name: "건물" });
  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: "  신관  " } });
  await waitFor(() => expect(fetch).toHaveBeenCalledWith({ page: 1, size: 20, userId: 12, keyword: "신관" }));
  fireEvent.click(await screen.findByText("#21 · 신관 · 서울", { selector: ".ant-select-item-option-content" }));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenLastCalledWith({ propertyId: 21 }));

  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: "8" } });
  await waitFor(() => expect(fetch).toHaveBeenCalledWith({ page: 1, size: 1, userId: 12, propertyId: 8 }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith({ page: 1, size: 20, userId: 12, keyword: "8" }));
  expect(await screen.findByText("#34 · 8동 · 부산", { selector: ".ant-select-item-option-content" })).toBeVisible();
  fireEvent.click(await screen.findByText("#8 · 본관", { selector: ".ant-select-item-option-content" }));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenLastCalledWith({ propertyId: 8 }));
});
