import { render, screen } from "@testing-library/react";

import { PropertyTenantsModal } from "@/features/properties/components/PropertyTenantsModal";

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

jest.mock("@/features/properties/hooks", () => ({
  usePropertyTenants: () => ({
    data: {
      tenants: [
        {
          tenantId: 1,
          userId: 2,
          propertyId: 3,
          name: "홍길동",
          roomNumber: 101,
          phone: "010-0000-0000",
          rentPrice: 500_000,
          depositAmount: 10_000_000,
          paymentDay: 25,
          billingTiming: "PREPAID",
          rentBillingCycle: "YEARLY",
          startDate: "2026-07-01",
          endDate: null,
          notifyEnabled: true,
        },
      ],
      page: 1,
      size: 20,
      totalElements: 1,
    },
    isLoading: false,
  }),
}));

test("건물 소속 임차인의 납부 조건과 계약 시작일을 표시한다", () => {
  render(
    <PropertyTenantsModal
      propertyId={3}
      propertyName="테스트 건물"
      onClose={jest.fn()}
    />,
  );

  expect(screen.getByRole("columnheader", { name: "납부 조건" })).toBeInTheDocument();
  expect(screen.getByText("선불 · 매월 25일")).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "임대료" })).toBeInTheDocument();
  expect(screen.getByText("매년 · 50만원")).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "계약 시작일" })).toBeInTheDocument();
  expect(screen.getByText("2026-07-01")).toBeInTheDocument();
});
