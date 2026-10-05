import "@/test-utils/antd";
import { createRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { RefreshButton } from "@/components/RefreshButton";

function shell(children: React.ReactNode) {
  return <ConfigProvider theme={{ token: { motion: false } }}>{children}</ConfigProvider>;
}

test("새로고침 대기 중에는 중복 클릭을 차단하고 완료되면 같은 이름의 버튼으로 다시 조회한다", async () => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const refetch = jest.fn(() => Promise.resolve()).mockReturnValueOnce(pending);
  function Workspace() {
    const [loading, setLoading] = useState(false);
    return <RefreshButton loading={loading} onClick={async () => {
      setLoading(true);
      try { await refetch(); } finally { setLoading(false); }
    }} />;
  }
  render(shell(<Workspace />));
  const button = screen.getByRole("button", { name: "새로고침" });
  fireEvent.click(button);
  expect(refetch).toHaveBeenCalledTimes(1);
  expect(button).toHaveAccessibleName("새로고침");
  fireEvent.click(button);
  expect(refetch).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
  expect(screen.getByRole("button", { name: "새로고침" })).toBe(button);
  await act(async () => { fireEvent.click(button); });
  expect(refetch).toHaveBeenCalledTimes(2);
});

test("사용자 지정 내용·접근성 설명·ref를 유지하고 명시적인 disabled 상태를 전달한다", () => {
  const reference = createRef<HTMLButtonElement | HTMLAnchorElement>();
  const onClick = jest.fn();
  const control = (disabled: boolean) => <>
    <span id="refresh-help">현재 조회 조건으로 알림 목록을 다시 불러옵니다.</span>
    <RefreshButton ref={reference} disabled={disabled} aria-label="인앱 알림 새로고침" aria-describedby="refresh-help" onClick={onClick}>
      <span>알림 목록 다시 조회</span>
    </RefreshButton>
  </>;
  const view = render(shell(control(true)));
  const button = screen.getByRole("button", { name: "인앱 알림 새로고침" });
  expect(button).toHaveTextContent("알림 목록 다시 조회");
  expect(button).toHaveAccessibleDescription("현재 조회 조건으로 알림 목록을 다시 불러옵니다.");
  expect(reference.current).toBe(button);
  expect(reference.current).toBeInstanceOf(HTMLButtonElement);
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
  view.rerender(shell(control(false)));
  expect(button).toBeEnabled();
  act(() => reference.current?.focus());
  expect(button).toHaveFocus();
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("객체 형태의 로딩 지연을 보존하고 로딩이 시작된 뒤에는 클릭을 차단한다", () => {
  jest.useFakeTimers();
  try {
    const refetch = jest.fn();
    const view = render(shell(<RefreshButton loading={{ delay: 200 }} onClick={refetch} />));
    const button = screen.getByRole("button", { name: "새로고침" });
    fireEvent.click(button);
    expect(refetch).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(200));
    expect(button).toHaveAccessibleName("새로고침");
    fireEvent.click(button);
    expect(refetch).toHaveBeenCalledTimes(1);
    view.rerender(shell(<RefreshButton loading={false} onClick={refetch} />));
    fireEvent.click(button);
    expect(refetch).toHaveBeenCalledTimes(2);
  } finally {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  }
});

test("폼 안의 새로고침은 검색 초안을 제출하지 않고 지정한 조회 동작만 실행한다", () => {
  const refetch = jest.fn();
  const submit = jest.fn();
  render(shell(<form onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <input aria-label="검색 초안" defaultValue="입력 중인 조건" />
    <RefreshButton onClick={refetch}>목록 다시 조회</RefreshButton>
    <button type="submit">검색 제출</button>
  </form>));
  fireEvent.click(screen.getByRole("button", { name: "목록 다시 조회" }));
  expect(refetch).toHaveBeenCalledTimes(1);
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox", { name: "검색 초안" })).toHaveValue("입력 중인 조건");
  fireEvent.click(screen.getByRole("button", { name: "검색 제출" }));
  expect(submit).toHaveBeenCalledTimes(1);
});
