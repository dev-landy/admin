import "@/test-utils/antd";
import { createRef } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Grid } from "antd";

import { ContractDocumentSourcePanel } from "@/features/contract-ocr/components/ContractDocumentSourcePanel";

const originalViewport = Object.getOwnPropertyDescriptor(window, "visualViewport");
const originalHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");
const originalResizeObserver = global.ResizeObserver;
const observers: TestResizeObserver[] = [];
let viewport: EventTarget & { height: number; offsetTop: number };

class TestResizeObserver implements ResizeObserver {
  readonly targets = new Set<Element>();
  readonly observe = jest.fn((target: Element) => { this.targets.add(target); });
  readonly unobserve = jest.fn((target: Element) => { this.targets.delete(target); });
  readonly disconnect = jest.fn(() => { this.targets.clear(); });

  constructor(private readonly callback: ResizeObserverCallback) {
    observers.push(this);
  }

  notify() {
    this.callback([], this);
  }
}

function sourceExample(actionBarRef: ReturnType<typeof createRef<HTMLDivElement>>) {
  return <>
    <ContractDocumentSourcePanel actionBarRef={actionBarRef} pageCount={1}>
      <p>확인할 계약서 원본</p>
    </ContractDocumentSourcePanel>
    <div ref={actionBarRef} data-testid="actions"><button>계약 등록</button><button>반려</button></div>
  </>;
}

function setupMeasurements(initialActionRect = new DOMRect(0, 650, 400, 66)) {
  const actionBarRef = createRef<HTMLDivElement>();
  const view = render(sourceExample(actionBarRef));
  let sourceRect = new DOMRect(0, 112, 400, 56);
  let actionRect = initialActionRect;
  jest.spyOn(screen.getByRole("region", { name: "계약서 원본 영역" }), "getBoundingClientRect").mockImplementation(() => sourceRect);
  jest.spyOn(screen.getByTestId("actions"), "getBoundingClientRect").mockImplementation(() => actionRect);
  const body = screen.getByLabelText("계약서 원본 내용").parentElement as HTMLElement;
  return {
    ...view,
    actionBarRef,
    body,
    setSourceRect: (rect: DOMRect) => { sourceRect = rect; },
    setActionRect: (rect: DOMRect) => { actionRect = rect; },
  };
}

beforeEach(() => {
  observers.length = 0;
  global.ResizeObserver = TestResizeObserver;
  jest.spyOn(Grid, "useBreakpoint").mockReturnValue({ xl: false });
  viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0 });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
});

afterEach(() => {
  jest.restoreAllMocks();
  global.ResizeObserver = originalResizeObserver;
  if (originalViewport) Object.defineProperty(window, "visualViewport", originalViewport);
  else Reflect.deleteProperty(window, "visualViewport");
  if (originalHeight) Object.defineProperty(window, "innerHeight", originalHeight);
});

test("좁은 화면에서 펼친 원본은 실제 액션바 상단보다 12px 위까지 보이며 스크롤·액션바 크기 변경을 반영한다", async () => {
  const view = setupMeasurements();
  expect(view.body).toHaveStyle({ display: "none" });
  fireEvent.click(screen.getByRole("button", { name: "계약서 원본 펼치기" }));
  expect(view.body).toHaveStyle({ maxHeight: "470px" }); // 원본 헤더 하단 168 → 액션바 상단 650, 간격 12.
  const observer = observers.find((candidate) => candidate.targets.has(view.actionBarRef.current!));
  expect(observer).toBeDefined();

  view.setActionRect(new DOMRect(0, 620, 400, 96));
  act(() => observer!.notify());
  expect(view.body).toHaveStyle({ maxHeight: "440px" });

  view.setSourceRect(new DOMRect(0, 4, 400, 56));
  view.setActionRect(new DOMRect(0, 716, 400, 84));
  fireEvent.scroll(window);
  expect(view.body).toHaveStyle({ maxHeight: "644px" });
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "계약서 원본 접기" }));
  expect(observer!.disconnect).toHaveBeenCalledTimes(1);
});

test("화면 밖이나 숨겨진 액션바 대신 viewport 끝까지 원본을 표시한다", () => {
  const view = setupMeasurements();
  fireEvent.click(screen.getByRole("button", { name: "계약서 원본 펼치기" }));
  for (const [top, height] of [[850, 66], [-70, 66], [650, 0]]) {
    view.setActionRect(new DOMRect(0, top, 400, height));
    fireEvent.scroll(window);
    expect(view.body).toHaveStyle({ maxHeight: "620px" });
  }
});

test("가상키보드로 보이는 viewport가 줄거나 이동하면 원본도 그 끝을 넘지 않으며 공간이 없으면 높이를 0으로 제한한다", async () => {
  const view = setupMeasurements();
  fireEvent.click(screen.getByRole("button", { name: "계약서 원본 펼치기" }));
  expect(view.body).toHaveStyle({ maxHeight: "470px" });

  viewport.height = 500;
  viewport.offsetTop = 50;
  act(() => viewport.dispatchEvent(new Event("resize")));
  await waitFor(() => expect(view.body).toHaveStyle({ maxHeight: "370px" }));

  viewport.height = 400;
  viewport.offsetTop = 100;
  act(() => viewport.dispatchEvent(new Event("scroll")));
  await waitFor(() => expect(view.body).toHaveStyle({ maxHeight: "320px" }));

  view.setSourceRect(new DOMRect(0, 500, 400, 56));
  fireEvent.scroll(window);
  expect(view.body).toHaveStyle({ maxHeight: 0 });
});

test("desktop 전환 후에는 원본을 항상 표시하고 모바일 overlay의 높이 제한·액션바 측정을 제거한다", async () => {
  const view = setupMeasurements();
  fireEvent.click(screen.getByRole("button", { name: "계약서 원본 펼치기" }));
  expect(view.body).toHaveStyle({ maxHeight: "470px" });
  const observer = observers.find((candidate) => candidate.targets.has(view.actionBarRef.current!));

  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: true });
  view.rerender(sourceExample(view.actionBarRef));
  expect(screen.getByText("확인할 계약서 원본")).toBeVisible();
  expect(screen.queryByRole("button", { name: /계약서 원본 (펼치기|접기)/ })).not.toBeInTheDocument();
  expect(view.body.style.maxHeight).toBe("");
  expect(observer!.disconnect).toHaveBeenCalledTimes(1);

  viewport.height = 300;
  act(() => viewport.dispatchEvent(new Event("resize")));
  fireEvent.scroll(window);
  expect(view.body.style.maxHeight).toBe("");
});
