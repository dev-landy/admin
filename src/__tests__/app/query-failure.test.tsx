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

test.each(pages)("%p 조회 상태가 바뀌어도 최초 실패·캐시 실패·정상 응답을 구분한다", (Page) => {
  const view = render(<Page />);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByText("잠시 후 다시 조회해 주세요.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(mockRetry).toHaveBeenCalledTimes(1);

  mockQuery.mockReturnValue({ data: {}, error: new Error("network"), isLoading: false, isFetching: false, refetch: mockRetry });
  view.rerender(<Page />);
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByText(/마지막으로 조회한 정보/)).toBeInTheDocument();

  mockQuery.mockReturnValue({ data: {}, error: null, isLoading: false, isFetching: false, refetch: mockRetry });
  view.rerender(<Page />);
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.queryByText("잠시 후 다시 조회해 주세요.")).not.toBeInTheDocument();
  expect(screen.queryByText(/마지막으로 조회한 정보/)).not.toBeInTheDocument();
});
