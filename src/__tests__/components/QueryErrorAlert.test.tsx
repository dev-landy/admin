import { fireEvent, render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";

import { QueryErrorAlert } from "@/components/QueryErrorAlert";

test("오류가 없으면 안내를 렌더하지 않는다", () => {
  const { container } = render(<QueryErrorAlert error={null} onRetry={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});

test("서버 오류 설명과 재조회를 제공하고 이전 데이터 표시를 알린다", () => {
  const retry = jest.fn();
  const error = new AxiosError("failed", undefined, undefined, undefined, {
    data: { type: "/problems/unavailable", title: "조회 실패", detail: "일시적인 오류입니다.", status: 503 },
    status: 503, statusText: "Unavailable", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  });
  render(<QueryErrorAlert error={error} onRetry={retry} hasData />);
  expect(screen.getByText("일시적인 오류입니다.")).toBeInTheDocument();
  expect(screen.getByText(/마지막으로 조회한 정보/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test("재조회 중에는 중복 요청을 잠근다", () => {
  const retry = jest.fn();
  render(<QueryErrorAlert error={new Error("network")} onRetry={retry} isRetrying />);
  expect(screen.getByRole("button", { name: /다시 조회/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /다시 조회/ }));
  expect(retry).not.toHaveBeenCalled();
});
