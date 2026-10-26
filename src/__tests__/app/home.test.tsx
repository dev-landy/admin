import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomePage from "@/app/(admin)/page";
import { useDashboard } from "@/features/dashboard/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fetchSignups } from "@/features/dashboard/signup-api";
import { signupDates } from "@/features/dashboard/signup-range";
jest.mock("@/features/dashboard/signup-api", () => ({ fetchSignups: jest.fn() }));
jest.mock("@/features/dashboard/hooks", () => ({ useDashboard: jest.fn() }));
function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><HomePage /></QueryClientProvider>);
}
const retry = jest.fn();
beforeEach(() => {
  jest.mocked(fetchSignups).mockReset().mockImplementation(async range => ({ ...range, timezone: 'Asia/Seoul', totalCount: 0, dailyCounts: signupDates(range).map(date => ({ date, count: 0 })), generatedAt: '2026-10-25T00:00:00Z' }));
  retry.mockClear();
  jest.mocked(useDashboard).mockReturnValue({
    posthog: { data: { status: "error", code: "wrong_key_type", message: "Personal API Key로 교체하세요." }, error: null, isLoading: false, isFetching: false, refetch: retry },
    retention: { data: undefined, error: null, isLoading: false, isFetching: false, refetch: retry },
    activation: { data: undefined, error: null, isLoading: false, isFetching: false, refetch: retry },
    ads: { data: { status: "error", code: "USER_PERMISSION_DENIED", message: "광고 계정 접근 권한을 확인하세요." }, error: null, isLoading: false, isFetching: false, refetch: retry },
  } as unknown as ReturnType<typeof useDashboard>);
});

test("home keeps unavailable analytics distinct from zero and offers explicitly labeled sample data", () => {
  renderHome();
  expect(screen.getByRole("heading", { name: "홈", level: 1 })).toBeInTheDocument();
  expect(screen.getByText("Personal API Key로 교체하세요.")).toBeInTheDocument();
  expect(screen.getByText("광고 계정 접근 권한을 확인하세요.")).toBeInTheDocument();
  expect(screen.queryByText("342")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("switch", { name: "예시 데이터 보기" }));
  expect(screen.getByText("실제 운영 수치가 아닌 예시 데이터입니다.")).toBeInTheDocument();
  expect(screen.getByText("342")).toBeInTheDocument();
  expect(screen.getAllByText("집계 중").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("switch", { name: "예시 데이터 보기" }));
  expect(screen.queryByText("342")).not.toBeInTheDocument();
});

test("retry requests all analytics and signups and live errors are not hidden by empty cards", async () => {
  renderHome();
  const refresh = screen.getByRole("button", { name: "전체 다시 조회" });
  await waitFor(() => expect(refresh).not.toHaveClass("ant-btn-loading"));
  fireEvent.click(refresh);
  expect(retry).toHaveBeenCalledTimes(4);
  await waitFor(() => expect(fetchSignups).toHaveBeenCalledTimes(2));
  expect(screen.getByText(/PostHog 연결 실패/)).toBeInTheDocument();
  expect(screen.getByText(/Google Ads 연결 실패/)).toBeInTheDocument();
});

test("applying a historical retention period switches the dashboard query", () => {
  renderHome();
  fireEvent.change(screen.getByLabelText("리텐션 시작일"), { target: { value: "2026-08-01" } });
  fireEvent.change(screen.getByLabelText("리텐션 종료일"), { target: { value: "2026-08-31" } });
  fireEvent.click(screen.getByRole("button", { name: "기간 적용" }));
  expect(useDashboard).toHaveBeenLastCalledWith(true, { start: "2026-08-01", end: "2026-08-31" });
  fireEvent.click(screen.getByRole("button", { name: "최근 4주" }));
  expect(useDashboard).toHaveBeenLastCalledWith(true, undefined);
});

test("retention retry applies edited dates instead of refetching the previous period", () => {
  renderHome();
  fireEvent.change(screen.getByLabelText("리텐션 시작일"), { target: { value: "2026-07-06" } });
  fireEvent.change(screen.getByLabelText("리텐션 종료일"), { target: { value: "2026-10-11" } });
  expect(screen.getByText(/변경한 기간이 아직 적용되지 않았습니다/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "리텐션 다시 조회" }));
  expect(useDashboard).toHaveBeenLastCalledWith(true, { start: "2026-07-06", end: "2026-10-11" });
  expect(retry).not.toHaveBeenCalled();
  expect(screen.queryByText(/변경한 기간이 아직 적용되지 않았습니다/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "기간 적용" }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test("retention retry validates the edited period before requesting data", () => {
  renderHome();
  fireEvent.change(screen.getByLabelText("리텐션 시작일"), { target: { value: "2026-09-01" } });
  fireEvent.change(screen.getByLabelText("리텐션 종료일"), { target: { value: "2026-08-01" } });
  fireEvent.click(screen.getByRole("button", { name: "리텐션 다시 조회" }));
  expect(screen.getByText("오늘까지의 날짜로 시작일과 종료일을 선택하세요. 최대 1년까지 조회할 수 있습니다.")).toBeInTheDocument();
  expect(useDashboard).toHaveBeenLastCalledWith(true, undefined);
  expect(retry).not.toHaveBeenCalled();
});
