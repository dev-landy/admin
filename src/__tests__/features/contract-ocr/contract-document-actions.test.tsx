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

test("데스크톱에서는 작은 visualViewport에도 모바일 위치 보정을 적용하지 않는다", () => {
  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: true });
  viewport.height = 500;
  viewport.offsetTop = 100;
  const { ref } = renderActions();
  expect(ref.current?.style.bottom).toBe("");

  viewport.change("resize", 400, 100);
  viewport.change("scroll", 400, 150);
  expect(ref.current?.style.bottom).toBe("");
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled();
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

test("위치 보정 중에도 자식 버튼의 disabled 상태와 폼 제출·반려 동작을 보존한다", () => {
  const onSubmit = jest.fn();
  const onReject = jest.fn();
  const ref = createRef<HTMLDivElement>();
  const form = (isBusy: boolean) => <form onSubmit={(event) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget).get("tenantName"));
  }}>
    <label htmlFor="tenant-name">세입자 이름</label>
    <input id="tenant-name" name="tenantName" defaultValue="검수 중인 이름" />
    <ContractDocumentActions ref={ref}>
      <Button htmlType="submit" disabled={isBusy}>계약 등록</Button>
      <Button htmlType="button" disabled={isBusy} onClick={onReject}>반려</Button>
    </ContractDocumentActions>
  </form>;
  const { rerender } = render(form(true));

  viewport.change("resize", 500, 80);
  expect(ref.current).toHaveStyle({ bottom: "320px" });
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "반려" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  fireEvent.click(screen.getByRole("button", { name: "반려" }));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(onReject).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "수정한 이름" } });
  rerender(form(false));
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "반려" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit).toHaveBeenCalledWith("수정한 이름");
  fireEvent.click(screen.getByRole("button", { name: "반려" }));
  expect(onReject).toHaveBeenCalledTimes(1);
  expect(onSubmit).toHaveBeenCalledTimes(1);

  rerender(form(true));
  viewport.change("resize", 900, 0);
  expect(ref.current).toHaveStyle({ bottom: "0px" });
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "반려" })).toBeDisabled();
});

test("visualViewport가 없는 모바일 환경에서도 액션 버튼을 사용할 수 있다", () => {
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
  const onReject = jest.fn();
  const { ref } = renderActions(<Button onClick={onReject}>반려</Button>);

  expect(ref.current).toHaveStyle({ bottom: "0px" });
  fireEvent.click(screen.getByRole("button", { name: "반려" }));
  expect(onReject).toHaveBeenCalledTimes(1);
});
