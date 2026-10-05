import "@/test-utils/antd";
import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "antd";
import PaymentsPage from "@/app/(admin)/payments/page";
import DuplicatesPage from "@/app/(admin)/payments/duplicates/page";
import type { ListSortControl } from "@/lib/navigation/useListSort";

let mockQuery = "";
const mockPush = jest.fn();
const mockParams = jest.fn();
const mockRows = jest.fn();
const mockPayments = [{ paymentId: 9 }, { paymentId: 2 }];
const mockDuplicates = [{ tenantId: 7, billingMonth: "2026-10-01" }, { tenantId: 7, billingMonth: "2026-09-01" }];

jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mockQuery), useRouter: () => ({ push: mockPush, replace: jest.fn() }) }));
jest.mock("@/features/payments/hooks", () => ({
  usePayments: (params: unknown) => { mockParams(params); return { data: { payments: mockPayments, totalElements: 42 }, isLoading: false, isFetching: false }; },
  useDuplicates: (params: unknown) => { mockParams(params); return { data: { duplicates: mockDuplicates, totalElements: 42 }, isLoading: false, isFetching: false }; },
}));
jest.mock("@/components/EntityLookupSelect", () => {
  const Lookup = ({ id }: { id?: string }) => <input id={id} />;
  return { UserLookupSelect: Lookup, TenantLookupSelect: Lookup };
});
jest.mock("@/features/properties/components/PropertyLookupSelect", () => ({ PropertyLookupSelect: ({ id }: { id?: string }) => <input id={id} /> }));
jest.mock("@/features/payments/components/PaymentTable", () => {
  const { ListSortSelect } = jest.requireActual("@/components/ListSortSelect");
  return { PaymentTable: ({ data, sortControl }: { data: unknown; sortControl: ListSortControl }) => { mockRows(data); return <ListSortSelect {...sortControl} label="납부 목록" />; } };
});
jest.mock("@/features/payments/components/DuplicateTable", () => {
  const { ListSortSelect } = jest.requireActual("@/components/ListSortSelect");
  return { DuplicateTable: ({ data, sortControl }: { data: unknown; sortControl: ListSortControl }) => { mockRows(data); return <ListSortSelect {...sortControl} label="중복 납부 목록" />; } };
});
beforeEach(() => jest.clearAllMocks());

test.each([
  ["payments", "납부 목록", "userId=12&paidFrom=2026-10-01", "paidAt", mockPayments],
  ["duplicates", "중복 납부 목록", "tenantId=7", "tenantId", mockDuplicates],
] as const)("%s는 기본 API 순서를 보존하고 정렬 선택을 전체 조회 요청과 첫 페이지에 반영한다", (kind, label, filters, field, rows) => {
  mockQuery = `page=3&size=20&${filters}&returnTo=%2Fusers`;
  const tree = () => <App>{kind === "payments" ? <PaymentsPage /> : <DuplicatesPage />}</App>;
  const view = render(tree());
  expect(mockParams.mock.calls.at(-1)![0]).not.toHaveProperty("sort");
  expect(mockRows.mock.calls.at(-1)![0]).toBe(rows);
  fireEvent.change(screen.getByRole("combobox", { name: `${label} 정렬 기준` }), { target: { value: field } });
  const next = new URLSearchParams(mockPush.mock.calls.at(-1)![0]);
  expect(next.get("page")).toBe("1");
  expect(next.get("size")).toBe("20");
  expect(next.get("sort")).toBe(`${field},desc`);
  expect(next.get("returnTo")).toBe("/users");
  for (const [key, value] of new URLSearchParams(filters)) expect(next.get(key)).toBe(value);
  mockQuery = next.toString();
  view.rerender(tree());
  expect(mockParams.mock.calls.at(-1)![0]).toMatchObject({ page: 1, size: 20, sort: `${field},desc` });
  expect(mockRows.mock.calls.at(-1)![0]).toBe(rows);
});
