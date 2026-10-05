import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { App, ConfigProvider, Input, Modal, theme } from "antd";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { ThemeSelector } from "@/components/ThemeSelector";
import { createAdminTheme } from "@/components/ThemeTokens";
import { SYSTEM_THEME_QUERY, THEME_BOOTSTRAP_SCRIPT, THEME_PALETTES, THEME_STORAGE_KEY } from "@/config/theme";

let osDark = false;
let systemListeners: Set<(event: MediaQueryListEvent) => void>;
let media: MediaQueryList;
const originalMatchMedia = window.matchMedia.bind(window);
const originalTransition = Object.getOwnPropertyDescriptor(document, "startViewTransition");

beforeEach(() => {
  localStorage.clear(); osDark = false; systemListeners = new Set();
  media = originalMatchMedia(SYSTEM_THEME_QUERY);
  Object.defineProperty(media, "matches", { configurable: true, get: () => osDark });
  media.addEventListener = jest.fn((_type, listener) => { if (typeof listener === "function") systemListeners.add(listener as (event: MediaQueryListEvent) => void); });
  media.removeEventListener = jest.fn((_type, listener) => { if (typeof listener === "function") systemListeners.delete(listener as (event: MediaQueryListEvent) => void); });
  jest.spyOn(window, "matchMedia").mockImplementation((query) => query === SYSTEM_THEME_QUERY ? media : originalMatchMedia(query));
});
afterEach(() => {
  jest.restoreAllMocks(); localStorage.clear();
  delete document.documentElement.dataset.theme; delete document.documentElement.dataset.themeMode;
  document.documentElement.style.removeProperty("color-scheme");
  document.documentElement.style.removeProperty("--admin-theme-transition-duration");
  if (originalTransition) Object.defineProperty(document, "startViewTransition", originalTransition);
  else delete (document as Partial<Document>).startViewTransition;
});
function systemTheme(dark: boolean) {
  osDark = dark;
  const event = new Event("change") as MediaQueryListEvent;
  Object.defineProperty(event, "matches", { value: dark });
  for (const listener of systemListeners) listener(event);
}
function ThemeWorkspace({ portal = false }: { portal?: boolean }) {
  const { resolved } = useTheme();
  const configuration = createAdminTheme(resolved);
  return <ConfigProvider theme={{ ...configuration, token: { ...configuration.token, motion: false } }}><App>
    <ThemeSelector /><Input aria-label="미제출 검색어" defaultValue="초안" />
    <span>{resolved === "dark" ? "다크 적용" : "라이트 적용"}</span>
    {portal && <Modal open title="테마 확인" footer={null}>
      <span>{resolved === "dark" ? "다크 대화상자" : "라이트 대화상자"}</span><Input aria-label="대화상자 초안" defaultValue="저장 전" />
    </Modal>}
  </App></ConfigProvider>;
}

async function selectTheme(mode: "system" | "light" | "dark") {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^화면 테마:/ })); });
  await act(async () => { fireEvent.click(screen.getByRole("menuitemradio", { name: ({ system: "시스템", light: "라이트", dark: "다크" })[mode] })); });
}

test("세 가지 테마 선택을 저장·복원하며 명시한 모드는 OS 변경과 미제출 입력을 보존한다", async () => {
  const view = render(<ThemeProvider><ThemeWorkspace /></ThemeProvider>);
  fireEvent.change(screen.getByLabelText("미제출 검색어"), { target: { value: "아직 조회하지 않은 이름" } });
  await selectTheme("dark");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  await selectTheme("light");
  act(() => systemTheme(true));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(screen.getByLabelText("미제출 검색어")).toHaveValue("아직 조회하지 않은 이름");
  await selectTheme("system");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
  expect(document.documentElement.dataset.theme).toBe("dark");
  view.unmount();
  render(<ThemeProvider><ThemeWorkspace /></ThemeProvider>);
  expect(screen.getByRole("button", { name: "화면 테마: 시스템" })).toBeVisible();
  expect(screen.getByText("다크 적용")).toBeInTheDocument();
});

test("시스템 테마와 다른 탭의 저장 선택은 열린 포털·초안을 유지하며 언마운트시 리스너를 해제한다", () => {
  const view = render(<ThemeProvider><ThemeWorkspace portal /></ThemeProvider>);
  fireEvent.change(screen.getByLabelText("대화상자 초안"), { target: { value: "수정 중인 내용" } });
  act(() => systemTheme(true));
  expect(screen.getByText("다크 대화상자")).toBeInTheDocument();
  expect(screen.getByLabelText("대화상자 초안")).toHaveValue("수정 중인 내용");
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "light" })));
  expect(screen.getByText("라이트 대화상자")).toBeInTheDocument();
  expect(document.documentElement.style.colorScheme).toBe("light");
  view.unmount();
  expect(systemListeners.size).toBe(0);
  expect(media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" })));
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("저장소가 차단되어도 시스템 초기값과 세션에서 선택한 테마가 동작한다", async () => {
  osDark = true;
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  render(<ThemeProvider><ThemeWorkspace /></ThemeProvider>);
  expect(document.documentElement.dataset.theme).toBe("dark");
  await selectTheme("light");
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("초기 스크립트가 저장된 다크 선택을 먼저 적용하고 같은 SSR 마크업을 경고 없이 하이드레이션한다", async () => {
  const startTransition = jest.fn();
  Object.defineProperty(document, "startViewTransition", { configurable: true, value: startTransition });
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
  const html = renderToString(<ThemeProvider><ThemeSelector /></ThemeProvider>);
  expect(html).toContain('aria-label="화면 테마: 시스템"');
  new Function(THEME_BOOTSTRAP_SCRIPT)();
  expect(document.documentElement.dataset.theme).toBe("dark");
  const container = document.createElement("div"); container.innerHTML = html; document.body.append(container);
  const recover = jest.fn();
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => { root = hydrateRoot(container, <ThemeProvider><ThemeSelector /></ThemeProvider>, { onRecoverableError: recover }); });
  expect(container.querySelector("button")).toHaveAccessibleName("화면 테마: 다크");
  expect(recover).not.toHaveBeenCalled();
  expect(startTransition).not.toHaveBeenCalled();
  await act(async () => root.unmount()); container.remove();
});

test("OS 변경의 root snapshot 안에서 포털과 문서 테마를 함께 바꾸고 입력·포커스·스크롤을 보존한다", async () => {
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  const transition = { ready: Promise.resolve(), updateCallbackDone: Promise.resolve(), finished, skipTransition: jest.fn(), types: new Set<string>() } satisfies ViewTransition;
  const startTransition = jest.fn((callback: () => void) => {
    expect(document.documentElement.dataset.theme).toBe("light");
    callback();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByText("다크 대화상자")).toBeInTheDocument();
    return transition;
  });
  Object.defineProperty(document, "startViewTransition", { configurable: true, value: startTransition });
  render(<ThemeProvider><ThemeWorkspace portal /></ThemeProvider>);
  const input = screen.getByLabelText("대화상자 초안");
  fireEvent.change(input, { target: { value: "아직 저장하지 않은 값" } });
  act(() => input.focus()); document.documentElement.scrollTop = 120;
  act(() => systemTheme(true));
  expect(startTransition).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("대화상자 초안")).toBe(input);
  expect(input).toHaveValue("아직 저장하지 않은 값");
  expect(input).toHaveFocus(); expect(document.documentElement.scrollTop).toBe(120);
  expect(document.documentElement.dataset.adminThemeTransition).toBe("snapshot");
  await act(async () => finish());
  expect(document.documentElement.dataset.adminThemeTransition).toBeUndefined();
  document.documentElement.scrollTop = 0;
});

test("저장소·OS·빠른 직접 선택이 겹쳐도 가장 마지막 모드와 팔레트가 적용된다", async () => {
  const callbacks: (() => void)[] = [];
  Object.defineProperty(document, "startViewTransition", { configurable: true, value: jest.fn((callback: () => void) => {
    callbacks.push(callback);
    return { ready: new Promise<void>(() => {}), updateCallbackDone: new Promise<void>(() => {}), finished: new Promise<void>(() => {}), skipTransition: jest.fn(), types: new Set<string>() } satisfies ViewTransition;
  }) });
  render(<ThemeProvider><ThemeWorkspace /></ThemeProvider>);
  const selector = screen.getByRole("button", { name: /^화면 테마:/ });
  await selectTheme("dark");
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "system" })));
  act(() => systemTheme(true));
  await selectTheme("light");
  act(() => { for (const callback of callbacks) callback(); });
  expect(selector).toHaveAccessibleName("화면 테마: 라이트");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  expect(screen.getByText("라이트 적용")).toBeInTheDocument();
});

test("팝업은 현재 모드를 선택 표시하고 방향키·Space로 선택한 뒤 Escape로 닫히며 버튼으로 포커스를 복원한다", async () => {
  // rc-menu's keyboard traversal filters items by their rendered box. jsdom has no layout.
  const bounds = HTMLElement.prototype.getBoundingClientRect;
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute("role") === "menuitemradio" ? new DOMRect(0, 0, 164, 40) : bounds.call(this);
  });
  render(<ThemeProvider><ThemeWorkspace /></ThemeProvider>);
  const selector = screen.getByRole("button", { name: "화면 테마: 시스템" });
  expect(selector.querySelector("svg")).toHaveAttribute("data-theme-icon", "system");
  act(() => selector.focus());
  fireEvent.keyDown(selector, { key: "ArrowDown", keyCode: 40, which: 40 });
  expect(selector).toHaveAttribute("aria-expanded", "true");
  const system = screen.getByRole("menuitemradio", { name: "시스템" });
  const light = screen.getByRole("menuitemradio", { name: "라이트" });
  expect(system).toHaveAttribute("aria-checked", "true");
  expect(light).toHaveAttribute("aria-checked", "false");
  await waitFor(() => expect(system).toHaveFocus());
  fireEvent.keyDown(system, { key: "ArrowDown", keyCode: 40, which: 40 });
  await waitFor(() => expect(light).toHaveFocus());
  fireEvent.keyDown(light, { key: " ", keyCode: 32, which: 32 });
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  expect(selector).toHaveAccessibleName("화면 테마: 라이트");
  expect(selector.querySelector("svg")).toHaveAttribute("data-theme-icon", "light");
  expect(selector).toHaveAttribute("aria-expanded", "false");
  expect(selector).toHaveFocus();
  fireEvent.click(selector);
  expect(screen.getByRole("menuitemradio", { name: "라이트" })).toHaveAttribute("aria-checked", "true");
  fireEvent.keyDown(screen.getByRole("menuitemradio", { name: "라이트" }), { key: "Escape", keyCode: 27, which: 27 });
  expect(selector).toHaveAttribute("aria-expanded", "false");
  expect(selector).toHaveFocus();
});

test("팝업 바깥의 검색 입력란을 선택하면 팝업을 닫고 입력란 포커스와 초안을 유지한다", async () => {
  render(<ThemeProvider><ThemeWorkspace /></ThemeProvider>);
  const selector = screen.getByRole("button", { name: "화면 테마: 시스템" });
  await act(async () => { fireEvent.click(selector); });
  const system = screen.getByRole("menuitemradio", { name: "시스템" });
  await waitFor(() => expect(system).toHaveFocus());
  const input = screen.getByRole("textbox", { name: "미제출 검색어" });
  fireEvent.change(input, { target: { value: "입력 중인 검색 조건" } });
  act(() => input.focus());
  fireEvent.mouseDown(input);
  await waitFor(() => expect(selector).toHaveAttribute("aria-expanded", "false"));
  expect(input).toHaveFocus();
  expect(input).toHaveValue("입력 중인 검색 조건");
});

function luminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(first: string, second: string) {
  const [low, high] = [luminance(first), luminance(second)].sort((a, b) => a - b); return (high + 0.05) / (low + 0.05);
}
test.each(["light", "dark"] as const)("%s 실제 테마 토큰의 본문·메타·링크·채운 버튼·상태와 조작 경계 대비를 보장한다", (mode) => {
  const palette = THEME_PALETTES[mode];
  const tokens = theme.getDesignToken(createAdminTheme(mode));
  for (const background of [palette.surface, palette.raised, palette.bg, palette.subtle, palette.hover, palette.tableHeader, palette.sidebar, palette.sidebarHover, palette.infoBg, palette.envProd, palette.envDev, palette.envLocal]) {
    for (const foreground of [tokens.colorText, tokens.colorTextSecondary, tokens.colorTextTertiary, tokens.colorLink]) expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  }
  for (const fill of [tokens.colorPrimary, tokens.colorPrimaryHover, palette.dangerFill, palette.dangerHover]) expect(contrast(palette.onFilled, fill)).toBeGreaterThanOrEqual(4.5);
  for (const [text, background] of [[palette.success, palette.successBg], [palette.danger, palette.dangerBg], [palette.warning, palette.warningBg], [palette.link, palette.infoBg], [palette.orange, palette.orangeBg]]) expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
  for (const background of [palette.surface, palette.raised]) {
    for (const foreground of [palette.borderStrong, palette.focus, palette.primaryBorder, palette.danger]) expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
  }
});

test.each(["light", "dark"] as const)("%s hover·active·포커스와 꺼진 스위치·분류 태그도 충분히 구별된다", (mode) => {
  const configuration = createAdminTheme(mode);
  const tokens = theme.getDesignToken(configuration);
  const palette = THEME_PALETTES[mode];
  const button = configuration.components?.Button;
  // Ant Design's defaults reuse filled-primary colors for outlined hover/active.
  for (const foreground of [button?.defaultHoverColor ?? tokens.colorPrimaryHover, button?.defaultActiveColor ?? tokens.colorPrimaryActive, configuration.components?.Tabs?.itemHoverColor ?? tokens.colorPrimaryHover]) {
    for (const background of [palette.surface, palette.raised]) expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  }
  for (const control of [configuration.components?.Input, configuration.components?.InputNumber, configuration.components?.Select, configuration.components?.DatePicker]) {
    for (const border of [control?.activeBorderColor ?? tokens.colorPrimary, control?.hoverBorderColor ?? tokens.colorPrimaryHover]) {
      for (const background of [palette.surface, palette.raised]) expect(contrast(border, background)).toBeGreaterThanOrEqual(3);
    }
  }
  const offSwitch = configuration.components?.Switch;
  for (const track of [offSwitch?.colorTextQuaternary ?? tokens.colorTextQuaternary, offSwitch?.colorTextTertiary ?? tokens.colorTextTertiary]) {
    expect(contrast(palette.onFilled, track)).toBeGreaterThanOrEqual(4.5);
    for (const background of [palette.surface, palette.raised]) expect(contrast(track, background)).toBeGreaterThanOrEqual(3);
  }
  for (const color of ["purple", "geekblue", "volcano"] as const) {
    // Preset Tag labels use palette step 7 on step 1 in installed Ant Design v6.
    expect(contrast(tokens[`${color}7`], tokens[`${color}1`])).toBeGreaterThanOrEqual(4.5);
  }
});
