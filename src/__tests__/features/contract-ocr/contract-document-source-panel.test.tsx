import "@/test-utils/antd";
import { createRef } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ConfigProvider, Grid } from "antd";

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

  constructor(private readonly callback: ResizeObserverCallback) { observers.push(this); }
  notify() { this.callback([], this); }
}

function sourceExample(actionBarRef: ReturnType<typeof createRef<HTMLDivElement>>, onRefresh = jest.fn(), hasError = false) {
  return <ConfigProvider theme={{ token: { motion: false } }}>
    <input aria-label="검수 입력" defaultValue="입력 중인 값" />
    <ContractDocumentSourcePanel actionBarRef={actionBarRef} pageCount={1} onRefresh={onRefresh} hasError={hasError}>
      <p>확인할 계약서 원본</p>
    </ContractDocumentSourcePanel>
    <div ref={actionBarRef} data-testid="actions"><button>계약 등록</button><button>반려</button></div>
  </ConfigProvider>;
}

function setupMeasurements(initialActionRect = new DOMRect(0, 650, 400, 150)) {
  const actionBarRef = createRef<HTMLDivElement>();
  const onRefresh = jest.fn();
  const view = render(sourceExample(actionBarRef, onRefresh));
  let actionRect = initialActionRect;
  jest.spyOn(screen.getByTestId("actions"), "getBoundingClientRect").mockImplementation(() => actionRect);
  fireEvent.scroll(window);
  const trigger = screen.getByRole("button", { name: "계약서 원본 펼치기" });
  const panel = screen.getByRole("region", { name: "계약서 원본 영역" });
  return { ...view, trigger, panel, actionBarRef, onRefresh, setActionRect: (rect: DOMRect) => { actionRect = rect; } };
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
  else Reflect.deleteProperty(window, "innerHeight");
});

test("좁은 화면에서는 원본을 플로팅 버튼으로 열고 별도 Drawer에서 새로고침한다", async () => {
  const { trigger, onRefresh } = setupMeasurements();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).toHaveAttribute("title", "1페이지");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByText("확인할 계약서 원본")).not.toBeVisible();
  fireEvent.click(trigger);
  const drawer = await screen.findByRole("dialog", { name: /계약서 원본/ });
  expect(within(drawer).getByText("확인할 계약서 원본")).toBeVisible();
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(within(drawer).getByRole("button", { name: "원본 새로고침" }));
  expect(onRefresh).toHaveBeenCalledTimes(1);
});

test("등록 영역이 화면 밖에 있어도 같은 높이를 예약하고 영역이 없어지면 하단으로 돌아온다", async () => {
  const view = setupMeasurements();
  await waitFor(() => expect(view.panel.style.bottom).toContain("162px"));
  const observer = observers.find((candidate) => candidate.targets.has(view.actionBarRef.current!));
  expect(observer).toBeDefined();
  view.setActionRect(new DOMRect(0, 700, 400, 100));
  act(() => observer!.notify());
  expect(view.panel.style.bottom).toContain("112px");

  for (const top of [850, -70]) {
    view.setActionRect(new DOMRect(0, top, 400, 100));
    fireEvent.scroll(window);
    await waitFor(() => expect(view.panel.style.bottom).toContain("112px"));
  }
  view.setActionRect(new DOMRect(0, 650, 400, 0));
  act(() => observer!.notify());
  expect(view.panel.style.bottom).toContain("16px");
});

test("키보드가 visual viewport를 줄이거나 이동해도 그 높이만큼 FAB를 올리지 않는다", async () => {
  const view = setupMeasurements();
  await waitFor(() => expect(view.panel.style.bottom).toContain("162px"));
  viewport.height = 400;
  viewport.offsetTop = 100;
  act(() => viewport.dispatchEvent(new Event("resize")));
  act(() => viewport.dispatchEvent(new Event("scroll")));
  expect(view.panel.style.bottom).toContain("162px");
});

test("원본을 여닫을 때 같은 하단 위치와 왼쪽 여백을 유지하고 등록 영역 변화로 복귀 버튼을 내리지 않는다", async () => {
  const view = setupMeasurements();
  await waitFor(() => expect(view.panel.style.bottom).toContain("162px"));
  const originalBottom = view.panel.style.bottom;
  const originalLeft = view.panel.style.left;
  expect(originalLeft).toContain("24px");
  jest.spyOn(view.trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(24, 590, 140, 48));
  fireEvent.click(view.trigger);
  const drawer = await screen.findByRole("dialog", { name: /계약서 원본/ });
  const returnButton = within(drawer).getByRole("button", { name: "입력으로 돌아가기" });
  expect(returnButton.style.bottom).toBe(originalBottom);
  expect(returnButton.style.left).toBe(originalLeft);
  expect(returnButton).toHaveStyle({ height: "48px" });
  expect(drawer.querySelector(".ant-drawer-body")?.getAttribute("style")).toContain("162px");

  view.setActionRect(new DOMRect(0, 900, 400, 0));
  fireEvent.scroll(window);
  fireEvent.resize(window);
  fireEvent.focusIn(returnButton);
  expect(returnButton.style.bottom).toBe(originalBottom);
  view.setActionRect(new DOMRect(0, 650, 400, 150));
  fireEvent.click(returnButton);
  await waitFor(() => expect(view.trigger).toHaveFocus());
  expect(view.panel.style.bottom).toBe(originalBottom);
  expect(view.panel.style.left).toBe(originalLeft);
});

test("입력란에서 FAB를 누르는 중 등록 영역이 움직여도 클릭을 유지한다", async () => {
  const view = setupMeasurements(new DOMRect(0, 900, 400, 100));
  await waitFor(() => expect(view.panel.style.bottom).toContain("112px"));
  await waitFor(() => expect(observers.some((candidate) => candidate.targets.has(view.actionBarRef.current!))).toBe(true));
  act(() => screen.getByLabelText("검수 입력").focus());
  fireEvent.pointerDown(view.trigger);
  view.setActionRect(new DOMRect(0, 650, 400, 150));
  const observer = observers.find((candidate) => candidate.targets.has(view.actionBarRef.current!));
  act(() => observer!.notify());
  expect(view.panel.style.bottom).toContain("112px");
  fireEvent.pointerUp(view.trigger);
  expect(view.panel.style.bottom).toContain("112px");
  fireEvent.click(view.trigger);
  expect(await screen.findByRole("dialog", { name: /계약서 원본/ })).toBeVisible();
});

test("닫기와 Escape 후 입력값을 유지하고 FAB에 스크롤 이동 없이 포커스를 돌려준다", async () => {
  const { trigger } = setupMeasurements();
  fireEvent.change(screen.getByLabelText("검수 입력"), { target: { value: "보존할 값" } });
  fireEvent.click(trigger);
  let drawer = await screen.findByRole("dialog", { name: /계약서 원본/ });
  const focus = jest.spyOn(trigger, "focus");
  fireEvent.click(within(drawer).getByRole("button", { name: "계약서 원본 닫기" }));
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(screen.getByLabelText("검수 입력")).toHaveValue("보존할 값");
  fireEvent.click(trigger);
  drawer = await screen.findByRole("dialog", { name: /계약서 원본/ });
  fireEvent.keyDown(drawer, { key: "Escape", code: "Escape", keyCode: 27 });
  await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  expect(screen.getByLabelText("검수 입력")).toHaveValue("보존할 값");
});

test("하단 입력 복귀 버튼은 입력값을 보존하며 닫고 원본 FAB로 포커스를 돌려준다", async () => {
  const { trigger } = setupMeasurements();
  fireEvent.change(screen.getByLabelText("검수 입력"), { target: { value: "다시 이어서 입력할 값" } });
  fireEvent.click(trigger);
  const drawer = await screen.findByRole("dialog", { name: /계약서 원본/ });
  const returnButton = within(drawer).getByRole("button", { name: "입력으로 돌아가기" });
  expect(returnButton).toHaveStyle({ position: "absolute" });
  const focus = jest.spyOn(trigger, "focus");
  fireEvent.click(returnButton);
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(focus).toHaveBeenCalledTimes(1);
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByLabelText("검수 입력")).toHaveValue("다시 이어서 입력할 값");
});

test("desktop에서는 원본을 항상 보이고 좁은 화면으로 돌아오면 Drawer를 다시 열지 않는다", async () => {
  const view = setupMeasurements();
  await waitFor(() => expect(observers.some((candidate) => candidate.targets.has(view.actionBarRef.current!))).toBe(true));
  const observer = observers.find((candidate) => candidate.targets.has(view.actionBarRef.current!));
  fireEvent.click(view.trigger);
  await screen.findByRole("dialog", { name: /계약서 원본/ });
  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: true });
  view.rerender(sourceExample(view.actionBarRef, view.onRefresh));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("확인할 계약서 원본")).toBeVisible();
  expect(screen.queryByRole("button", { name: "계약서 원본 펼치기" })).not.toBeInTheDocument();
  expect(observer!.disconnect).toHaveBeenCalledTimes(1);
  expect(document.body).toContainElement(document.activeElement as HTMLElement);
  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: false });
  view.rerender(sourceExample(view.actionBarRef, view.onRefresh));
  expect(screen.getByRole("button", { name: "계약서 원본 펼치기" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("조회 오류와 로딩 상태를 보존하며 원본 Drawer에서 복구할 수 있다", async () => {
  const ref = createRef<HTMLDivElement>();
  const onRefresh = jest.fn();
  render(sourceExample(ref, onRefresh, true));
  const trigger = screen.getByRole("button", { name: "계약서 원본 펼치기" });
  expect(trigger).toHaveAttribute("title", "원본 조회 실패");
  fireEvent.click(trigger);
  const drawer = await screen.findByRole("dialog", { name: /계약서 원본/ });
  expect(within(drawer).getByText("원본 조회 실패")).toBeInTheDocument();
  fireEvent.click(within(drawer).getByRole("button", { name: "원본 새로고침" }));
  expect(onRefresh).toHaveBeenCalledTimes(1);
});
