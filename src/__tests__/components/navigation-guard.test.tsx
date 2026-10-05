import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { NavigationGuardProvider, useNavigationGuard, useUnsavedChanges } from "@/components/NavigationGuard";

function Editor() {
  const [value, setValue] = useState("");
  const clear = useUnsavedChanges(value !== "");
  const { requestNavigation } = useNavigationGuard();
  return <>
    <input aria-label="검수 입력" value={value} onChange={(event) => setValue(event.target.value)} />
    <button onClick={() => requestNavigation(() => window.history.pushState({ __NA: true }, "", "/users"))}>메뉴 이동</button>
    <button onClick={clear}>처리 성공</button>
    <a href="/properties" onClick={(event) => event.preventDefault()}>내부 링크</a>
  </>;
}
let confirm: jest.SpyInstance;
beforeEach(() => {
  window.history.replaceState({ __NA: true, preserved: "Next state" }, "", "/contract-documents?page=2&size=50");
  confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
});
afterEach(() => confirm.mockRestore());
function renderEditor() {
  render(<NavigationGuardProvider><Editor /></NavigationGuardProvider>);
}

test("변경이 없는 이동은 바로 허용하고 변경 후 취소하면 입력과 경로를 유지한다", () => {
  renderEditor();
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).not.toHaveBeenCalled();
  expect(window.location.pathname).toBe("/users");
  fireEvent.change(screen.getByLabelText("검수 입력"), { target: { value: "작성 중" } });
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("검수 입력")).toHaveValue("작성 중");
  expect(window.location.pathname).toBe("/users");
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).toHaveBeenCalledTimes(2);
});

test("브라우저 뒤로가기 취소는 Next listener에 전달하지 않고 같은 history entry와 입력을 복원한다", async () => {
  renderEditor();
  const listState = window.history.state;
  window.history.pushState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { review: true } }, "", "/contract-documents/document-1");
  const reviewState = window.history.state;
  fireEvent.change(screen.getByLabelText("검수 입력"), { target: { value: "유지할 내용" } });
  const nextListener = jest.fn();
  window.addEventListener("popstate", nextListener);
  try {
    act(() => window.history.back());
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.pathname).toBe("/contract-documents/document-1"));
    expect(window.history.state).toEqual(reviewState);
    expect(nextListener).not.toHaveBeenCalled();
    expect(screen.getByLabelText("검수 입력")).toHaveValue("유지할 내용");
    confirm.mockReturnValue(true);
    act(() => window.history.back());
    await waitFor(() => expect(nextListener).toHaveBeenCalledTimes(1));
    expect(window.location.href).toContain("/contract-documents?page=2&size=50");
    expect(window.history.state).toEqual(listState);
  } finally { window.removeEventListener("popstate", nextListener); }
});

test("새로고침은 변경이 있을 때만 native 이탈 확인을 요청하고 처리 성공 후 해제한다", () => {
  renderEditor();
  const clean = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
  fireEvent.change(screen.getByLabelText("검수 입력"), { target: { value: "변경" } });
  const dirty = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(dirty);
  expect(dirty.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "처리 성공" }));
  const saved = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(saved);
  expect(saved.defaultPrevented).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).not.toHaveBeenCalled();
});

test("브라우저 앞으로가기 취소도 현재 목록 entry로 복원한다", async () => {
  renderEditor();
  window.history.pushState({ __NA: true }, "", "/contract-documents/document-1");
  act(() => window.history.back());
  await waitFor(() => expect(window.location.pathname).toBe("/contract-documents"));
  fireEvent.change(screen.getByLabelText("검수 입력"), { target: { value: "현재 입력" } });
  act(() => window.history.forward());
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(window.location.pathname).toBe("/contract-documents"));
  expect(screen.getByLabelText("검수 입력")).toHaveValue("현재 입력");
});

test("직접 진입해 이전 entry에 앱 index가 없어도 뒤로가기 취소는 현재 상세를 복원한다", async () => {
  window.history.pushState({ __NA: true, preserved: "direct route" }, "", "/contract-documents/direct-document");
  renderEditor();
  fireEvent.change(screen.getByLabelText("검수 입력"), { target: { value: "직접 진입 입력" } });
  act(() => window.history.back());
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(window.location.pathname).toBe("/contract-documents/direct-document"));
  expect(window.history.state.preserved).toBe("direct route");
  expect(screen.getByLabelText("검수 입력")).toHaveValue("직접 진입 입력");
});

test("같은 탭의 내부 링크는 보호하고 새 탭 클릭과 원래 값 복구는 경고하지 않는다", () => {
  renderEditor();
  fireEvent.change(screen.getByLabelText("검수 입력"), { target: { value: "변경" } });
  expect(fireEvent.click(screen.getByRole("link", { name: "내부 링크" }))).toBe(false);
  expect(confirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("link", { name: "내부 링크" }), { ctrlKey: true });
  expect(confirm).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("검수 입력"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).toHaveBeenCalledTimes(1);
});
