import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { DuplicateTable } from "@/features/payments/components/DuplicateTable";
import { PaymentTable } from "@/features/payments/components/PaymentTable";
const mockPush = jest.fn();
let mockViewport = "wide";
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
beforeEach(() => { mockViewport = "wide"; jest.clearAllMocks(); });

test("중복 납부 그룹은 같은 임차인·청구월의 비교와 더보기의 개별 납부 조회에서 복귀 조건을 보존한다", async () => {
  const returnPath = "/payments/duplicates?tenantId=7&page=2&size=50";
  render(<ConfigProvider theme={{ token: { motion: false } }}><App><DuplicateTable data={[{ tenantId: 7, billingMonth: "2026-10-01", count: 3, paymentIds: [90, 91, 92], tenantName: "홍길동", propertyId: 8, propertyName: "신관", roomNumber: "A101", userId: 12, userEmail: "landlord@example.com" }]} loading={false} page={2} pageSize={50} total={60} onPageChange={jest.fn()} returnPath={returnPath} /></App></ConfigProvider>);
  expect(screen.getByText("신관")).toBeVisible();
  expect(screen.getByText(/호실 A101/)).toBeVisible();
  expect(screen.getByRole("link", { name: "landlord@example.com" })).toBeVisible();
  const month = new URL(screen.getByRole("link", { name: "납부 비교" }).getAttribute("href")!, "https://landy.internal");
  expect(Object.fromEntries(month.searchParams)).toEqual({ tenantId: "7", from: "2026-10-01", to: "2026-10-01", returnTo: returnPath });
  fireEvent.click(screen.getByRole("button", { name: "임차인 #7 2026년 10월 중복 납부 더보기" }));
  const payment = new URL((await screen.findByRole("link", { name: "납부 #92 보기" })).getAttribute("href")!, "https://landy.internal");
  expect(payment.searchParams.get("paymentId")).toBe("92");
  expect(payment.searchParams.get("returnTo")).toBe(returnPath);
  const tenant = new URL(screen.getByRole("link", { name: "홍길동" }).getAttribute("href")!, "https://landy.internal");
  expect(tenant.pathname).toBe("/tenants/7"); expect(tenant.searchParams.get("returnTo")).toBe(returnPath);
  fireEvent.click(screen.getByRole("link", { name: "납부 비교" }));
  expect(mockPush).toHaveBeenCalledWith(`${month.pathname}${month.search}`);
});

test("모바일 납부 카드는 청구월·원 단위 금액·실제 납부일을 비교하고 대상과 복귀 조건을 유지한다", async () => {
  mockViewport = "mobile";
  const returnPath = "/payments?paidFrom=2026-10-04&propertyId=8&page=3";
  const payment = { paymentId: 90, userId: 12, tenantId: 7, propertyId: 8, propertyName: "신관", tenantName: "홍길동", roomNumber: "A101", userEmail: "landlord@example.com", billingMonth: "2026-09-01", paidAt: "2026-10-05", amount: 512345, paymentSource: "MANUAL" as const, updatedAt: "2026-10-05T12:30:04.123456+09:00" };
  render(<App><PaymentTable data={[payment]} loading={false} page={3} pageSize={20} total={60} filters={{}} onFilterChange={jest.fn()} onPageChange={jest.fn()} returnPath={returnPath} /></App>);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  const card = screen.getByRole("article", { name: "납부 #90 홍길동" });
  expect(within(card).getByText("2026년 9월")).toBeVisible();
  expect(within(card).getByText("512,345원")).toBeVisible();
  expect(within(card).getByText("2026년 10월 5일")).toBeVisible();
  expect(within(card).getByText("수동")).toBeVisible();
  expect(within(card).getByText(/호실 A101/)).toBeVisible();
  const detail = new URL(within(card).getByRole("link", { name: "임차인 보기" }).getAttribute("href")!, "https://landy.internal");
  expect(detail.pathname).toBe("/tenants/7");
  expect(detail.searchParams.get("returnTo")).toBe(returnPath);
  fireEvent.click(within(card).getByText("추가 정보"));
  await waitFor(() => expect(within(card).getByText("2026-10-05 12:30:04.123456+09:00")).toBeVisible());
  expect(within(card).getByText("2026-10-05")).toBeVisible();
});

test("중간 폭 납부 표는 핵심 세 열에서 비교하고 펼쳐 임대인과 정밀 이력을 읽는다", () => {
  mockViewport = "compact";
  const payment = { paymentId: 90, userId: 12, tenantId: 7, tenantName: "홍길동", userEmail: "landlord@example.com", billingMonth: "2026-10-01", paidAt: "2026-10-05", amount: 500000, paymentSource: "MANUAL" as const, updatedAt: "2026-10-05T10:11:12.123456" };
  render(<PaymentTable data={[payment]} loading={false} page={1} pageSize={20} total={1} filters={{}} onFilterChange={jest.fn()} onPageChange={jest.fn()} />);
  expect(screen.getByRole("columnheader", { name: "납부 대상" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "청구월" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "금액·실제 납부일" })).toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: "임대인" })).not.toBeInTheDocument();
  expect(screen.getByText("500,000원")).toBeVisible();
  fireEvent.click(screen.getByRole("row", { name: /홍길동.*500,000원/ }));
  expect(screen.getByRole("link", { name: "landlord@example.com" })).toHaveAttribute("href", expect.stringContaining("/users/12?"));
  expect(screen.getByText("2026-10-05 10:11:12.123456")).toBeVisible();
});

test("모바일 중복 카드의 모든 개별 납부와 같은 임차인의 다른 청구월 비교가 섞이지 않는다", async () => {
  mockViewport = "mobile";
  const returnPath = "/payments/duplicates?tenantId=7&page=2";
  render(<App><DuplicateTable data={[
    { tenantId: 7, tenantName: "홍길동", billingMonth: "2026-10-01", count: 3, paymentIds: [90, 91, 92] },
    { tenantId: 7, tenantName: "홍길동", billingMonth: "2026-11-01", count: 2, paymentIds: [93, 94] },
  ]} loading={false} page={2} pageSize={20} total={22} onPageChange={jest.fn()} returnPath={returnPath} /></App>);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  const october = screen.getByRole("article", { name: "임차인 #7 2026년 10월 중복 납부" });
  const november = screen.getByRole("article", { name: "임차인 #7 2026년 11월 중복 납부" });
  fireEvent.click(within(october).getByText("추가 정보"));
  expect(await within(october).findByRole("link", { name: "납부 #92" })).toBeVisible();
  expect(within(october).queryByRole("link", { name: "납부 #93" })).not.toBeInTheDocument();
  const selected = new URL(within(november).getByRole("link", { name: "납부 비교" }).getAttribute("href")!, "https://landy.internal");
  expect(Object.fromEntries(selected.searchParams)).toEqual({ tenantId: "7", from: "2026-11-01", to: "2026-11-01", returnTo: returnPath });
});

test("납부 목록의 관계 이름은 상세 이동에 사용하고 삭제된 관계는 ID와 납부 이력을 그대로 표시한다", () => {
  const payment = { paymentId: 90, userId: 12, tenantId: 7, billingMonth: "2026-10-01", paidAt: "2026-10-05", amount: 500000, paymentSource: "MANUAL" as const, updatedAt: "2026-10-05" };
  const returnPath = "/payments?paidFrom=2026-10-04&propertyId=8&page=3";
  render(<PaymentTable data={[{ ...payment, propertyId: 8, propertyName: "신관", tenantName: "홍길동", roomNumber: "A101", userEmail: "landlord@example.com" }, { ...payment, paymentId: 91, userId: 13, tenantId: 9 }]} loading={false} page={3} pageSize={20} total={60} filters={{}} onFilterChange={jest.fn()} onPageChange={jest.fn()} returnPath={returnPath} />);
  const tenant = new URL(screen.getByRole("link", { name: "홍길동" }).getAttribute("href")!, "https://landy.internal");
  expect(tenant.pathname).toBe("/tenants/7"); expect(tenant.searchParams.get("returnTo")).toBe(returnPath);
  expect(screen.getByRole("link", { name: "임차인 #9" })).toHaveAttribute("href", expect.stringContaining("/tenants/9?"));
  expect(screen.getByRole("link", { name: "landlord@example.com" })).toBeVisible();
  expect(screen.getByText(/호실 A101/)).toBeVisible();
  expect(screen.getAllByText("2026년 10월")).toHaveLength(2);
  expect(screen.getAllByText("2026년 10월 5일")).toHaveLength(2);
  expect(screen.getAllByText("500,000원")).toHaveLength(2);
  const property = new URL(screen.getByRole("link", { name: "신관" }).getAttribute("href")!, "https://landy.internal");
  expect(property.searchParams.get("propertyTenantsId")).toBe("8");
});

test("같은 임차인의 서로 다른 청구월은 비교 기간과 더보기의 납부 ID가 섞이지 않는다", async () => {
  render(<ConfigProvider theme={{ token: { motion: false } }}><App><DuplicateTable data={[
    { tenantId: 7, billingMonth: "2026-10-01", count: 2, paymentIds: [90, 91] },
    { tenantId: 7, billingMonth: "2026-11-01", count: 2, paymentIds: [92, 93] },
  ]} loading={false} page={1} pageSize={20} total={2} onPageChange={jest.fn()} /></App></ConfigProvider>);
  const rows = screen.getAllByRole("row").slice(1);
  for (const [row, month] of [[rows[0], "2026-10-01"], [rows[1], "2026-11-01"]] as const) {
    const target = new URL(within(row).getByRole("link", { name: "납부 비교" }).getAttribute("href")!, "https://landy.internal");
    expect(target.searchParams.get("tenantId")).toBe("7");
    expect(target.searchParams.get("from")).toBe(month);
    expect(target.searchParams.get("to")).toBe(month);
  }
  fireEvent.click(screen.getByRole("button", { name: "임차인 #7 2026년 11월 중복 납부 더보기" }));
  const novemberPayment = new URL((await screen.findByRole("link", { name: "납부 #93 보기" })).getAttribute("href")!, "https://landy.internal");
  expect(novemberPayment.searchParams.get("paymentId")).toBe("93");
  expect(screen.queryByRole("link", { name: "납부 #90 보기" })).not.toBeInTheDocument();
});
