import "@/test-utils/antd";
import { createRef, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "antd";
import { Grid } from "antd";
import { ContractDocumentActions } from "@/features/contract-ocr/components/ContractDocumentActions";

class TestVisualViewport extends EventTarget {
  height = 900;
  offsetTop = 0;

  change(event: "resize" | "scroll", height: number, offsetTop: number) {
    this.height = height;
    this.offsetTop = offsetTop;
    act(() => this.dispatchEvent(new Event(event)));
  }
}

const originalInnerHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");
const originalVisualViewport = Object.getOwnPropertyDescriptor(window, "visualViewport");
let viewport: TestVisualViewport;

function restoreWindowProperty(name: "innerHeight" | "visualViewport", descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(window, name, descriptor);
  else Reflect.deleteProperty(window, name);
}

function renderActions(children: ReactNode = <><Button>계약 등록</Button><Button>반려</Button></>, fields: ReactNode = <><input aria-label="연락처" /><input aria-label="이름" /></>) {
  const ref = createRef<HTMLDivElement>();
  return { ref, ...render(<>{fields}<ContractDocumentActions ref={ref}>{children}</ContractDocumentActions><button>입력 종료</button></>) };
}

beforeEach(() => {
  viewport = new TestVisualViewport();
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  jest.spyOn(Grid, "useBreakpoint").mockReturnValue({ xl: false });
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  restoreWindowProperty("innerHeight", originalInnerHeight);
  restoreWindowProperty("visualViewport", originalVisualViewport);
});

test("모바일 입력 중 액션을 문서 흐름에 두고 키보드 높이나 화면 이동을 따라 올리지 않는다", () => {
  const { ref } = renderActions();
  expect(ref.current).toContainElement(screen.getByRole("button", { name: "계약 등록" }));
  act(() => screen.getByLabelText("연락처").focus());
  expect(ref.current).toHaveStyle({ position: "static" });

  viewport.change("resize", 500, 0);
  viewport.change("scroll", 500, 100);
  expect(ref.current).toHaveStyle({ position: "static" });
  expect(ref.current?.style.bottom).toBe("");
  expect(screen.getByRole("button", { name: "반려" })).toBeEnabled();

  act(() => screen.getByLabelText("이름").focus());
  expect(ref.current).toHaveStyle({ position: "static" });
  act(() => screen.getByRole("button", { name: "입력 종료" }).focus());
  expect(ref.current?.style.position).toBe("");
  viewport.change("resize", 900, 0);
  expect(ref.current?.style.bottom).toBe("");
});

test("모바일 입력 중 데스크톱으로 바꾸면 sticky를 유지하고 돌아오면 현재 포커스를 따른다", () => {
  const buttons = <><Button>계약 등록</Button><Button>반려</Button></>;
  const { ref, rerender } = renderActions(buttons);
  const input = screen.getByLabelText("연락처");
  act(() => input.focus());
  expect(ref.current).toHaveStyle({ position: "static" });

  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: true });
  const content = <><input aria-label="연락처" /><ContractDocumentActions ref={ref}>{buttons}</ContractDocumentActions></>;
  rerender(content);
  expect(ref.current?.style.position).toBe("");

  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: false });
  rerender(content);
  expect(ref.current).toHaveStyle({ position: "static" });
  expect(screen.getByRole("button", { name: "반려" })).toBeEnabled();
});

test.each(["text", "tel", "number", "email", "search", "password", "url"])("%s 입력 중에는 모바일 액션을 고정하지 않는다", (type) => {
  const { ref } = renderActions(undefined, <input type={type} aria-label="입력" />);
  act(() => screen.getByLabelText("입력").focus());
  expect(ref.current).toHaveStyle({ position: "static" });
  act(() => screen.getByLabelText("입력").blur());
  expect(ref.current?.style.position).toBe("");
});

test("textarea와 편집 가능한 영역은 입력으로 취급하고 readonly와 선택 컨트롤은 고정 상태를 유지한다", () => {
  const { ref } = renderActions(undefined, <>
    <textarea aria-label="메모" />
    <div contentEditable tabIndex={0} aria-label="내용" />
    <input readOnly aria-label="읽기 전용" />
    <input type="checkbox" aria-label="선택" />
    <select aria-label="목록"><option>선택 항목</option></select>
  </>);
  for (const label of ["메모", "내용"]) {
    act(() => screen.getByLabelText(label).focus());
    expect(ref.current).toHaveStyle({ position: "static" });
  }
  for (const label of ["읽기 전용", "선택", "목록"]) {
    act(() => screen.getByLabelText(label).focus());
    expect(ref.current?.style.position).toBe("");
  }
});

test.each([true, false])("입력 직후 등록 버튼 클릭 도중 위치를 바꾸지 않고 제출한다 (버튼 포커스 %s)", (focusButton) => {
  const onSubmit = jest.fn((event) => event.preventDefault());
  const ref = createRef<HTMLDivElement>();
  render(<form onSubmit={onSubmit}><input aria-label="연락처" /><ContractDocumentActions ref={ref}>
    <button type="submit">계약 등록</button>
  </ContractDocumentActions></form>);
  const input = screen.getByLabelText("연락처");
  const submit = screen.getByRole("button", { name: "계약 등록" });
  act(() => input.focus());
  fireEvent.pointerDown(submit);
  act(() => { if (focusButton) submit.focus(); else input.blur(); });
  expect(ref.current).toHaveStyle({ position: "static" });
  fireEvent.pointerUp(submit);
  expect(ref.current).toHaveStyle({ position: "static" });
  fireEvent.click(submit);
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test("취소한 액션 터치가 이후 입력 포커스 처리를 잠그지 않는다", () => {
  const { ref } = renderActions();
  act(() => screen.getByLabelText("연락처").focus());
  fireEvent.pointerDown(screen.getByRole("button", { name: "반려" }));
  fireEvent.pointerCancel(document);
  act(() => screen.getByRole("button", { name: "입력 종료" }).focus());
  expect(ref.current?.style.position).toBe("");
  act(() => screen.getByLabelText("이름").focus());
  expect(ref.current).toHaveStyle({ position: "static" });
});

test("visualViewport가 없는 모바일 환경에서도 입력 중 고정을 풀고 액션 버튼을 사용할 수 있다", () => {
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
  const onReject = jest.fn();
  const { ref } = renderActions(<Button onClick={onReject}>반려</Button>);

  act(() => screen.getByLabelText("연락처").focus());
  expect(ref.current).toHaveStyle({ position: "static" });
  fireEvent.click(screen.getByRole("button", { name: "반려" }));
  expect(onReject).toHaveBeenCalledTimes(1);
});
