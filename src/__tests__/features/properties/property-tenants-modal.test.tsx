import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { App, ConfigProvider } from "antd";

import { PropertyTenantsModal } from "@/features/properties/components/PropertyTenantsModal";

const mockTenantQuery = jest.fn();
let mockViewport = "wide";
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
beforeEach(() => { mockViewport = "wide"; mockTenantQuery.mockClear(); });
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/features/properties/hooks", () => ({
  usePropertyTenants: (...args: unknown[]) => { mockTenantQuery(...args); return ({
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
  }); },
}));

test("건물 소속 임차인의 납부 조건과 계약 시작일을 표시한다", async () => {
  render(
    <ConfigProvider theme={{ token: { motion: false } }}><App><PropertyTenantsModal
      propertyId={3}
      propertyName="테스트 건물"
      onClose={jest.fn()}
    /></App></ConfigProvider>,
  );

  expect(screen.getByRole("columnheader", { name: "임대료·납부 조건" })).toBeInTheDocument();
  expect(screen.getByText("선불 · 매월 25일")).toBeInTheDocument();
  expect(screen.getByText("매년 · 50만원")).toBeInTheDocument();
  expect(screen.getByText("보증금 1,000만원")).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "계약" })).toBeInTheDocument();
  expect(screen.getByText(/2026-07-01 → 종료일 없음/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("호실 101 · 임차인 전화 010-0000-0000")).toBeVisible());
});

test("모바일 건물 임차인 모달은 가로 표 없이 연 임대료와 전체 계약·보증금 정보를 읽을 수 있다", async () => {
  mockViewport = "mobile";
  render(<ConfigProvider theme={{ token: { motion: false } }}><App><PropertyTenantsModal propertyId={3} propertyName="테스트 건물" onClose={jest.fn()} /></App></ConfigProvider>);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  const card = screen.getByRole("article", { name: "임차인 #1 홍길동" });
  await waitFor(() => expect(card).toBeVisible());
  expect(within(card).getByText("호실 101 · 임차인 전화 010-0000-0000")).toBeVisible();
  expect(within(card).getByText("매년 · 50만원")).toBeVisible();
  expect(within(card).getByText("선불 · 매월 25일")).toBeVisible();
  expect(within(card).getByRole("link", { name: "상세 보기" })).toHaveAttribute("href", expect.stringContaining("/tenants/1?"));
  fireEvent.click(within(card).getByText("추가 정보"));
  await waitFor(() => expect(within(card).getByText("1,000만원")).toBeVisible());
  expect(within(card).getByText("켜짐")).toBeVisible();
  expect(within(card).getByRole("link", { name: "유저 #2" })).toHaveAttribute("href", expect.stringContaining("/users/2?"));
});

test("건물 소속 임차인은 URL 조건으로 서버 전체를 검색하고 관계 상세에서 같은 모달 상태로 돌아갈 수 있다", async () => {
  function ControlledModal() {
    const [query, setQuery] = useState("propertyTenantsId=3&propertyTenantKeyword=홍길동&propertyTenantContractType=ROOM&propertyTenantContractStatus=ACTIVE&propertyTenantNotifyEnabled=false&propertyPage=2");
    return <PropertyTenantsModal propertyId={3} propertyName="테스트 건물" onClose={jest.fn()} navigation={{ query, returnPath: `/properties?${query}`, update: (changes) => {
      const next = new URLSearchParams(query); for (const [key, value] of Object.entries(changes)) { if (value === undefined) next.delete(key); else next.set(key, value); } setQuery(next.toString());
    } }} />;
  }
  render(<ConfigProvider theme={{ token: { motion: false } }}><App><ControlledModal /></App></ConfigProvider>);
  expect(mockTenantQuery).toHaveBeenLastCalledWith(3, 1, 20, { keyword: "홍길동", contractType: "ROOM", contractStatus: "ACTIVE", notifyEnabled: false });
  const detail = new URL(screen.getByRole("link", { name: "상세 보기" }).getAttribute("href")!, "https://landy.internal");
  expect(detail.searchParams.get("returnTo")).toContain("propertyTenantsId=3");
  expect(detail.searchParams.get("returnTo")).toContain("propertyPage=2");
  fireEvent.change(screen.getByLabelText("이름·전화번호·호실"), { target: { value: "  101  " } });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockTenantQuery).toHaveBeenLastCalledWith(3, 1, 20, { keyword: "101", contractType: "ROOM", contractStatus: "ACTIVE", notifyEnabled: false }));
});
