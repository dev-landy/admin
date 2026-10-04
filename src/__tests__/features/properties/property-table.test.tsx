import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "antd";

import { PropertyTable } from "@/features/properties/components/PropertyTable";
import { UserPropertiesTab } from "@/features/properties/components/UserPropertiesTab";
import "@/test-utils/antd";

const property = { propertyId: 3, userId: 12, userEmail: "a***@example.com", name: "건물", address: null,
  activeTenantCount: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
let mockUserProperties = [property];
jest.mock("@/features/properties/hooks", () => ({
  useDeleteProperty: () => ({ mutate: jest.fn(), isPending: false }),
  useUserProperties: () => ({ data: { properties: mockUserProperties }, isLoading: false }),
}));
jest.mock("@/features/properties/components/PropertyEditModal", () => ({ PropertyEditModal: () => null }));
jest.mock("@/features/properties/components/PropertyTenantsModal", () => ({ PropertyTenantsModal: () => null }));

beforeEach(() => { mockUserProperties = [property]; });

test.each(["all", "user"])("%s 건물 목록은 폐기된 기본/일반 구분을 표시하지 않고 실제 삭제 제한을 안내한다", async (kind) => {
  render(<App>{kind === "all"
    ? <PropertyTable data={[property]} loading={false} page={1} pageSize={20} total={1} filters={{}} onPageChange={jest.fn()} onFilterChange={jest.fn()} />
    : <UserPropertiesTab userId={12} />}</App>);
  expect(screen.queryByRole("columnheader", { name: "구분" })).not.toBeInTheDocument();
  expect(screen.queryByText("일반")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  expect(await screen.findByText("마지막 남은 건물이거나 활성 임차인이 있으면 삭제할 수 없습니다.")).toBeInTheDocument();
});

test("사용자 건물 목록은 응답 순서를 유지하며 20건씩 표시하고 마지막 페이지가 줄면 유효한 페이지로 돌아온다", () => {
  mockUserProperties = Array.from({ length: 21 }, (_, index) => ({ ...property, propertyId: index + 1, name: `건물 ${index + 1}` }));
  const view = render(<App><UserPropertiesTab userId={12} /></App>);
  expect(screen.getAllByRole("row")).toHaveLength(21); // 제목 1행과 현재 페이지 20행.
  expect(screen.getByText("건물 1")).toBeVisible();
  expect(screen.queryByText("건물 21")).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle("Next Page"));
  expect(screen.getByText("건물 21")).toBeVisible();
  expect(screen.queryByText("건물 1")).not.toBeInTheDocument();

  mockUserProperties = mockUserProperties.slice(0, 20);
  view.rerender(<App><UserPropertiesTab userId={12} /></App>);
  expect(screen.getByText("건물 1")).toBeVisible();
  expect(screen.queryByText("건물 21")).not.toBeInTheDocument();
});
