import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "antd";

import { PropertyTable } from "@/features/properties/components/PropertyTable";
import { UserPropertiesTab } from "@/features/properties/components/UserPropertiesTab";
import "@/test-utils/antd";

const property = { propertyId: 3, userId: 12, userEmail: "a***@example.com", name: "건물", address: null,
  activeTenantCount: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
jest.mock("@/features/properties/hooks", () => ({
  useDeleteProperty: () => ({ mutate: jest.fn(), isPending: false }),
  useUserProperties: () => ({ data: { properties: [property] }, isLoading: false }),
}));
jest.mock("@/features/properties/components/PropertyEditModal", () => ({ PropertyEditModal: () => null }));
jest.mock("@/features/properties/components/PropertyTenantsModal", () => ({ PropertyTenantsModal: () => null }));

test.each(["all", "user"])("%s 건물 목록은 폐기된 기본/일반 구분을 표시하지 않고 실제 삭제 제한을 안내한다", async (kind) => {
  render(<App>{kind === "all"
    ? <PropertyTable data={[property]} loading={false} page={1} pageSize={20} total={1} filters={{}} onPageChange={jest.fn()} onFilterChange={jest.fn()} />
    : <UserPropertiesTab userId={12} />}</App>);
  expect(screen.queryByRole("columnheader", { name: "구분" })).not.toBeInTheDocument();
  expect(screen.queryByText("일반")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  expect(await screen.findByText("마지막 남은 건물이거나 활성 임차인이 있으면 삭제할 수 없습니다.")).toBeInTheDocument();
});
