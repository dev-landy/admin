import "@/test-utils/antd";
import { fireEvent, render, screen } from "@testing-library/react";
import HomePage from "@/app/(admin)/page";
import { useDashboard } from "@/features/dashboard/hooks";
jest.mock("@/features/dashboard/hooks", () => ({ useDashboard: jest.fn() }));
const retry = jest.fn();
beforeEach(() => {
  jest.mocked(useDashboard).mockReturnValue({
    posthog: { data: { status: "error", code: "wrong_key_type", message: "Personal API Key로 교체하세요." }, error: null, isLoading: false, isFetching: false, refetch: retry },
    retention: { data: undefined, error: null, isLoading: false, isFetching: false, refetch: retry },
    activation: { data: undefined, error: null, isLoading: false, isFetching: false, refetch: retry },
    ads: { data: { status: "error", code: "USER_PERMISSION_DENIED", message: "광고 계정 접근 권한을 확인하세요." }, error: null, isLoading: false, isFetching: false, refetch: retry },
  } as unknown as ReturnType<typeof useDashboard>);
});

test("home keeps unavailable analytics distinct from zero and offers explicitly labeled sample data", () => {
  render(<HomePage />);
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

test("retry requests both providers and live errors are not hidden by empty cards", () => {
  render(<HomePage />);
  fireEvent.click(screen.getByRole("button", { name: "전체 다시 조회" }));
  expect(retry).toHaveBeenCalledTimes(4);
  expect(screen.getByText(/PostHog 연결 실패/)).toBeInTheDocument();
  expect(screen.getByText(/Google Ads 연결 실패/)).toBeInTheDocument();
});

test("applying a historical retention period switches the dashboard query", () => {
  render(<HomePage />);
  fireEvent.change(screen.getByLabelText("리텐션 시작일"), { target: { value: "2026-08-01" } });
  fireEvent.change(screen.getByLabelText("리텐션 종료일"), { target: { value: "2026-08-31" } });
  fireEvent.click(screen.getByRole("button", { name: "기간 적용" }));
  expect(useDashboard).toHaveBeenLastCalledWith(true, { start: "2026-08-01", end: "2026-08-31" });
  fireEvent.click(screen.getByRole("button", { name: "최근 4주" }));
  expect(useDashboard).toHaveBeenLastCalledWith(true, undefined);
});
