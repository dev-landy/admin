import "@/test-utils/antd";
import { createRef, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button, Grid } from "antd";
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

function renderActions(children: ReactNode = <><Button>계약 등록</Button><Button>반려</Button></>) {
  const ref = createRef<HTMLDivElement>();
  return { ref, ...render(<ContractDocumentActions ref={ref}>{children}</ContractDocumentActions>) };
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

test("모바일에서 키보드 높이와 화면 이동에 맞춰 액션을 올리고 키보드가 닫히면 되돌린다", () => {
  const { ref } = renderActions();
  expect(ref.current).toHaveStyle({ bottom: "0px" });
  expect(ref.current).toContainElement(screen.getByRole("button", { name: "계약 등록" }));

  viewport.change("resize", 500, 0);
  expect(ref.current).toHaveStyle({ bottom: "400px" });

  viewport.change("scroll", 500, 100);
  expect(ref.current).toHaveStyle({ bottom: "300px" });
  expect(screen.getByRole("button", { name: "반려" })).toBeEnabled();

  viewport.change("resize", 900, 0);
  expect(ref.current).toHaveStyle({ bottom: "0px" });

  // 화면 이동이 남아 있는 복귀 순간에도 액션이 화면 아래로 내려가지 않는다.
  viewport.change("scroll", 900, 30);
  expect(ref.current).toHaveStyle({ bottom: "0px" });
});

test("모바일에서 데스크톱으로 바꾸면 기존 보정을 지우고 돌아오면 현재 뷰포트에 맞춘다", () => {
  viewport.height = 520;
  viewport.offsetTop = 80;
  const buttons = <><Button>계약 등록</Button><Button>반려</Button></>;
  const { ref, rerender } = renderActions(buttons);
  expect(ref.current).toHaveStyle({ bottom: "300px" });

  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: true });
  rerender(<ContractDocumentActions ref={ref}>{buttons}</ContractDocumentActions>);
  expect(ref.current?.style.bottom).toBe("");
  viewport.change("resize", 800, 50);
  expect(ref.current?.style.bottom).toBe("");

  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: false });
  rerender(<ContractDocumentActions ref={ref}>{buttons}</ContractDocumentActions>);
  expect(ref.current).toHaveStyle({ bottom: "50px" });
  expect(screen.getByRole("button", { name: "반려" })).toBeEnabled();
});

test("visualViewport가 없는 모바일 환경에서도 액션 버튼을 사용할 수 있다", () => {
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
  const onReject = jest.fn();
  const { ref } = renderActions(<Button onClick={onReject}>반려</Button>);

  expect(ref.current).toHaveStyle({ bottom: "0px" });
  fireEvent.click(screen.getByRole("button", { name: "반려" }));
  expect(onReject).toHaveBeenCalledTimes(1);
});
