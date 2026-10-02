import { fireEvent, render, screen } from "@testing-library/react";

import UsersPage from "@/app/(admin)/users/page";
import PropertiesPage from "@/app/(admin)/properties/page";
import TenantsPage from "@/app/(admin)/tenants/page";
import PaymentsPage from "@/app/(admin)/payments/page";
import DuplicatesPage from "@/app/(admin)/payments/duplicates/page";
import BatchSchedulesPage from "@/app/(admin)/batch/schedules/page";

const mockQuery = jest.fn();
const mockRetry = jest.fn();
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/features/users/hooks", () => ({ useUsers: () => mockQuery() }));
jest.mock("@/features/properties/hooks", () => ({ useProperties: () => mockQuery() }));
jest.mock("@/features/tenants/hooks", () => ({ useTenants: () => mockQuery() }));
jest.mock("@/features/payments/hooks", () => ({ usePayments: () => mockQuery(), useDuplicates: () => mockQuery() }));
jest.mock("@/features/batch/hooks", () => ({ useBatchSchedules: () => mockQuery() }));
jest.mock("@/features/users/components/UserTable", () => ({ UserTable: () => <div role="table">조회 결과</div> }));
jest.mock("@/features/properties/components/PropertyTable", () => ({ PropertyTable: () => <div role="table">조회 결과</div> }));
jest.mock("@/features/tenants/components/TenantTable", () => ({ TenantTable: () => <div role="table">조회 결과</div> }));
jest.mock("@/features/payments/components/PaymentTable", () => ({ PaymentTable: () => <div role="table">조회 결과</div> }));
jest.mock("@/features/payments/components/DuplicateTable", () => ({ DuplicateTable: () => <div role="table">조회 결과</div> }));
jest.mock("@/features/batch/components/BatchScheduleTable", () => ({ BatchScheduleTable: () => <div role="table">조회 결과</div> }));

const pages = [UsersPage, PropertiesPage, TenantsPage, PaymentsPage, DuplicatesPage, BatchSchedulesPage];
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockReturnValue({ data: undefined, error: new Error("network"), isLoading: false, isFetching: false, refetch: mockRetry });
});

test.each(pages)("%p 최초 조회 실패는 빈 목록으로 표시하지 않고 재조회할 수 있다", (Page) => {
  render(<Page />);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByText("잠시 후 다시 조회해 주세요.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(mockRetry).toHaveBeenCalledTimes(1);
});

test.each(pages)("%p 캐시가 있는 재조회 실패는 이전 목록과 오류를 함께 표시한다", (Page) => {
  mockQuery.mockReturnValue({ data: {}, error: new Error("network"), isLoading: false, isFetching: false, refetch: mockRetry });
  render(<Page />);
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByText(/마지막으로 조회한 정보/)).toBeInTheDocument();
});

test.each(pages)("%p 정상 빈 응답은 오류 없이 목록으로 표시한다", (Page) => {
  mockQuery.mockReturnValue({ data: {}, error: null, isLoading: false, isFetching: false, refetch: mockRetry });
  render(<Page />);
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.queryByText("잠시 후 다시 조회해 주세요.")).not.toBeInTheDocument();
});
