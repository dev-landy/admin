import "@/test-utils/antd";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Grid } from "antd";
import { ContractDocumentSourceImage } from "@/features/contract-ocr/components/ContractDocumentSourceImage";

const file = { fileId: "local-original", fileIndex: 0, contentType: "image/png", url: "https://example.test/original.png", expiresAt: "2026-10-06T00:00:00" };

beforeEach(() => {
  jest.spyOn(Grid, "useBreakpoint").mockReturnValue({ xl: true });
});

afterEach(() => jest.restoreAllMocks());

function gesture(target: Element, type: string, scale = 1) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "scale", { value: scale });
  fireEvent(target, event);
  return event;
}

test("원본을 패널 안에서 확대·축소하고 한계를 잠그며 기본 크기로 되돌린다", () => {
  render(<ContractDocumentSourceImage file={{ fileId: "local-original", fileIndex: 0, contentType: "image/png", url: "https://example.test/original.png", expiresAt: "2026-10-06T00:00:00" }} isRefreshing={false} onRefresh={jest.fn()} />);
  const group = within(screen.getByRole("group", { name: "계약서 1페이지 확대 조절" }));
  const increase = group.getByRole("button", { name: "계약서 1페이지 확대" });
  const decrease = group.getByRole("button", { name: "계약서 1페이지 축소" });
  const reset = group.getByRole("button", { name: "계약서 1페이지 기본 크기" });
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  const canvas = region.firstElementChild;
  expect(region).toHaveAttribute("tabindex", "0");
  expect(canvas).toHaveStyle({ width: "100%" });
  fireEvent.click(increase);
  expect(canvas).toHaveStyle({ width: "125%" });
  expect(group.getByText("125%")).toBeVisible();
  expect(within(region).getByRole("img", { name: "계약서 1페이지" })).toHaveAttribute("src", "https://example.test/original.png");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  for (let index = 0; index < 7; index += 1) fireEvent.click(increase);
  expect(increase).toBeDisabled();
  expect(canvas).toHaveStyle({ width: "250%" });
  for (let index = 0; index < 10; index += 1) fireEvent.click(decrease);
  expect(decrease).toBeDisabled();
  expect(canvas).toHaveStyle({ width: "50%" });
  fireEvent.click(reset);
  expect(canvas).toHaveStyle({ width: "100%" });
  expect(reset).toBeDisabled();
});

test("원본 안의 트랙패드 확대만 가로채고 일반 스크롤과 바깥 영역 확대는 유지한다", () => {
  render(<><ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} /><input aria-label="입력 영역" /></>);
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  const image = within(region).getByRole("img");
  const normalWheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 });
  fireEvent(image, normalWheel);
  expect(normalWheel.defaultPrevented).toBe(false);
  expect(region.firstElementChild).toHaveStyle({ width: "100%" });

  const pinch = new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -50 });
  fireEvent(image, pinch);
  expect(pinch.defaultPrevented).toBe(true);
  expect(Number((region.firstElementChild as HTMLElement).style.width.slice(0, -1))).toBeGreaterThan(100);

  const outside = new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -50 });
  fireEvent(screen.getByRole("textbox"), outside);
  expect(outside.defaultPrevented).toBe(false);
});

test("핀치 확대 한계에서도 페이지 확대를 막고 버튼과 같은 범위를 쓴다", () => {
  render(<ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} />);
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  fireEvent.wheel(region, { ctrlKey: true, deltaY: -1000, cancelable: true });
  expect(region.firstElementChild).toHaveStyle({ width: "250%" });
  const pinch = new WheelEvent("wheel", { ctrlKey: true, deltaY: -100, cancelable: true });
  fireEvent(region, pinch);
  expect(pinch.defaultPrevented).toBe(true);
  expect(region.firstElementChild).toHaveStyle({ width: "250%" });
  fireEvent.wheel(region, { ctrlKey: true, deltaY: 1000, cancelable: true });
  expect(region.firstElementChild).toHaveStyle({ width: "50%" });
  fireEvent.click(screen.getByRole("button", { name: "계약서 1페이지 기본 크기" }));
  expect(region.firstElementChild).toHaveStyle({ width: "100%" });
});

test("Safari 제스처는 시작 시점의 배율을 기준으로 적용하고 중복 wheel을 무시한다", () => {
  render(<ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} />);
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  expect(gesture(region, "gesturestart").defaultPrevented).toBe(true);
  expect(gesture(region, "gesturechange", 1.5).defaultPrevented).toBe(true);
  expect(region.firstElementChild).toHaveStyle({ width: "150%" });
  fireEvent.wheel(region, { ctrlKey: true, deltaY: -100, cancelable: true });
  expect(region.firstElementChild).toHaveStyle({ width: "150%" });
  gesture(region, "gesturechange", 2);
  expect(region.firstElementChild).toHaveStyle({ width: "200%" });
  expect(gesture(region, "gestureend", 2).defaultPrevented).toBe(true);
  gesture(region, "gesturestart");
  gesture(region, "gesturechange", 0.5);
  expect(region.firstElementChild).toHaveStyle({ width: "100%" });
});

test("좁은 화면은 확대 도구 없이 Safari 핀치로 원본만 확대·축소하고 일반 스크롤을 유지한다", () => {
  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: false });
  render(<ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} />);
  expect(screen.queryByRole("group", { name: "계약서 1페이지 확대 조절" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("계약서 1페이지 확대 비율")).not.toBeInTheDocument();
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  expect(within(region).getByRole("img")).toBeInTheDocument();
  gesture(region, "gesturestart");
  gesture(region, "gesturechange", 1.5);
  gesture(region, "gestureend");
  expect(region.firstElementChild).toHaveStyle({ width: "150%" });
  gesture(region, "gesturestart");
  gesture(region, "gesturechange", 0.5);
  gesture(region, "gestureend");
  expect(region.firstElementChild).toHaveStyle({ width: "75%" });
  const scroll = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 });
  fireEvent(region, scroll);
  expect(scroll.defaultPrevented).toBe(false);
  expect(region.firstElementChild).toHaveStyle({ width: "75%" });
});

test("화면 폭이 바뀌어 확대 도구가 나타나거나 사라져도 현재 원본 배율을 보존한다", () => {
  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: false });
  const view = render(<ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} />);
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  gesture(region, "gesturestart");
  gesture(region, "gesturechange", 2);
  gesture(region, "gestureend");
  expect(region.firstElementChild).toHaveStyle({ width: "200%" });

  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: true });
  view.rerender(<ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} />);
  expect(screen.getByLabelText("계약서 1페이지 확대 비율")).toHaveTextContent("200%");
  expect(screen.getByRole("button", { name: "계약서 1페이지 기본 크기" })).toBeEnabled();

  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: false });
  view.rerender(<ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} />);
  expect(screen.queryByRole("group", { name: "계약서 1페이지 확대 조절" })).not.toBeInTheDocument();
  expect(region.firstElementChild).toHaveStyle({ width: "200%" });
});

test("좁은 화면에서 키보드로 배율을 조절하되 브라우저 확대 단축키는 가로채지 않는다", () => {
  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: false });
  render(<ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} />);
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  region.focus();
  expect(region).toHaveFocus();
  expect(region).toHaveAccessibleDescription("핀치로 확대·축소하거나 +, -, 0 키를 사용할 수 있습니다.");
  fireEvent.keyDown(region, { key: "+" });
  expect(region.firstElementChild).toHaveStyle({ width: "125%" });
  fireEvent.keyDown(region, { key: "-" });
  expect(region.firstElementChild).toHaveStyle({ width: "100%" });
  fireEvent.keyDown(region, { key: "=" });
  expect(region.firstElementChild).toHaveStyle({ width: "125%" });
  fireEvent.keyDown(region, { key: "0" });
  expect(region.firstElementChild).toHaveStyle({ width: "100%" });
  const browserShortcut = new KeyboardEvent("keydown", { key: "+", ctrlKey: true, bubbles: true, cancelable: true });
  fireEvent(region, browserShortcut);
  expect(browserShortcut.defaultPrevented).toBe(false);
  expect(region.firstElementChild).toHaveStyle({ width: "100%" });
});

test("좁은 화면에서 원본이 실패해도 새로고침을 제공하고 이전 핀치 이벤트는 정리한다", () => {
  jest.mocked(Grid.useBreakpoint).mockReturnValue({ xl: false });
  const onRefresh = jest.fn();
  render(<ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={onRefresh} />);
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  fireEvent.error(within(region).getByRole("img"));
  expect(screen.getByText("계약서 1페이지를 표시할 수 없습니다.")).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "계약서 1페이지 확대 조절" })).not.toBeInTheDocument();
  expect(gesture(region, "gesturestart").defaultPrevented).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "계약서 1페이지 원본 새로고침" }));
  expect(onRefresh).toHaveBeenCalledTimes(1);
});

test("핀치 중 커서 아래의 원본 위치를 가로·세로 스크롤에 유지한다", () => {
  render(<div data-testid="scroll-pane" style={{ overflowY: "auto" }}><ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} /></div>);
  const pane = screen.getByTestId("scroll-pane");
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  Object.defineProperties(pane, { scrollHeight: { value: 1000 }, clientHeight: { value: 500 } });
  jest.spyOn(region, "getBoundingClientRect").mockReturnValue({ left: 100, top: 50, width: 400, height: 600, right: 500, bottom: 650, x: 100, y: 50, toJSON() {} });
  region.scrollLeft = 40;
  pane.scrollTop = 100;
  gesture(region, "gesturestart");
  fireEvent.pointerMove(region, { clientX: 300, clientY: 250 });
  // Wheel uses its own cursor coordinates; end the Safari gesture first.
  gesture(region, "gestureend");
  fireEvent.wheel(region, { ctrlKey: true, deltaY: -Math.log(2) * 100, clientX: 300, clientY: 250, cancelable: true });
  expect(region.scrollLeft).toBeCloseTo(280);
  expect(pane.scrollTop).toBeCloseTo(300);
});

test("언마운트되면 원본의 확대 이벤트 처리를 해제한다", () => {
  const { unmount } = render(<ContractDocumentSourceImage file={file} isRefreshing={false} onRefresh={jest.fn()} />);
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  unmount();
  const pinch = new WheelEvent("wheel", { ctrlKey: true, deltaY: -50, cancelable: true });
  fireEvent(region, pinch);
  expect(pinch.defaultPrevented).toBe(false);
  expect(gesture(region, "gesturestart").defaultPrevented).toBe(false);
});
