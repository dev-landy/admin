import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TenantDetailCard } from "@/features/tenants/components/TenantDetailCard";
import type { TenantDetail } from "@/features/tenants/types";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

const mockUpdateTenant = jest.fn();

jest.mock("@/features/tenants/hooks", () => ({
  useDeleteTenant: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateTenant: () => ({ mutate: mockUpdateTenant, isPending: false }),
}));

jest.mock("@/features/tenants/components/TenantEditDrawer", () => ({
  TenantEditDrawer: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

const tenant: TenantDetail = {
  tenantId: 30,
  userId: 12,
  name: "홍길동",
  roomNumber: "101",
  phone: "010-1234-5678",
  rentPrice: 500_000,
  maintenanceFee: 50_000,
  depositAmount: 10_000_000,
  paymentDay: 5,
  billingTiming: "POSTPAID",
  rentBillingCycle: "MONTHLY",
  startDate: "2026-01-01",
  endDate: null,
  notifyEnabled: true,
  dueAlimtalkEnabled: false,
  createdAt: "2026-01-01T09:00:00",
  updatedAt: "2026-06-10T09:00:00",
};

beforeEach(() => {
  mockUpdateTenant.mockReset();
});

test("임대인 푸시와 별도인 납부일 알림톡을 표시하고 켜면 해당 값만 수정한다", async () => {
  render(<TenantDetailCard tenant={tenant} />);

  expect(screen.getByText("납부일 알림톡")).toBeInTheDocument();
  expect(screen.getByRole("switch")).not.toBeChecked();
  fireEvent.click(screen.getByRole("switch"));

  await waitFor(() => {
    expect(mockUpdateTenant).toHaveBeenCalledWith({ dueAlimtalkEnabled: true }, expect.any(Object));
  });
});
